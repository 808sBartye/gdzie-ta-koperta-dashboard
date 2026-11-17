"use client";

import { useEffect, useState } from "react";

type MeResponse = {
  authenticated: boolean;
  configured?: boolean;
  user?: {
    id?: number;
    displayName?: string;
    accountCreated?: string;
  };
  scope?: string;
};

interface OsmLoginStatusProps {
  variant?: "header" | "app";
  returnTo?: string;
}

export function OsmLoginStatus({
  variant = "header",
  returnTo,
}: OsmLoginStatusProps) {
  const [data, setData] = useState<MeResponse | null>(null);
  const resolvedReturnTo = returnTo ?? (variant === "app" ? "/app" : "/");
  const loginHref = `/api/osm/auth/login?returnTo=${encodeURIComponent(resolvedReturnTo)}`;
  const logoutHref = `/api/osm/auth/logout?returnTo=${encodeURIComponent(resolvedReturnTo)}`;

  useEffect(() => {
    let mounted = true;

    async function loadMe() {
      try {
        const response = await fetch("/api/osm/auth/me");
        const json = (await response.json()) as MeResponse;

        if (mounted) {
          setData(json);
        }
      } catch {
        if (mounted) {
          setData({
            authenticated: false
          });
        }
      }
    }

    void loadMe();

    return () => {
      mounted = false;
    };
  }, []);

  if (!data) {
    if (variant === "app") {
      return (
        <span className="px-2.5 py-1.5 rounded-xl bg-slate-900/75 text-slate-400 text-xs font-semibold border border-slate-700/80 backdrop-blur-md">
          OSM…
        </span>
      );
    }
    return <span className="osm-login-loading">OSM…</span>;
  }

  if (!data.authenticated) {
    if (variant === "app") {
      return (
        <a
          href={loginHref}
          aria-label="Zaloguj się przez OpenStreetMap"
          title="Zaloguj przez konto OpenStreetMap"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 shadow-md backdrop-blur-md transition active:scale-95 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none shrink-0"
        >
          <span aria-hidden="true">🌐</span>
          <span>Zaloguj OSM</span>
        </a>
      );
    }
    return (
      <a className="osm-login-button" href={loginHref}>
        Zaloguj OSM
      </a>
    );
  }

  if (variant === "app") {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-950/90 text-emerald-100 text-xs font-semibold border border-emerald-700/70 shadow-md backdrop-blur-md shrink-0">
        <span className="max-w-[110px] truncate" title={`Zalogowano w OSM jako ${data.user?.displayName || "użytkownik"}`}>
          🌐 {data.user?.displayName || "OSM"}
        </span>
        <a
          href={logoutHref}
          aria-label="Wyloguj z konta OpenStreetMap"
          title="Wyloguj z OSM"
          className="text-emerald-300 hover:text-white underline underline-offset-2 ml-0.5"
        >
          Wyloguj
        </a>
      </div>
    );
  }

  return (
    <span className="osm-user-pill">
      <span>OSM: {data.user?.displayName || "zalogowany"}</span>
      <a href={logoutHref}>Wyloguj</a>
    </span>
  );
}
