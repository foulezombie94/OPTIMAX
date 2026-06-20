import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Only create ratelimiter if we have redis credentials
const isMissingCredentials = !process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN;

// Create a new ratelimiter, that allows 30 requests per 10 seconds
const ratelimit = isMissingCredentials 
  ? null 
  : new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(30, '10 s'),
      analytics: true,
    });

export async function proxy(request: NextRequest) {
  // Apply rate limiting to API routes
  if (request.nextUrl.pathname.startsWith('/api/') && ratelimit) {
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
    const { success, pending, limit, reset, remaining } = await ratelimit.limit(
      `ratelimit_middleware_${ip}`
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Too Many Requests', message: 'Rate limit exceeded.' },
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
  }

  // Update supabase session
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
