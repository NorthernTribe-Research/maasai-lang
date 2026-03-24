# Development Workflow

## Branching

- Branch from `main`.
- Keep changes scoped to one feature or fix.
- Open merge requests early for visibility.

## Local Commands

```bash
npm install
cp .env.example .env
npm run db:push
npm run dev
```

## Validation Before Merge

```bash
npm run check
npm run test
npm run build
```

Use `npm run test:integration` when changing service boundaries, persistence, or external integrations.
