import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 120; // max requests per window per client

type RateLimitBucket = {
  count: number;
  expiresAt: number;
};

const rateLimitStore = new Map<string, RateLimitBucket>();

const getClientId = (request: NextRequest) => {
  const userHeader = request.headers.get('x-user-id');
  if (userHeader) return `user:${userHeader}`;

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const [ip] = forwardedFor.split(',');
    if (ip) return `ip:${ip.trim()}`;
  }

  if (request.ip) {
    return `ip:${request.ip}`;
  }

  return 'anonymous';
};

export function middleware(request: NextRequest) {
  const identifier = getClientId(request);
  const now = Date.now();
  const bucket = rateLimitStore.get(identifier);

  if (!bucket || bucket.expiresAt <= now) {
    rateLimitStore.set(identifier, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS.toString());
    response.headers.set('X-RateLimit-Remaining', (RATE_LIMIT_MAX_REQUESTS - 1).toString());
    return response;
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.max(1, Math.ceil((bucket.expiresAt - now) / 1000));
    const response = NextResponse.json(
      { message: 'Too many requests. Please retry later.' },
      { status: 429 }
    );
    response.headers.set('Retry-After', retryAfter.toString());
    response.headers.set('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS.toString());
    response.headers.set('X-RateLimit-Remaining', '0');
    return response;
  }

  bucket.count += 1;
  rateLimitStore.set(identifier, bucket);

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS.toString());
  response.headers.set('X-RateLimit-Remaining', (RATE_LIMIT_MAX_REQUESTS - bucket.count).toString());
  return response;
}

export const config = {
  matcher: ['/api/:path*']
};
