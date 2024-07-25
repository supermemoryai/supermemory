import { type NextRequest, NextResponse } from "next/server";
import { auth } from "./server/auth";
import { redirect } from "next/navigation";
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
      return redirect("/signin");
    }
    return NextResponse.next();
  } else {
    if (info) {
      return redirect("/dash/home");
    }
    return NextResponse.next();
  }
}
