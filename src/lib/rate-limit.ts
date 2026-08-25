import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Upstash Redis client
let ratelimitInstance: Ratelimit | null = null;

function getRateLimiter() {
  if (ratelimitInstance) return ratelimitInstance;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("⚠️ Upstash Redis credentials not configured. Rate limiting using fallback in-memory cache.");
    return null;
  }

  try {
    const redis = new Redis({
      url,
      token,
    });

    ratelimitInstance = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      analytics: true,
      prefix: "@otium/ratelimit",
    });

    return ratelimitInstance;
  } catch (error) {
    console.error("Failed to initialize Upstash Redis ratelimiter:", error);
    return null;
  }
}

// In-memory fallback bucket for resilience
const memoryStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Enforce strict 5 requests per minute rate limit across Server Actions
 * @param identifier Unique identifier (e.g., user IP or user ID)
 * @returns Object with success boolean and remaining count
 */
export async function checkRateLimit(identifier: string = "anonymous-client") {
  const limiter = getRateLimiter();

  if (limiter) {
    try {
      const result = await limiter.limit(identifier);
      if (!result.success) {
        return {
          success: false,
          remaining: result.remaining,
          reset: result.reset,
          error: "Rate limit exceeded. You can only perform 5 actions per minute. Please try again shortly.",
        };
      }
      return { success: true, remaining: result.remaining, reset: result.reset };
    } catch (err) {
      console.warn("Upstash redis check error, using in-memory guard:", err);
    }
  }

  // Fallback in-memory rate limiter (5 req / 60 sec)
  const now = Date.now();
  const windowMs = 60 * 1000;
  const entry = memoryStore.get(identifier);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: 4, reset: now + windowMs };
  }

  if (entry.count >= 5) {
    const waitSec = Math.ceil((entry.resetAt - now) / 1000);
    return {
      success: false,
      remaining: 0,
      reset: entry.resetAt,
      error: `Rate limit exceeded. Maximum 5 requests per minute. Try again in ${waitSec}s.`,
    };
  }

  entry.count += 1;
  return { success: true, remaining: 5 - entry.count, reset: entry.resetAt };
}
