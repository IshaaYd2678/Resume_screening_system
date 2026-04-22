# ResumeReady

ResumeReady is a Next.js 14 app for coaching-first career document scoring. The active application now lives at the repository root.

## Active structure

```text
.
|-- app/                # App Router pages and API routes
|-- components/         # UI components
|-- data/               # Fixtures and saved sessions
|-- lib/                # Parsers, scoring, session helpers, shared types
|-- test/               # Vitest coverage for parsers and scoring
|-- package.json
`-- AGENTS.md
```

## Archived legacy code

Older IRSS backend/frontend infrastructure has been moved to `archive/legacy-irss/` so it stays available for reference without competing with the active app structure.

## Local development

```bash
npm install
npm run dev
```

The app runs at `http://127.0.0.1:3000` by default.

## Useful scripts

```bash
npm run dev
npm run build
npm run start
npm run test
```
