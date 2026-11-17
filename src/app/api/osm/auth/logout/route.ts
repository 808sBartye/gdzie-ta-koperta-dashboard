import { NextRequest, NextResponse } from "next/server";
import { OSM_SESSION_COOKIE, sanitizeReturnTo } from "@/lib/osmOAuth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"), "/app");
  const response = NextResponse.redirect(new URL(returnTo, request.url));

  response.cookies.delete(OSM_SESSION_COOKIE);

  return response;
}
