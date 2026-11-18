import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  OSM_SESSION_COOKIE,
  decryptSession,
  getBearerSessionFromAuthorization,
  isOsmOAuthConfigured,
  isSessionValid
} from "@/lib/osmOAuth";

export async function GET(request: NextRequest) {
  const configured = isOsmOAuthConfigured();
  const cookieStore = await cookies();
  const rawCookieSession = cookieStore.get(OSM_SESSION_COOKIE)?.value;
  const rawBearerSession = getBearerSessionFromAuthorization(
    request.headers.get("Authorization")
  );
  const rawSession = rawBearerSession || rawCookieSession;

  if (!rawSession) {
    return NextResponse.json({
      authenticated: false,
      configured
    });
  }

  const session = decryptSession(rawSession);

  if (!isSessionValid(session)) {
    return NextResponse.json({
      authenticated: false,
      configured
    });
  }

  return NextResponse.json({
    authenticated: true,
    configured,
    user: session?.user,
    scope: session?.scope
  });
}