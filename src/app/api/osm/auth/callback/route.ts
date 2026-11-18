import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  OSM_RETURN_TO_COOKIE,
  OSM_SESSION_COOKIE,
  OSM_STATE_COOKIE,
  encryptSession,
  getCookieOptions,
  getOsmConfig,
  isOsmOAuthConfigured,
  parseMobileOauthState,
  sanitizeReturnTo,
  type OsmSession
} from "@/lib/osmOAuth";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  getAdminCookieOptions,
  isAdminWhitelisted,
  signAdminSession,
  type AdminSession
} from "@/lib/adminAuth";

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

type OsmUserDetailsResponse = {
  user?: {
    id?: number;
    display_name?: string;
    account_created?: string;
  };
};

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

function redirectWithParams(
  request: NextRequest,
  path: string,
  params: Record<string, string>
) {
  const url = new URL(path, request.url);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return NextResponse.redirect(url);
}

function clearOauthFlowCookies(response: NextResponse) {
  response.cookies.delete(OSM_STATE_COOKIE);
  response.cookies.delete(OSM_RETURN_TO_COOKIE);
  response.cookies.delete("gtk_admin_oauth_intent");
}

function redirectMobileAuthError(returnTo: string, error: string) {
  const url = new URL(returnTo);
  url.searchParams.set("osm", "error");
  url.searchParams.set("reason", error);

  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const cookieStore = await cookies();
  const returnTo = sanitizeReturnTo(
    cookieStore.get(OSM_RETURN_TO_COOKIE)?.value,
    "/app"
  );

  if (!isOsmOAuthConfigured()) {
    const res = redirectWithParams(request, returnTo, { osm: "not_configured" });
    clearOauthFlowCookies(res);
    return res;
  }

  const config = getOsmConfig(origin);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const mobileState = state ? parseMobileOauthState(state) : null;

  const isAdminIntent =
    (state && state.startsWith("admin.")) ||
    cookieStore.get("gtk_admin_oauth_intent")?.value === "1";

  if (error) {
    if (isAdminIntent) {
      const res = redirectTo(
        request,
        `/admin/login?error=osm_error&reason=${encodeURIComponent(error)}`
      );
      clearOauthFlowCookies(res);
      return res;
    }

    if (mobileState) {
      return redirectMobileAuthError(mobileState.returnTo, error);
    }

    const res = redirectWithParams(request, returnTo, {
      osm: "error",
      reason: error
    });
    clearOauthFlowCookies(res);
    return res;
  }

  if (!code || !state) {
    if (isAdminIntent) {
      const res = redirectTo(request, "/admin/login?error=missing_code");
      clearOauthFlowCookies(res);
      return res;
    }
    const res = redirectWithParams(request, returnTo, { osm: "missing_code" });
    clearOauthFlowCookies(res);
    return res;
  }

  const expectedState = cookieStore.get(OSM_STATE_COOKIE)?.value;

  if (!expectedState || expectedState !== state) {
    if (isAdminIntent) {
      const res = redirectTo(request, "/admin/login?error=invalid_state");
      clearOauthFlowCookies(res);
      return res;
    }

    if (mobileState) {
      return redirectMobileAuthError(mobileState.returnTo, "invalid_state");
    }

    const res = redirectWithParams(request, returnTo, { osm: "invalid_state" });
    clearOauthFlowCookies(res);
    return res;
  }

  const tokenResponse = await fetch(`${config.baseUrl}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri
    })
  });

  const tokenData = (await tokenResponse.json()) as TokenResponse;

  if (!tokenResponse.ok || !tokenData.access_token) {
    const reason =
      tokenData.error_description ||
      tokenData.error ||
      "token_exchange_failed";

    if (mobileState) {
      return redirectMobileAuthError(mobileState.returnTo, reason);
    }

    const res = redirectWithParams(request, returnTo, {
      osm: "token_error",
      reason
    });
    clearOauthFlowCookies(res);
    return res;
  }

  const userResponse = await fetch(`${config.apiBaseUrl}/user/details.json`, {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: "application/json"
    }
  });

  if (!userResponse.ok) {
    if (mobileState) {
      return redirectMobileAuthError(mobileState.returnTo, "user_details_error");
    }

    const res = redirectWithParams(request, returnTo, {
      osm: "user_details_error"
    });
    clearOauthFlowCookies(res);
    return res;
  }

  const userData = (await userResponse.json()) as OsmUserDetailsResponse;
  const expiresIn = tokenData.expires_in || 60 * 60 * 24 * 7;

  const session: OsmSession = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: Date.now() + expiresIn * 1000,
    scope: tokenData.scope,
    user: {
      id: userData.user?.id,
      displayName: userData.user?.display_name,
      accountCreated: userData.user?.account_created
    }
  };

  const encryptedSession = encryptSession(session);

  // Obsługa logowania administratora/moderatora przez OSM
  if (isAdminIntent) {
    const isWhitelisted = isAdminWhitelisted(
      userData.user?.display_name,
      userData.user?.id
    );

    if (isWhitelisted) {
      const adminSession: AdminSession = {
        username: userData.user?.display_name || String(userData.user?.id || "admin"),
        authMethod: "osm",
        osmUserId: userData.user?.id || null,
        osmAccessToken: tokenData.access_token,
        issuedAt: Date.now(),
        expiresAt: Date.now() + ADMIN_SESSION_MAX_AGE * 1000,
      };

      const adminToken = await signAdminSession(adminSession);
      const response = redirectTo(request, "/admin");

      response.cookies.set(
        ADMIN_SESSION_COOKIE,
        adminToken,
        getAdminCookieOptions(ADMIN_SESSION_MAX_AGE)
      );

      // Zapisujemy także sesję OSM
      response.cookies.set(
        OSM_SESSION_COOKIE,
        encryptedSession,
        getCookieOptions(Math.min(expiresIn, 60 * 60 * 24 * 30))
      );

      response.cookies.delete(OSM_STATE_COOKIE);
      response.cookies.delete("gtk_admin_oauth_intent");

      return response;
    } else {
      const usernameParam = encodeURIComponent(userData.user?.display_name || "");
      const idParam = encodeURIComponent(String(userData.user?.id || ""));
      const response = redirectTo(
        request,
        `/admin/login?error=unauthorized_osm&user=${usernameParam}&id=${idParam}`
      );
      response.cookies.delete(OSM_STATE_COOKIE);
      response.cookies.delete("gtk_admin_oauth_intent");
      return response;
    }
  }

  if (mobileState) {
    const responseUrl = new URL(mobileState.returnTo);

    responseUrl.searchParams.set("osm", "connected");
    responseUrl.searchParams.set("session", encryptedSession);
    responseUrl.searchParams.set("scope", session.scope || "");

    if (session.user.id) {
      responseUrl.searchParams.set("osmUserId", String(session.user.id));
    }

    if (session.user.displayName) {
      responseUrl.searchParams.set("displayName", session.user.displayName);
    }

    const response = NextResponse.redirect(responseUrl);
    response.cookies.delete(OSM_STATE_COOKIE);
    response.cookies.delete("gtk_admin_oauth_intent");

    return response;
  }

  const response = redirectWithParams(request, returnTo, { osm: "connected" });

  response.cookies.set(
    OSM_SESSION_COOKIE,
    encryptedSession,
    getCookieOptions(Math.min(expiresIn, 60 * 60 * 24 * 30))
  );

  clearOauthFlowCookies(response);

  return response;
}