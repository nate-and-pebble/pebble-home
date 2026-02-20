import { NextRequest, NextResponse } from "next/server";

/**
 * Simple API key auth middleware.
 * If PEBBLE_API_KEY is set, external requests must include matching X-API-Key header.
 * Same-origin requests (browser UI calling its own API) are allowed through.
 * If PEBBLE_API_KEY is not set (dev mode), all requests pass through.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withAuth<T extends any[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    const expectedKey = process.env.PEBBLE_API_KEY;

    if (expectedKey) {
      const providedKey = req.headers.get("x-api-key");

      // Allow same-origin requests from the browser UI (no API key needed)
      const referer = req.headers.get("referer");
      const origin = req.headers.get("origin");
      const host = req.headers.get("host");
      const isSameOrigin =
        (referer && host && new URL(referer).host === host) ||
        (origin && host && new URL(origin).host === host);

      if (!isSameOrigin && providedKey !== expectedKey) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    return handler(req, ...args);
  };
}
