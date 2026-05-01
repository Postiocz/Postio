<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Standard Postio UI
- **Login Page**: Rozdělení 40% (levý panel s formou) / 60% (pravý vizuální panel).
- **Levý panel**: Obsah vycentrován (`max-w-[320px]`), `LocaleSwitcher` absolutně v pravém horním rohu.
- **Pravý panel**: Tušený grid (`opacity-[0.04]`), velká fialová záře (`blur-[160px]`).
- **Cookie Consent**: Plovoucí karta vpravo dole (max-w-[400px], backdrop-blur), detailní modal s přepínači kategorií (Necessary, Functional, Analytical, Advertising).
