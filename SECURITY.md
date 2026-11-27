# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |

## Security Architecture & Defense-in-Depth

AuraAir is engineered with strict client-side security controls and zero third-party script execution:

### 1. No Hardcoded Secrets & Secure Key Transport
- No API keys, credentials, or personal tokens are committed to source control.
- API keys are supplied optionally at runtime in browser `localStorage` and can be reset to Demo Mode with one click (`Demo` button).
- Live API requests transmit credentials via the `x-goog-api-key` HTTP header rather than URL query parameters, preventing key leakage in browser history or proxy logs.
- Requests explicitly set `store: false` on the Gemini Interactions API so user queries are not persisted server-side.
- The application ships with an **Intelligent Demo Mode** (`demo`), enabling full offline evaluation without credentials.

### 2. Strict Content Security Policy (CSP) & Zero External Scripts
- `index.html` enforces a strict CSP with **no `'unsafe-eval'`** and **no `'unsafe-inline'`** in `script-src`:
  - `default-src 'self'`
  - `script-src 'self'`
  - `style-src 'self' https://fonts.googleapis.com`
  - `font-src 'self' https://fonts.gstatic.com`
  - `img-src 'self' data:`
  - `connect-src 'self' https://generativelanguage.googleapis.com`
  - `object-src 'none'; base-uri 'self'; form-action 'self'`
- `X-Content-Type-Options: nosniff` prevents MIME-sniffing exploits.
- All UI styling is self-contained in `css/styles.css` (zero external CSS/JS CDN runtime dependencies).

### 3. XSS Mitigation & Safe DOM Construction
- All user inquiries undergo HTML entity escaping (`sanitizeInput`) and unsafe construct scrubbing (`stripUnsafeTags`) covering `<script>`, `<style>`, arbitrary HTML tags, inline `on*=` event handlers, `javascript:`, `vbscript:`, and `data:text/html` payloads.
- Input lengths are strictly bounded to 1,000 characters.
- Dynamic UI cards (hourly forecast, IAQ blueprints, chat messages, error notices) use safe DOM `createElement`/`textContent` nodes or entity-escaped Markdown rendering (`markdownToHtml`).

### 4. Prompt Injection Defense
- User queries are isolated inside `<user_scenario>` XML boundary tags, and `stripUnsafeTags` strips any injected `</user_scenario>`, `<system>`, `<prompt>`, or `<instruction>` tags before prompt assembly.
- Persona rules are enforced through dedicated `system_instruction` fields in the Interactions API payload.

### 5. Client-Side Rate Limiting
- Built-in minimum throttle of 600 ms between consecutive API calls prevents accidental quota exhaustion.

## Reporting a Vulnerability

If you identify a security issue, please open an issue in the repository or contact `swati.icfai@rediffmail.com`.
