# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Architecture & Best Practices

AuraAir is designed following defense-in-depth principles:

### 1. No Hardcoded Secrets
- No API keys, credentials, or personal tokens are committed to source control.
- API keys are entered by the user at runtime and kept strictly within browser `localStorage`.
- The application provides an **Intelligent Demo Mode** (`demo`), enabling full functionality and review without requiring external credentials.

### 2. Client-Side Input Sanitization & XSS Mitigation
- All user inquiries and inputs undergo sanitization (`sanitizeInput`), escaping HTML entities (`&`, `<`, `>`, `"`, `'`, `/`).
- Malicious DOM event handlers (`onerror`, `onload`, `javascript:`) and `<script>` tags are scrubbed via regex before processing.
- Input string lengths are capped strictly at 1,000 characters to prevent buffer and memory denial-of-service.

### 3. Prompt Injection Defense
- User prompts are encapsulated within strict `<user_scenario>` XML boundary delimiters.
- System persona instructions are enforced via dedicated system instruction channels in the Gemini API.
- Prompt templates strictly instruct the model to ignore attempts to override persona boundaries.

### 4. Content Security Policy (CSP) & Secure Headers
- The `index.html` file includes strict CSP meta headers:
  - `default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'`
  - Restricts connections solely to verified endpoints: `https://generativelanguage.googleapis.com`
  - `X-Content-Type-Options: nosniff` enabled to prevent MIME-sniffing exploits.

### 5. Client-Side Rate Limiting
- Built-in minimum throttle of 600 ms between consecutive API calls to prevent quota exhaustion and abuse.

## Reporting a Vulnerability

If you identify a security issue, please open an issue in the repository or contact `swati.icfai@rediffmail.com`.
