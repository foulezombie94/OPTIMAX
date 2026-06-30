import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'https://dummy.upstash.io',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'dummy',
});

// Allow 5 requests per 10 seconds per IP
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '10 s'),
  analytics: true,
});

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

    // Rate Limiting by IP or User ID
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
    const identifier = user.id || ip;
    const { success, limit, reset, remaining } = await ratelimit.limit(`ratelimit_checkout_${identifier}`);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { 
          status: 429, 
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString()
          } 
        }
      );
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
