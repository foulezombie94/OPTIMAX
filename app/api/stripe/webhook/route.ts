import { NextResponse } from 'next/server';
import { stripe } from '@/utils/stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing stripe signature or webhook secret' }, { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed.', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    
    const userId = session.metadata?.userId;
    const optimizationId = session.metadata?.optimizationId;
    const amount = session.metadata?.amount;

    if (userId && optimizationId) {
      // Create a service role supabase client to bypass RLS
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Insert purchase record
      const { error } = await supabase
        .from('purchases')
        .insert({
          user_id: userId,
          optimization_id: optimizationId,
          amount: parseFloat(amount || '0'),
          stripe_session_id: session.id,
        });

      if (error) {
        console.error('Failed to insert purchase record:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }
    }
  } else if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as any;
    
    const userId = paymentIntent.metadata?.userId;
    const optimizationId = paymentIntent.metadata?.optimizationId;
    const amount = paymentIntent.metadata?.amount;

    if (userId && optimizationId) {
      // Create a service role supabase client to bypass RLS
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Insert purchase record
      const { error } = await supabase
        .from('purchases')
        .insert({
          user_id: userId,
          optimization_id: optimizationId,
          amount: parseFloat(amount || '0'),
          stripe_session_id: paymentIntent.id,
        });

      if (error) {
        console.error('Failed to insert purchase record:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
