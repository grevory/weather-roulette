# src/ — Frontend Source Conventions

## Structure

```
src/
├── components/      Reusable UI components
├── hooks/           Custom React hooks
├── lib/             Pure utility functions (no React)
│   └── scoring.ts   MAE/RMSE/skill-score calculations
├── types/           Frontend-specific TypeScript types
├── test/
│   └── setup.ts     Vitest global setup (jest-dom matchers)
├── App.tsx
├── main.tsx
└── vite-env.d.ts
```

## Conventions

- Components: PascalCase filenames, default export
- Hooks: camelCase with `use` prefix, named export
- Utilities: camelCase filenames, named exports only
- Tests: colocated as `*.test.tsx` / `*.test.ts`
- Path alias: `@/` maps to `src/`

## No Side Effects at Import Time

`main.tsx` is the only file allowed to call `createRoot`. All other modules
must be pure or use hooks/context for side effects.

## Timezone in Frontend

Use `Intl.DateTimeFormat` with `timeZone: 'America/St_Johns'` when displaying
any date or time. The stored `targetDate` is always a YYYY-MM-DD string in
St. John's local time — never convert it to UTC for display.
