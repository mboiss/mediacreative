import { NextResponse } from "next/server";

/**
 * Creates a JSON response with strict HTTP anti-caching headers to guarantee
 * that browsers, proxies, and CDNs never return stale cached data.
 */
export function jsonNoCache(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
      "Pragma": "no-cache",
      "Expires": "0",
      "Surrogate-Control": "no-store",
    },
  });
}
