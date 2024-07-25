import { type NextRequest, NextResponse } from "next/server";
import { auth } from "./server/auth";
import { redirect } from "next/navigation";

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
  } else if (request.nextUrl.pathname.startsWith("/app")) {
    const info = await auth();

    if (!info) {
      return redirect("/signin");
    }
  }
}

export const config = {
	matcher: ["/api/:path*", "/app/:path*"],
};
