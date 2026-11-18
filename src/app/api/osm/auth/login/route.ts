import { NextRequest, NextResponse } from "next/server";
import {
  OSM_RETURN_TO_COOKIE,
  OSM_STATE_COOKIE,
  getCookieOptions,
  getOsmConfig,
  isOsmOAuthConfigured,
  makeOauthState,
  sanitizeReturnTo
} from "@/lib/osmOAuth";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"), "/app");

  if (!isOsmOAuthConfigured()) {
    const errorUrl = new URL(returnTo, origin);
    errorUrl.searchParams.set("osm", "not_configured");
    return NextResponse.redirect(errorUrl);
  }

  const config = getOsmConfig(origin);
  const state = makeOauthState();

  const authorizeUrl = new URL("/oauth2/authorize", config.baseUrl);

  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", config.clientId);
  authorizeUrl.searchParams.set("redirect_uri", config.redirectUri);
  authorizeUrl.searchParams.set("scope", "read_prefs write_api");
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);

  response.cookies.set(
    OSM_STATE_COOKIE,
    state,
    getCookieOptions(60 * 10)
  );
  response.cookies.set(
    OSM_RETURN_TO_COOKIE,
    returnTo,
    getCookieOptions(60 * 10)
  );

  return response;
}

