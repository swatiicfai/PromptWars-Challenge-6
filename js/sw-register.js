/**
 * @file sw-register.js
 * @description Registers the Progressive Web App Service Worker for offline capability.
 * Loaded as an external script to strictly respect Content-Security-Policy (CSP)
 * script-src 'self' without requiring unsafe-inline.
 * @license MIT
 */

'use strict';

if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js')
      .then(function (reg) {
        if (typeof console !== 'undefined' && console.info) {
          console.info('[AuraAir SW] Registered, scope:', reg.scope);
        }
      })
      .catch(function (err) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[AuraAir SW] Registration failed:', err);
        }
      });
  });
}
