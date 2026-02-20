import { NextRequest, NextResponse } from "next/server";
import { verifySessionValue, COOKIE_NAME } from "@/lib/auth";

/**
 * API auth middleware.
 * Accepts any of:
 *   1. Valid X-API-Key header (CLI / external tools)
 *   2. Valid session cookie (browser after PIN login)
 *   3. Same-origin request (fallback for browser fetch)
 * If PEBBLE_API_KEY is not set (dev mode), all requests pass through.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withAuth<T extends any[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    const expectedKey = process.env.PEBBLE_API_KEY;

    if (expectedKey) {
      // 1. API key header (CLI)
      const providedKey = req.headers.get("x-api-key");
      if (providedKey === expectedKey) {
        return handler(req, ...args);
      }

      // 2. Session cookie (browser)
      const cookie = req.cookies.get(COOKIE_NAME)?.value;
      if (cookie) {
        const valid = await verifySessionValue(cookie, expectedKey);
        if (valid) {
          return handler(req, ...args);
        }
      }

      // 3. Same-origin fallback
      const referer = req.headers.get("referer");
      const origin = req.headers.get("origin");
      const host = req.headers.get("host");
      const secFetchSite = req.headers.get("sec-fetch-site");
      const isSameOrigin =
        secFetchSite === "same-origin" ||
        (referer && host && new URL(referer).host === host) ||
        (origin && host && new URL(origin).host === host);

      if (isSameOrigin) {
        return handler(req, ...args);
      }

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return handler(req, ...args);
  };
}
