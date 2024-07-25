import { type NextRequest, NextResponse } from "next/server";
import { auth } from "./server/auth";
import { routeTypes } from "@/routes";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api")) {
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { headers: corsHeaders });
    }

    const response = NextResponse.next();
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }
  const info = await auth();
  if (routeTypes.authed.some((route) => request.nextUrl.pathname.startsWith(route))) {
    if (!info) {
      return NextResponse.redirect(new URL("/signin", request.nextUrl));
    }
  } else if (routeTypes.unAuthedOnly.some((route) => request.nextUrl.pathname.endsWith(route))) {
    if (info) {
      return NextResponse.redirect(new URL("/home", request.nextUrl));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|image|favicon.ico).*)',
    '/api/:path*',
    '/.:path*',
  ]
};
