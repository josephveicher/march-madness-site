# March Madness auto-sync build

This bundle is ready for a GitHub-backed Netlify deploy.

## Files
- `index.html`: viewer-facing site, optimized for mobile and auto-loads the latest published standings.
- `netlify/functions/publish-scores.mjs`: manual publish / load endpoint used by the site.
- `netlify/functions/refresh-scores.mjs`: normal function that fetches live results, recalculates standings, and publishes them immediately.
- `netlify/functions/sync-scores.mjs`: scheduled Netlify function that performs the same refresh automatically.
- `netlify/lib/picks-data.mjs`: extracted static picks from the uploaded workbook.
- `netlify/lib/standings-engine.mjs`: scoring engine and ESPN round parsing logic.
- `netlify.toml`: schedules `sync-scores` every 10 minutes.

## Deploy
1. Put these files in a GitHub repo.
2. Connect the repo to Netlify.
3. After the first production deploy, open Netlify -> Functions and use `Run now` on `sync-scores`, or visit `/.netlify/functions/refresh-scores` once.
4. Open the site. It will auto-load the latest published standings.

## Notes
- The auto-sync uses the 2026 NCAA tournament dates and scores by round.
- The manual upload/publish tools remain available as a fallback.
