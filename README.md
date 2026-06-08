# React + Vite

## Login

The app now requires login via `/api/login`.

- Users: `Papa`, `Mama`, `Inga`, `Kevin`
- Password: same as the username
- Login success is determined only by validating the provided credentials.

## Week Plan Blob Storage

The week plan is stored in Vercel Blob via `/api/week-plan`.

- `GET /api/week-plan` — reads the shared family week plan from blob storage.
- `PUT /api/week-plan` — saves the week plan to blob storage.
- Optional path override with `WEEK_PLAN_BLOB_PATH` (default: `week-plan.json`).
- Each mutation reads the latest blob before applying the change to avoid overwriting concurrent updates.

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
	export WEEK_PLAN_BLOB_PATH="week-plan.json"
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
