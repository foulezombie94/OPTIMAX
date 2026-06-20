import { Redis } from '@upstash/redis';

// Determine if we are in a build environment or missing credentials
const isMissingCredentials = !process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = isMissingCredentials 
  ? new Redis({ url: 'https://placeholder.upstash.io', token: 'placeholder' }) 
  : Redis.fromEnv();

// Helper for caching with Redis
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 60
): Promise<T> {
  if (isMissingCredentials) {
    return fetcher(); // Fallback if no redis config
  }

  try {
    const cached = await redis.get<T>(key);
    if (cached) {
      return cached;
    }

    const data = await fetcher();
    
    // Fire and forget caching to not block the request
    redis.setex(key, ttlSeconds, data).catch(console.error);
    
    return data;
  } catch (error) {
    console.error(`Redis cache error for key ${key}:`, error);
    return fetcher(); // Fallback to DB on Redis error
  }
}
