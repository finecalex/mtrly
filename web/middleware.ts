import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGIN_PREFIXES = ["chrome-extension://", "moz-extension://"];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGIN_PREFIXES.some((p) => origin.startsWith(p));
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS" && isAllowedOrigin(origin)) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin!,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type, x-admin-setup-key",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      },
    });
  }

  const res = NextResponse.next();
  if (isAllowedOrigin(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin!);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Vary", "Origin");
  }
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
