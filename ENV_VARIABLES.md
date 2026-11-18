# Zmienne środowiskowe – Gdzie Ta Koperta

Poniżej znajduje się pełna lista zmiennych środowiskowych używanych w projekcie (do wpisania w `.env.local` lokalnie oraz w **Vercel → Project Settings → Environment Variables** na produkcji).

---

## 1. Logowanie OpenStreetMap (OSM OAuth 2.0) — **do dodania**

Te zmienne są wymagane, aby działało logowanie kontem OSM (`/api/osm/auth/login`, `/api/admin/auth/osm/login`, `OsmLoginStatus`).

| Zmienna | Wymagana | Wartość lokalna (`.env.local`) | Wartość produkcyjna (Vercel) | Skąd wziąć |
|---|---|---|---|---|
| `OSM_OAUTH_CLIENT_ID` | **Tak** | `...` | `...` | Panel OSM: *My Settings → OAuth 2 Applications → Register new application* |
| `OSM_OAUTH_CLIENT_SECRET` | **Tak** | `...` | `...` | Wygenerowany przy rejestracji aplikacji OAuth 2 w OSM |
| `OSM_OAUTH_REDIRECT_URI` | **Tak** | `https://localhost:3000/api/osm/auth/callback` | `https://gdzietakoperta.pl/api/osm/auth/callback` | Musi dokładnie zgadzać się z Redirect URI wpisanym w aplikacji OAuth 2 na OSM |
| `OSM_SESSION_SECRET` | **Tak** | Losowy ciąg min. 32 znaki | Losowy ciąg min. 32 znaki | Wygeneruj np. komendą `openssl rand -hex 32` |
| `OSM_BASE_URL` | Nie | `https://www.openstreetmap.org` (domyślna) | `https://www.openstreetmap.org` | Ustaw tylko jeśli korzystasz z serwera testowego OSM (np. `master.apis.dev.openstreetmap.org`) |
| `OSM_API_BASE_URL` | Nie | `https://api.openstreetmap.org/api/0.6` (domyślna) | `https://api.openstreetmap.org/api/0.6` | Ustaw tylko jeśli korzystasz z serwera testowego OSM |

> **Uprawnienia (Scopes) aplikacji w panelu OSM:** zaznacz `read_prefs`, `write_api`.
> **Uwaga:** W ustawieniach aplikacji OAuth 2 na OpenStreetMap możesz dodać jednocześnie oba Redirect URI (lokalny i produkcyjny), każdy w nowej linii.

---

## 2. Podstawowe zmienne aplikacji (Baza, Zdjęcia, Admin)

| Zmienna | Wymagana | Opis |
|---|---|---|
| `DATABASE_URL` | **Tak** | Połączenie pooled do bazy Neon PostgreSQL + PostGIS (alternatywnie `POSTGRES_URL`) |
| `DATABASE_URL_UNPOOLED` | Zalecane | Połączenie bezpośrednie (direct) do migracji i skryptów ETL |
| `CLOUDINARY_CLOUD_NAME` | **Tak** | Nazwa chmury Cloudinary do zapisu zdjęć zgłoszeń |
| `CLOUDINARY_API_KEY` | **Tak** | Klucz publiczny Cloudinary API |
| `CLOUDINARY_API_SECRET` | **Tak** | Klucz tajny Cloudinary API |
| `ADMIN_SECRET` | **Tak** | Hasło/sekret awaryjny do panelu `/admin` (min. 32 znaki) i podpisywania sesji admina |
| `ADMIN_OSM_USERS` | **Tak** | Lista nicków lub ID użytkowników OSM z uprawnieniami moderatora, oddzielona przecinkami (np. `Aro0713,808sBartye`) |

---

## 3. Zmienne opcjonalne (dodatkowe moduły i skrypty)

| Zmienna | Domyślna wartość / Opis |
|---|---|
| `NEXT_PUBLIC_TILE_URL` | Domyślnie `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` |
| `NEXT_PUBLIC_TILE_ATTRIBUTION` | Atrybucja kafelków mapy |
| `REVALIDATE_SECRET` | Sekret do wymuszania odświeżenia cache (`/api/revalidate`) |
| `CRON_SECRET` | Alternatywny sekret do `/api/revalidate` dla zadań cron |
| `OPENROUTE_API_KEY` | Klucz API OpenRouteService używany przez `/api/route-assistant` |
| `AI_CANDIDATES_IMPORT_SECRET` | Sekret autoryzujący endpointy `/api/ai-candidates/*` |
| `VERCEL_ANALYTICS_DRAIN_SECRET` | Sekret do weryfikacji draina `/api/vercel-analytics-drain` |
| `OVERPASS_API_URL` | Niestandardowy adres Overpass API dla `/api/osm/gtk-parking` |

---

## Szybki blok do skopiowania do `.env.local` (część OSM)

```env
OSM_OAUTH_CLIENT_ID=""
OSM_OAUTH_CLIENT_SECRET=""
OSM_OAUTH_REDIRECT_URI="https://localhost:3000/api/osm/auth/callback"
OSM_SESSION_SECRET=""
```
