# Design system and UI decisions

## Paper & Red Pen (23 Nov 2026)

- **Context:** the earlier UI used a generic purple-gradient "AI app" look.
- **Decision:** warm paper and ink neutrals, a single red-pen accent (`#B8421C` light, `#E8724A` dark),
  Fraunces (display) + Geist (UI) + Geist Mono, defined as Tailwind v4 `@theme` tokens in `src/index.css`.
  Tailwind's slate / indigo / cyan / navy scales are re-mapped so existing utilities inherit the system.
- **Motion:** no animation library (framer-motion was removed on purpose). Page changes use the native
  View Transitions API through React 19.3's `<ViewTransition>` (`PageTransition` / `RouteTransition` in
  `src/components/ui.tsx`). React Router already wraps navigations in `startTransition`, so no router
  changes are needed. The root does not cross-fade, so the sidebar, header and tab bar stay live; the
  public header is pinned with `view-transition-name: public-header`. Browsers without the API fall back to
  a short CSS entrance. `prefers-reduced-motion` disables all of it.
- **Accessibility:** WCAG 2.2 AA. Every form control has a programmatic label; secondary text uses
  `slate-500` or darker on light surfaces (`slate-400` fails contrast on white and is reserved for borders/icons).
  Each route sets a distinct `document.title`.

## Security headers (vercel.json)

- CSP: `script-src 'self' 'wasm-unsafe-eval'` (no inline scripts — the theme bootstrap lives in
  `public/theme-init.js`), `connect-src` allows only same origin and `*.supabase.co`, `frame-ancestors 'none'`.
  Inline styles are allowed because React style props and the PDF viewer use them.
- Also HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, immutable caching for `/assets/*`.
- If a new third-party origin is added (an AI provider, analytics, a CDN), add it to the CSP or it will be blocked.
