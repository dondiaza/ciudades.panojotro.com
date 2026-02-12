import { NextRequest, NextResponse } from "next/server";

import { buildClearedSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set(buildClearedSessionCookie());
  return response;
}
