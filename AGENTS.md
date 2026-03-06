# Repository Guidelines

## Project Structure & Module Organization
This repo is a multi-package workspace:
- `backend/`: Node.js API (Express + Supabase + R2) with layers in `routes/`, `usecases/`, `repositories/`, `services/`, `dto/`, and `bootstrap/`.
- `mobile/`: Expo React Native app; routes in `app/`, layered code in `src/core`, `src/data`, `src/domain`, `src/presentation`, assets in `assets/`.
- `r2-mcp/`: MCP helper scripts for R2.
- `docs/`: architecture, feature, and ops docs.
- `scripts/`: repo helpers, including environment sync.

## Build, Test, and Development Commands
Run from repo root:
- `cp .env.example .env && bash scripts/sync-env.sh all`: generate `backend/.env` and `mobile/.env`.
- `npm --prefix backend ci`: install backend dependencies.
- `npm --prefix backend run start`: start backend server.
- `npm --prefix backend run test:all`: run Node test runner + Jest suites.
- `npm --prefix backend run smoke`: run backend smoke checks (requires secrets).
- `npm --prefix mobile run start`: start Expo dev server.
- `npm --prefix mobile run android` / `ios` / `web`: launch mobile targets.
- `npx --prefix mobile tsc --noEmit`: strict type check for mobile.

## Coding Style & Naming Conventions
- Use 4-space indentation and semicolon-terminated JS/TS statements.
- Backend uses CommonJS (`require/module.exports`); mobile uses TypeScript with strict mode.
- Prefer path aliases in mobile (`@/`, `@core/`, `@domain/`, `@data/`, `@presentation/`).
- Naming: components/use cases/entities in `PascalCase` (e.g., `GetVideoFeedUseCase.ts`), hooks as `useXxx`, tests as `*.test.js` or `*.test.cjs`.

## Testing Guidelines
- Primary test coverage is in `backend/tests` (Node `--test`) and `backend/tests-jest` (Jest).
- Keep test filenames `*.test.js`/`*.test.cjs`.
- Before opening a PR, run `npm --prefix backend run test:all`.
- No explicit coverage threshold is enforced currently; ensure new logic ships with regression tests.

## Commit & Pull Request Guidelines
- Recent history mixes styles; prefer Conventional Commit prefixes: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- Keep commits focused by package (`backend`, `mobile`, `r2-mcp`) with imperative subjects.
- PRs should include a summary, linked issue/task, test commands executed, and screenshots/video for UI changes.
- For backend changes, ensure `backend-ci` passes (`npm run test:all` in `backend/`).

## Security & Configuration Tips
- Never commit `.env`, credential JSON files, or raw keys.
- Use root `.env` as source of truth; regenerate app envs via `bash scripts/sync-env.sh all`.
- Treat `r2-mcp/` credentials/config as sensitive local tooling and sanitize before sharing.
