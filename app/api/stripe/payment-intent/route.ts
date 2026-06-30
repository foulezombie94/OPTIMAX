import { NextResponse } from 'next/server';
import { stripe } from '@/utils/stripe';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { optimizationId } = await req.json();

    if (!optimizationId) {
      return NextResponse.json({ error: 'Missing optimizationId' }, { status: 400 });
    }

    // Use Service Role to securely fetch creator's stripe account id bypassing RLS
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Run queries in parallel to optimize DB load and response time
    const [optimizationResult, existingPurchaseResult] = await Promise.all([
      supabaseAdmin
        .from('optimizations')
        .select(`
          price,
          user_id,
          profiles ( stripe_account_id )
        `)
        .eq('id', optimizationId)
        .single(),
      supabase
        .from('purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('optimization_id', optimizationId)
        .maybeSingle()
    ]);

    const { data: optimization, error } = optimizationResult;
    const { data: existingPurchase } = existingPurchaseResult;

    if (error || !optimization) {
      return NextResponse.json({ error: 'Optimization not found' }, { status: 404 });
    }

    if (optimization.user_id === user.id) {
      return NextResponse.json({ error: 'You cannot buy your own model' }, { status: 400 });
    }

    if (!optimization.price || optimization.price <= 0) {
      return NextResponse.json({ error: 'This model is free' }, { status: 400 });
    }

    if (existingPurchase) {
      return NextResponse.json({ error: 'You already own this model' }, { status: 400 });
    }

    // Safely extract the stripe account id from the joined profile
    // Note: Supabase joins to a one-to-one relationship as either an object or an array of objects
    const profileData = Array.isArray(optimization.profiles) ? optimization.profiles[0] : optimization.profiles;
    const creatorStripeId = profileData?.stripe_account_id;
    const amountInCents = Math.round(optimization.price * 100);
    const platformFeeInCents = Math.round(amountInCents * 0.20); // 20% fee

    const paymentIntentParams: any = {
      amount: amountInCents,
      currency: 'eur',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: user.id,
        optimizationId: optimizationId,
        amount: optimization.price.toString(),
      },
    };

    // If creator is connected, split the payment
    if (creatorStripeId) {
      paymentIntentParams.transfer_data = {
        destination: creatorStripeId,
      };
      paymentIntentParams.application_fee_amount = platformFeeInCents;
    }

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err: any) {
    console.error('Error creating payment intent:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
