# Hardship allocation frontend

Staff app for the hardship allocation platform: dashboard, review queue, applications, households, funding cycles and the fairness report. Next.js 15, TypeScript, Tailwind, shadcn/ui.

## Running

```bash
npm install
npm run dev
```

Then open http://localhost:3000. `npm run build` does a production build with type checking. Don't run a build while the dev server is running; they share `.next/`.

Test logins (mock auth):

- admin / admin-dev-only
- juwase / caseworker-dev-only (caseworker, can record review decisions)

## Data

The API isn't connected yet. `lib/api/*` is the only layer pages talk to, and for now it reads the backend's seed data:

- `scripts/convert_seed.py <backend>/db/seed` converts the seed CSVs into `lib/mock/seed/`
- `lib/mock/views.ts` ports `db/views.sql`
- `lib/mock/scoring.ts` fills `model_scores` the way `backend.ml score` does

Anything written through the app (households, applications, reviews, allocation runs) lives in memory until restart.

To connect the backend, replace the function bodies in `lib/api/` with calls to the FastAPI endpoints. Types in `types/index.ts` use the same snake_case names as the database, so responses can be passed straight through. Once auth is real, store the backend token in `lib/auth/session.ts` and remove the test logins from `components/auth/LoginForm.tsx`. `lib/mock/` and `scripts/` can then be deleted.

## Notes

- Protected attributes are only used on `/fairness`, as group totals. `consumption_pc` is stripped from survey data before it reaches decision pages.
- Deferred applications can be appealed; there is no reject action.
- Reviews that go against the model's lean are flagged as overrides and need a note.
- `supportGroup()` in `lib/labels.ts` has to match `support_group()` in the backend's `views.sql`. Childcare is currently grouped under education; still to confirm.
- Ethnicity is `not_disclosed` for every household in the seed data, so that breakdown is empty for now.
