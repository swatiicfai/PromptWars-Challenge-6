# Contributing to AuraAir

Thank you for contributing to **AuraAir – Urban Air Quality & Winter Smog Defense Assistant**!

## Branch & Repository Policy

- **Single branch only**: All work must stay on `main`.
- **Lightweight repo**: Keep total repository size well under 10 MB (currently < 400 KB).
- **Zero external runtime dependencies**: Do not add CDN `<script>`/`<link>` tags or bundled `node_modules`.

## Running Checks Locally

```bash
# Syntax and static code quality check (sub-100ms, zero-dependency)
npm run lint

# Validate all modules
npm run validate

# Run comprehensive automated test suite (265 tests across 14 suites)
npm test

# Run CI pipeline checks locally
npm run ci
```

All tests in `tests/run-tests.js` must pass 100% before committing.

## Code & Security Standards

- Keep `'use strict';` at the top of every JavaScript module and maintain UMD export compatibility for both browser and Node.js.
- Document functions with clear JSDoc (`@param`, `@returns`).
- Never hardcode API keys or tokens; keep credentials in volatile `sessionStorage` only.
- Escape/sanitize user inputs via `GeminiService.sanitizeInput()` and `stripUnsafeTags()` and avoid inserting raw HTML from untrusted strings.
- Maintain WCAG 2.1 AA/AAA color contrast (`>= 4.5:1`), keyboard accessibility, `aria-*` attributes, and `prefers-reduced-motion` support for UI changes.
- Ensure strict adherence to Content Security Policy (`script-src 'self'`) — never add inline scripts.

See [ARCHITECTURE.md](ARCHITECTURE.md) and [SECURITY.md](SECURITY.md) for full details.
