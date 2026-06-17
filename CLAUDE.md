# Weather Roulette

A TypeScript/React app that pits professional weather forecasts against a single seeded
random-guess baseline (from historical averages) for St. John's, NL, Canada.

## Name

"Weather Roulette"

## Stack

| Layer        | Technology                                                        |
| ------------ | ----------------------------------------------------------------- |
| Frontend     | React 19 + Vite 6 + TypeScript 5                                  |
| Hosting      | GitHub Pages                                                      |
| Data capture | GitHub Actions cron (daily)                                       |
| Weather API  | Open-Meteo (free tier, no key required)                           |
| Storage      | JSON files committed to repo (Phase 0); Supabase/Postgres (later) |
| Tests        | Vitest + Testing Library                                          |

## Key Technical Decisions

### Timezone: St. John's UTC−2:30 (daylight) / UTC−3:30 (standard)

St. John's uses a non-integer UTC offset (30-minute) which breaks any code that
assumes whole-hour offsets.

**Rule:** Always use `Intl.DateTimeFormat` with `timeZone: 'America/St_Johns'`.
Never hardcode a numeric offset. Never add/subtract hours manually.

```typescript
// CORRECT
const localDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/St_Johns',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date())

// WRONG — breaks at DST transitions and ignores 30-min offset
const localDate = new Date(Date.now() - 2.5 * 3600 * 1000)
```

### Random Guess: Seeded from Historical Averages

The baseline is derived from historical monthly averages for St. John's. It is:

- Seeded once per **target date** (not re-rolled on each run)
- Stored as a `ForecastSnapshot` with `source: 'historical-average'`
- Deterministic: same target date always yields same baseline values

### Data Adapter Pattern

All weather data access goes through the `WeatherSource` interface
(`scripts/types/weather.ts`). To swap in a different API, implement `WeatherSource`
and change the injection point in the capture script.

### WMO Code Bucketing

Open-Meteo returns WMO 4677 weather codes, bucketed into 5 categories for scoring:

| Bucket        | WMO Codes                          |
| ------------- | ---------------------------------- |
| clear         | 0                                  |
| partly-cloudy | 1, 2                               |
| overcast      | 3, 45, 48                          |
| rain          | 51–67, 80–82, 95–99 (thunderstorm) |
| snow          | 71–77, 85, 86                      |

See `scripts/types/wmo.ts` for the canonical mapping.

### Skill Score

```
skill = 1 − MAE_forecast / MAE_random_guess
```

- skill > 0: forecast beats random guess
- skill = 0: tied
- skill < 0: random guess won

### Lead Times

Forecasts captured at 4 lead times per target date: 24h, 48h, 7d, 14d.

## npm Scripts

| Script                 | Purpose                             |
| ---------------------- | ----------------------------------- |
| `npm run dev`          | Start Vite dev server               |
| `npm run build`        | Type-check + Vite production build  |
| `npm run typecheck`    | `tsc --noEmit`                      |
| `npm run lint`         | ESLint (flat config)                |
| `npm run lint:fix`     | ESLint with auto-fix                |
| `npm run format`       | Prettier write                      |
| `npm run test`         | Vitest single-run                   |
| `npm run test:watch`   | Vitest watch mode                   |
| `npm run test:coverage`| Vitest with v8 coverage             |

## Repository Layout

```
.github/workflows/   GitHub Actions cron jobs
scripts/             Data capture scripts (Node.js, run in CI)
src/                 React frontend
public/              Static assets
```
