# AGENTS.md

Operating manual for AI coding agents working in this repo (Claude Code, Cursor, Aider, Codex, etc.). For project-specific architecture and rules, read `CLAUDE.md` first — this file covers *how to work*, not *what to build*.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create local env file
cp .env.example .env.local
# Then edit .env.local and set:
#   ANTHROPIC_API_KEY=sk-ant-...

# 3. Run migrations to create the SQLite file
npx drizzle-kit migrate

# 4. Start the dev server
npm run dev
# App is at http://localhost:3000
```

If `data/bookkeep.db` doesn't exist yet, the migrate step creates it. The `data/` directory is gitignored.

## Commands

| Task | Command |
|------|---------|
| Dev server (with HMR) | `npm run dev` |
| Production build | `npm run build` |
| Run production build locally | `npm start` |
| Type-check | `npx tsc --noEmit` |
| Lint | `npm run lint` |
| Generate migration after schema change | `npx drizzle-kit generate` |
| Apply migrations | `npx drizzle-kit migrate` |
| Inspect the DB visually | `npx drizzle-kit studio` |
| Add a shadcn/ui component | `npx shadcn@latest add <component>` |

## Verification Loop

Before declaring a task done, run:

```bash
npx tsc --noEmit && npm run lint && npm run build
```

All three must pass. The build step catches issues that type-checking and linting miss (e.g., server-only imports leaking into client components).

For changes touching CSV parsing, P&L aggregation, or merchant matching: manually exercise the flow in the browser too. There's no test suite to fall back on.

## Where Things Go

When adding new code, follow these placement rules:

- **Page (user-facing route):** `app/business/[id]/<feature>/page.tsx`
- **API endpoint:** `app/api/<resource>/route.ts` or `app/api/<resource>/[id]/route.ts`
- **Business logic / pure functions:** `lib/<domain>/<file>.ts` (e.g., `lib/pnl/aggregate.ts`)
- **Reusable React components:** `components/<name>.tsx`
- **shadcn/ui components:** `components/ui/` (managed by the shadcn CLI — don't hand-edit)
- **Database schema changes:** edit `lib/db/schema.ts`, then `drizzle-kit generate`

Route handlers should stay thin — they orchestrate. Logic belongs in `lib/`.

## Server vs Client Boundary

This is the most common source of bugs. Be deliberate:

- Files that read env vars, talk to the DB, or call the Anthropic SDK **must** start with `import "server-only";`. This causes the build to fail loudly if they're ever imported by client code.
- Components that use hooks (`useState`, `useEffect`, etc.) need `"use client";` at the top.
- Default to server components. Only mark `"use client"` when you actually need interactivity or browser APIs.
- Exports (`jspdf`, `xlsx`) run **client-side**. Import them inside the export button's click handler with dynamic `import()` to keep the initial bundle small:

```tsx
async function exportPdf() {
  const { jsPDF } = await import("jspdf");
  await import("jspdf-autotable");
  // ...
}
```

## Adding an API Route

Standard shape for a route handler:

```ts
// app/api/<resource>/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";

const Body = z.object({ /* ... */ });

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  // call into lib/, return result
}
```

Always validate inputs with Zod. Never trust the request body.

## Editing the Schema

1. Edit `lib/db/schema.ts`.
2. Run `npx drizzle-kit generate` — this creates a new SQL file in `lib/db/migrations/`.
3. **Read the generated SQL** to confirm it does what you intended. Drizzle is good but not psychic.
4. Run `npx drizzle-kit migrate` to apply.
5. Commit both the schema change and the generated migration in the same commit.

Never edit a migration after it's been applied. Make a new one.

## Environment Variables

All env vars are read server-side only. The full list:

| Name | Required | Purpose |
|------|----------|---------|
| `ANTHROPIC_API_KEY` | yes | Claude API access |
| `DATABASE_URL` | no (v1) | Reserved for hosted-mode Postgres connection |

Never prefix a variable with `NEXT_PUBLIC_` in this project. Nothing in this app needs to be exposed to the browser.

## Agent Behavior Expectations

When working on this repo:

1. **Read `CLAUDE.md` before starting.** It contains the architectural rules (active business in URL, single signed `amount` column, no auth, etc.) that aren't obvious from the code alone.
2. **Confirm scope before adding "obvious" features.** This codebase deliberately omits things you'd expect in a SaaS app (auth, logging, retries, queues). If you feel an urge to add one, that's a signal to ask first.
3. **Prefer editing files over creating new ones.** Don't scatter helpers across the tree.
4. **Don't refactor unrelated code.** If you notice something off, mention it and move on. Drive-by refactors balloon diffs.
5. **Don't add packages without checking.** The dependency list is intentionally lean. Before `npm install`-ing something new, verify it's not already covered by an existing dep.
6. **Match the existing style.** No Prettier config wars, no switching ORMs, no rewriting CSS. Read a few neighboring files before writing new ones.
7. **State your assumptions in PR/commit messages** when something was ambiguous.

## Things to Never Do

- Commit `data/bookkeep.db`, `.env.local`, or anything under `data/`.
- Log the value of `ANTHROPIC_API_KEY` (or any env var).
- Import `@anthropic-ai/sdk`, `better-sqlite3`, or `drizzle-orm/better-sqlite3` outside server-only files.
- Store the active business id anywhere except the URL.
- Add a global state library (Redux, Zustand, Jotai). The app's state is small enough to live in URL + server data.
- Swap `Drizzle` for `Prisma` or any other ORM "while you're in there."
- Write production-grade abstractions (event buses, generic CRUD factories, plugin systems). This is a 60-hour build for one user.

## File Reading Hints for Agents

If you're new to the codebase, read in this order:

1. `CLAUDE.md` — project rules
2. `AGENTS.md` (this file) — how to work
3. `lib/db/schema.ts` — the data model
4. `app/api/import/route.ts` — the most complex flow, ties everything together
5. `lib/ai/categorize.ts` — the AI integration
6. `app/business/[id]/layout.tsx` — how the active-business pattern works in practice

That's enough to be productive. Other files are mostly thin wrappers over these pieces.