import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Let the package use its default version
});

// Raw body is read using request.text() directly in the handler

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Initialize Supabase admin client to bypass RLS
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (userId) {
          const { error } = await supabaseAdmin
            .from('profiles')
            .update({ is_pro: true })
            .eq('id', userId);

          if (error) {
            console.error('Error updating profile in checkout.session.completed:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
          }
          console.log(`Successfully updated profile to Pro for user ${userId}`);

          // --- REFERRAL REWARD LOGIC ---
          try {
            const { data: referral } = await supabaseAdmin
              .from('referrals')
              .select('id, referrer_id')
              .eq('referee_id', userId)
              .eq('status', 'registered')
              .single();

            if (referral) {
              // Update status to subscribed
              await supabaseAdmin
                .from('referrals')
                .update({ status: 'subscribed', completed_at: new Date().toISOString() })
                .eq('id', referral.id);
              
              // Reward the referrer (+60 days to pro_until)
              const { data: referrerProfile } = await supabaseAdmin
                .from('profiles')
                .select('pro_until')
                .eq('id', referral.referrer_id)
                .single();
                
              const currentProUntil = referrerProfile?.pro_until ? new Date(referrerProfile.pro_until).getTime() : Date.now();
              const newProUntil = new Date(Math.max(currentProUntil, Date.now()) + 60 * 24 * 60 * 60 * 1000).toISOString();
              
              await supabaseAdmin
                .from('profiles')
                .update({ pro_until: newProUntil })
                .eq('id', referral.referrer_id);
                
              console.log(`Referral completed! Awarded 60 days to referrer ${referral.referrer_id}`);
            }
          } catch (e) {
            console.error('Failed to process referral reward:', e);
          }
          // --- END REFERRAL REWARD LOGIC ---
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId) {
          const isActive = subscription.status === 'active' || subscription.status === 'trialing';
          const { error } = await supabaseAdmin
            .from('profiles')
            .update({ is_pro: isActive })
            .eq('id', userId);

          if (error) {
            console.error('Error updating profile in customer.subscription.updated:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
          }
          console.log(`Successfully updated profile subscription status (is_pro = ${isActive}) for user ${userId}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId) {
          const { error } = await supabaseAdmin
            .from('profiles')
            .update({ is_pro: false })
            .eq('id', userId);

          if (error) {
            console.error('Error updating profile in customer.subscription.deleted:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
          }
          console.log(`Successfully removed Pro status for user ${userId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
