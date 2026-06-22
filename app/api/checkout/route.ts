import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Let the package use its default version or specify a safe default
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // If not logged in, redirect to login page with query parameter to return to pricing
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', '/pricing');
      return NextResponse.redirect(loginUrl);
    }

    const requestUrl = new URL(request.url);
    const origin = requestUrl.origin;

    let isReferee = false;
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      if (supabaseServiceKey) {
        const { createClient: createAdminClient } = await import('@supabase/supabase-js');
        const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey);
        const { data: referral } = await supabaseAdmin
          .from('referrals')
          .select('id')
          .eq('referee_id', user.id)
          .eq('status', 'registered')
          .single();
        if (referral) isReferee = true;
      }
    } catch (e) {
      console.error('Error checking referral status:', e);
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'OptiMax Pro Tier',
              description: 'Unlimited compressions, hyper-optimization (AVIF/WebM), and lightning-fast processing.',
            },
            unit_amount: 200, // $2.00
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?canceled=true`,
      customer_email: user.email,
      metadata: {
        userId: user.id,
      },
      subscription_data: {
        ...(isReferee ? { trial_period_days: 30 } : {}),
        metadata: {
          userId: user.id,
        },
      },
    });

    if (session.url) {
      return NextResponse.redirect(session.url);
    } else {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
