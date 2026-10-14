# Budgeter (offline PWA)

Offline port of the personal budgeter. Vite + React + Tailwind; all data is stored in IndexedDB on the device, no server and no login.

## Develop

```
bun install
bun dev
bun run build   # type-checks, then writes dist/
bun run test
```

`dist/` is a static site: deploy it to any HTTPS static host (GitHub Pages, Netlify, Cloudflare Pages, ...). It uses hash routing, so no server rewrites are needed.

## Install on Android

Open the deployed URL in Chrome, then menu (three dots) -> **Install app** (or **Add to Home screen**). It then works offline.

## Backup warning

Your data lives only on the phone. Clearing site data, uninstalling the app or losing the phone erases it. Use **Settings -> Backup -> Export** regularly and keep the file somewhere safe; **Import** restores it (replacing everything).
