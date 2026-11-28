/**
 * @file sw.js
 * @description AuraAir Progressive Web App Service Worker.
 * Implements a cache-first strategy for static assets with network fallback,
 * enabling full offline operation for all deterministic features (AQI math,
 * thermal inversion forecasting, impact calculator, IAQ blueprints).
 * GenAI chat features gracefully degrade to the intelligent offline heuristic
 * engine when network is unavailable.
 * @version 2.0.0
 * @license MIT
 */

'use strict';

const CACHE_NAME = 'auraair-v2.0.0';
const OFFLINE_ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/aqi-engine.js',
  './js/impact-calculator.js',
  './js/gemini.js',
  './js/app.js',
  './js/sw-register.js',
  './manifest.json',
  './robots.txt',
  './sitemap.xml'
];

/**
 * Install event: pre-cache all static shell assets.
 * Uses waitUntil to block activation until caching succeeds.
 */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(OFFLINE_ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

/**
 * Activate event: evict stale caches from previous versions.
 * Claims all clients immediately so new SW takes control without reload.
 */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/**
 * Fetch event: cache-first for static assets, network-only for Gemini API.
 * Falls back to cached index.html for navigation requests (SPA shell).
 *
 * @param {FetchEvent} event - Incoming fetch event from browser
 */
self.addEventListener('fetch', function (event) {
  const url = new URL(event.request.url);

  // Always bypass cache for Gemini API calls — network only with no fallback caching
  if (url.hostname === 'generativelanguage.googleapis.com') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first strategy for all other requests
  event.respondWith(
    caches.match(event.request).then(function (cachedResponse) {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(function (networkResponse) {
        // Only cache successful same-origin responses
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic'
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(function () {
        // Navigation fallback: return offline shell for page navigations
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('Offline – AuraAir local mode active', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});
