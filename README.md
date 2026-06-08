# React + Vite

## Login

The app now requires login via `/api/login`.

- Users: `Papa`, `Mama`, `Inga`, `Kevin`
- Password: same as the username
- Login success is determined only by validating the provided credentials.

## Week Plan Blob Storage

The week plan is stored in Vercel Blob via `/api/week-plan`, with one blob per ISO week.

- `GET /api/week-plan?weekKey=YYYY-Www` — reads a single week's plan. Responds with `{ weekPlan, etag }`, where `etag` identifies the exact stored version.
- `PUT /api/week-plan?weekKey=YYYY-Www` — saves a week's plan. Body is `{ weekPlan, etag }`.
- `weekKey` must be a valid ISO week key matching `^\d{4}-W\d{2}$` (e.g. `2026-W24`); other values return `400`.
- Blob path is week-scoped: `<prefix>/<weekKey>.json`. Configure the prefix with `WEEK_PLAN_BLOB_PREFIX` (default: `week-plan`); the legacy `WEEK_PLAN_BLOB_PATH` base is used as a fallback when present.

### Concurrency (optimistic, ETag-based)

Vercel Blob overwrites can take up to ~60 seconds to propagate through its CDN cache, so a naive read-then-write loop can silently lose edits. To avoid this, writes use optimistic concurrency instead of re-reading before each save:

- `PUT` performs a conditional write (`put({ ifMatch: etag, allowOverwrite: true })`) and returns the new `etag`.
- The client chains the returned `etag` to its next write, so the normal single-user flow never re-reads and can't be served stale data.
- If another device changed the week in the meantime, the write fails the precondition and the API responds `412` with the latest `{ weekPlan, etag }`. The client rebases its change onto that latest version and retries (up to 3 attempts).
- If all retries still conflict, the write is **cancelled rather than forced** — the other device's data is never overwritten. The user's unsaved change stays on screen and a "Niet opgeslagen" notice appears with a button to load the latest version.


## Run Locally

Use Vercel local dev so both the frontend and `/api/*` routes run together.

1. Install dependencies:

	```bash
	npm install
	```

2. Create a Vercel Blob read/write token:

	- Open your Vercel project dashboard.
	- Go to **Storage**.
	- Select your Blob store (or create one).
	- Open **Tokens**.
	- Create a token with **Read/Write** access.
	- Copy the token value.

3. Export environment variables in your shell:

	```bash
	export BLOB_READ_WRITE_TOKEN="your_token_here"
	# Optional overrides:
	export CART_BLOB_PATH="cart.json"
	export WEEK_PLAN_BLOB_PREFIX="week-plan"
	```

4. Start local development:

	```bash
	npx vercel dev
	```

5. Open the local URL shown by Vercel (usually `http://localhost:3000`).

Login users:

- `Papa` / `Papa`
- `Mama` / `Mama`
- `Inga` / `Inga`
- `Kevin` / `Kevin`

Note: `npm run dev` starts only Vite. The app uses `/api/login` and `/api/week-plan`, so use `vercel dev` for full local functionality.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
