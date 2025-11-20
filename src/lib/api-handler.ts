import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export class ApiError extends Error {
  public readonly status: number;
  public readonly details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export type RouteHandler<TParams = Record<string, string>> = (
  request: NextRequest,
  context: { params: TParams }
) => Promise<NextResponse> | NextResponse;

export function apiHandler<TParams = Record<string, string>>(
  operation: string,
  handler: RouteHandler<TParams>
) {
  return async (request: NextRequest, context: { params: TParams }) => {
    const start = Date.now();
    const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();

    try {
      const response = await handler(request, context);
      response.headers.set('x-request-id', requestId);

      logger.info('API success', {
        operation,
        requestId,
        status: response.status,
        durationMs: Date.now() - start
      });

      return response;
    } catch (error) {
      const durationMs = Date.now() - start;

      if (error instanceof ApiError) {
        logger.warn('API handled error', {
          operation,
          requestId,
          status: error.status,
          durationMs,
          message: error.message,
          details: error.details
        });

        return NextResponse.json(
          { message: error.message, requestId, details: error.details },
          { status: error.status }
        );
      }

      logger.error('API unhandled error', {
        operation,
        requestId,
        durationMs,
        error
      });

      return NextResponse.json({ message: 'Internal server error', requestId }, { status: 500 });
    }
  };
}
