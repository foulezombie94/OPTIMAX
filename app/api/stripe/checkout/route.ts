import { NextResponse } from 'next/server';
import { stripe } from '@/utils/stripe';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { optimizationId } = await request.json();

    if (!optimizationId) {
      return NextResponse.json({ error: 'optimizationId is required' }, { status: 400 });
    }

    // Get the optimization details
    const { data: optimization, error: optError } = await supabase
      .from('optimizations')
      .select('id, file_name, price')
      .eq('id', optimizationId)
      .single();

    if (optError || !optimization) {
      return NextResponse.json({ error: 'Optimization not found' }, { status: 404 });
    }

    if (!optimization.price || optimization.price <= 0) {
      return NextResponse.json({ error: 'This item is free' }, { status: 400 });
    }

    // Check if user already purchased
    const { data: existingPurchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('optimization_id', optimizationId)
      .single();

    if (existingPurchase) {
      return NextResponse.json({ error: 'You already own this item' }, { status: 400 });
    }

    const priceInCents = Math.round(optimization.price * 100);

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: optimization.file_name,
              description: 'Modèle 3D optimisé sur OptiMax',
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/community?success=true&show=${optimizationId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/community?show=${optimizationId}&canceled=true`,
      metadata: {
        optimizationId: optimization.id,
        userId: user.id,
        amount: optimization.price.toString()
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (err: any) {
    console.error('Stripe Checkout Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
