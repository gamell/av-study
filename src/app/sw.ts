/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const DOCUMENT_CACHE = "pilot-study-documents";
const OFFLINE_URL = "/~offline";
const WARM_ROUTES_MESSAGE = "PILOT_STUDY_WARM_ROUTES";

/**
 * /api/* routes either talk to server SQLite (sync endpoints + session/card
 * mutations) or the LLM providers (generate-*, chat). Neither should ever be
 * served from cache — the app reads from IndexedDB locally and queues writes
 * via the sync engine. Failures just bubble up to the sync retry loop.
 */
const apiOnly = new NetworkOnly();

async function putDocument(request: Request, response: Response): Promise<void> {
  if (!response.ok) return;
  const cache = await caches.open(DOCUMENT_CACHE);
  await cache.put(request, response.clone());
}

function staticOfflineResponse(): Response {
  return new Response(
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Offline · Pilot Study</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0a0a0a; color: #ededed; font-family: system-ui, sans-serif; }
    main { max-width: 28rem; padding: 2rem; text-align: center; }
    p { color: #a1a1aa; line-height: 1.5; }
    a { color: inherit; }
  </style>
</head>
<body>
  <main>
    <h1>You're offline</h1>
    <p>The cached app shell was not available for this page. Go back to the home screen once the app has been opened online.</p>
    <p><a href="/">Back to Pilot Study</a></p>
  </main>
</body>
</html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    }
  );
}

async function cachedDocumentFallback(request: Request): Promise<Response> {
  const cache = await caches.open(DOCUMENT_CACHE);
  const rootUrl = new URL("/", self.location.origin).toString();
  const offlineUrl = new URL(OFFLINE_URL, self.location.origin).toString();
  const matchOptions: CacheQueryOptions = { ignoreVary: true };

  return (
    (await cache.match(request, matchOptions)) ??
    (await cache.match(rootUrl, matchOptions)) ??
    (await cache.match(offlineUrl, matchOptions)) ??
    (await caches.match(OFFLINE_URL, { ignoreSearch: true })) ??
    staticOfflineResponse()
  );
}

async function documentHandler({ request }: { request: Request }): Promise<Response> {
  try {
    const response = await fetch(request);
    await putDocument(request, response);
    return response;
  } catch {
    return cachedDocumentFallback(request);
  }
}

async function warmDocument(url: string): Promise<void> {
  const absoluteUrl = new URL(url, self.location.origin).toString();
  const response = await fetch(
    new Request(absoluteUrl, {
      credentials: "same-origin",
      headers: {
        Accept: "text/html,application/xhtml+xml",
      },
    })
  );
  if (!response.ok) return;
  const cache = await caches.open(DOCUMENT_CACHE);
  await cache.put(absoluteUrl, response.clone());
}

self.addEventListener("message", (event) => {
  const data = event.data as { type?: string; routes?: string[] } | undefined;
  if (data?.type !== WARM_ROUTES_MESSAGE || !Array.isArray(data.routes)) return;
  event.waitUntil(Promise.all(data.routes.map(warmDocument)).then(() => undefined));
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  // iOS Safari can surface `no-response` when navigation preload races an
  // offline document fallback. Keep navigations on the explicit route below.
  navigationPreload: false,
  runtimeCaching: [
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && request.mode === "navigate",
      handler: documentHandler,
    },
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/"),
      handler: apiOnly,
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: OFFLINE_URL,
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
