import { NextRequest, NextResponse } from "next/server";

/**
 * Simple API key auth middleware.
 * If PEBBLE_API_KEY is set, requests must include matching X-API-Key header.
 * If not set (dev mode), all requests pass through.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withAuth<T extends any[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    const expectedKey = process.env.PEBBLE_API_KEY;

    if (expectedKey) {
      const providedKey = req.headers.get("x-api-key");
      if (providedKey !== expectedKey) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    return handler(req, ...args);
  };
}
