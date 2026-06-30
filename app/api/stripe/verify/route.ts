import { NextResponse } from 'next/server';
import { stripe } from '@/utils/stripe';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const supabaseUserClient = await createClient();
    const { data: { user } } = await supabaseUserClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payment_intent } = await req.json();

    if (!payment_intent) {
      return NextResponse.json({ error: 'Missing payment_intent ID' }, { status: 400 });
    }

    // Retrieve the payment intent directly from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent);

    if (!paymentIntent) {
      return NextResponse.json({ error: 'Payment intent not found' }, { status: 404 });
    }

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment not successful', status: paymentIntent.status }, { status: 400 });
    }

    const userId = paymentIntent.metadata?.userId;
    const optimizationId = paymentIntent.metadata?.optimizationId;
    const amount = paymentIntent.metadata?.amount;

    if (!userId || !optimizationId) {
      return NextResponse.json({ error: 'Missing metadata in payment intent' }, { status: 400 });
    }

    // Ensure the current user is the one who made the purchase
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create a service role supabase client to bypass RLS for inserting into purchases
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if the purchase already exists (maybe the webhook already processed it)
    const { data: existing } = await supabaseAdmin
      .from('purchases')
      .select('id')
      .eq('stripe_session_id', paymentIntent.id)
      .single();

    if (!existing) {
      // Insert purchase record
      const { error } = await supabaseAdmin
        .from('purchases')
        .insert({
          user_id: userId,
          optimization_id: optimizationId,
          amount: parseFloat(amount || '0'),
          stripe_session_id: paymentIntent.id,
        });

      if (error) {
        console.error('Failed to insert purchase record in verification fallback:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, alreadyExists: !!existing });
  } catch (err: any) {
    console.error('Error verifying payment intent:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
