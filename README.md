# Ponente

A public directory where tech speakers register the cities they can travel to and
at what cost tier, so GDG chapters and community organizers can find affordable
speakers. React SPA on the Firebase free tier. English + Spanish from day one.

> Full spec lives in [`docs/`](./docs/) — start with
> [`docs/README.md`](./docs/README.md). `docs/ARCHITECTURE.md` is the source of
> truth; `CONTEXT.md` is the domain glossary.

## Tech stack

React 18/19 + Vite + TypeScript (strict) · Tailwind CSS · Firebase (Auth,
Firestore, Hosting, Remote Config, Analytics, App Check) · Supabase Storage
(default photo backend) · Photon geocoder for city search · react-i18next.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Firebase + Supabase values
npm run dev
```

## Scripts

| Script              | What it does                                |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Vite dev server                             |
| `npm run build`     | Type-check (`tsc -b`) then production build |
| `npm run typecheck` | `tsc --noEmit` under strict mode            |
| `npm run preview`   | Preview the production build                |

Quality gates (lint, format, test, coverage, size-limit) and CI arrive with the
tooling PR (task 00).

## Environment

All secrets are `VITE_*` build-time variables — see `.env.example`. Never commit
`.env` or `.env.local`.

## Contributing

Trunk-based flow, short-lived `feature/*` branches, DCO sign-off (`git commit -s`).
See `CONTRIBUTING.md` (added with the OSS tooling PR).

## License

TBD.
