# scripts/ — Data Capture Conventions

These scripts run in GitHub Actions (Node 20, Ubuntu).

## Architecture

```
GitHub Actions cron
  └─ capture.ts
       ├─ OpenMeteoSource implements WeatherSource
       └─ HistoricalAverageSource implements WeatherSource
            └─ writes ForecastSnapshot[] → data/snapshots/YYYY-MM-DD.json
```

## Timezone Rule

The "target date" is always computed in St. John's local time (`America/St_Johns`).
A job running at 06:00 UTC is still the *previous* calendar day in St. John's
during NDT (UTC−2:30) — compute this with `Intl.DateTimeFormat`, not arithmetic.

## Data Storage (Phase 0: JSON in repo)

Snapshots stored in `data/snapshots/YYYY-MM-DD.json`. Each file contains an array
of `ForecastSnapshot` objects for that target date (one per lead time + baseline).

The Actions job commits updated snapshots with `[skip ci]` to prevent recursion.

## Adding a New Weather Source

1. Create `scripts/sources/MySource.ts` implementing `WeatherSource`
2. Inject in `scripts/capture.ts` via env var or config flag
3. Add unit tests in `scripts/sources/MySource.test.ts`

## Open-Meteo API Notes

- Base URL: `https://api.open-meteo.com/v1/forecast`
- St. John's coords: latitude=47.5615, longitude=-52.7126
- No API key required (free tier)
- Request: `temperature_2m_max`, `weathercode`, `precipitation_sum`
- Always pass `timezone=America%2FSt_Johns` so dates are in local time

## Testing Scripts

Scripts under `scripts/` are included in Vitest's `include` glob.
Use `vi.fn()` to mock `fetch` — never make real HTTP calls in unit tests.
