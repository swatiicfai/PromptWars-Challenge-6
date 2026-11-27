# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |

## Security Architecture & Defense-in-Depth

AuraAir is engineered with strict client-side security controls and zero third-party script or stylesheet execution:

### 1. No Hardcoded Secrets & Volatile Credential Isolation
- No API keys, credentials, or personal tokens are committed to source control.
- Optional API keys are stored only in volatile browser `sessionStorage` (`auraair_gemini_key`, cleared automatically when the tab closes), while actively purging any legacy `localStorage` key entries.
- Users can evaluate all workflows with zero credentials via **Intelligent Demo Mode** (`demo`), or clear credentials with one click (`Demo` button).
- Live API requests transmit credentials via the `x-goog-api-key` HTTP header rather than URL query parameters, preventing key leakage in browser history or proxy logs.
- Requests explicitly set `store: false` on the Gemini Interactions API so user queries are not persisted server-side.
- `redactSecrets()` scrubs accidental API key patterns (`AIza...`) from logged/displayed error messages.

### 2. Strict Content Security Policy (CSP) & Zero Third-Party Assets
- `index.html` enforces a strict self-contained CSP with **no `'unsafe-eval'`**, **no `'unsafe-inline'`**, and **no external font or CDN domains**:
  - `default-src 'self'`
  - `script-src 'self'`
  - `style-src 'self'`
  - `font-src 'self'`
  - `img-src 'self' data:`
  - `connect-src 'self' https://generativelanguage.googleapis.com`
  - `base-uri 'self'; form-action 'self'; object-src 'none'`
- `X-Content-Type-Options: nosniff` prevents MIME-sniffing exploits.
- `<meta name="referrer" content="no-referrer" />` prevents referrer leakage.

### 3. XSS Mitigation & Safe DOM Construction
- All user inquiries undergo HTML entity escaping (`sanitizeInput`) and unsafe construct scrubbing (`stripUnsafeTags`) covering `<script>`, `<style>`, arbitrary HTML tags, inline `on*=` event handlers, `javascript:`, `vbscript:`, and `data:text/html` payloads.
- Input lengths are capped at 1,000 characters.
- Dynamic UI cards (hourly forecast, IAQ blueprints, weather metadata, chat messages, error notices) use safe DOM `createElement`/`textContent` nodes or entity-escaped Markdown rendering (`markdownToHtml`).

### 4. Prompt Injection Defense & Network Resilience
- User queries are isolated inside `<user_scenario>` XML boundary tags, and `stripUnsafeTags` removes injected `</user_scenario>`, `<system>`, `<prompt>`, or `<instruction>` tags before prompt assembly.
- Persona rules are enforced through dedicated `system_instruction` fields in the Interactions API payload.
- Outbound `fetch()` calls are guarded by a serialized 600 ms rate-limiter and a 25-second `AbortController` timeout.

## Reporting a Vulnerability

If you identify a security issue, please open an issue in the repository or contact `swati.icfai@rediffmail.com`.
