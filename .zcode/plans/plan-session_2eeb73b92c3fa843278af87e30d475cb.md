Run the ext against prod Render and capture exactly what the request does (success or explicit error):

1. Launch Chrome for Testing (fresh profile) with the current `web-ext/dist` (STAT_ORIGIN = https://stat-3lmc.onrender.com), remote debugging on 9222.
2. Open the side panel, click Stat, and capture:
   - the source-error row content and the card state (fresh vs cached vs error box),
   - page console + service-worker console messages (the net bridge logs the failing fetch),
   - rough timing (Render cold start can hang ~30s before failing — we'll see which failure mode: fast refuse vs long hang).
3. Also curl `https://stat-3lmc.onrender.com/mini/envelope.json` directly from the shell for a baseline comparison (same machine, no extension), and via the feat thru proxy to confirm prod serves fresh data.
4. Screenshot the panel for you; report the exact error text + timing.
5. No code changes; findings into ext DECISIONS.md (and if the direct path fails here too, that's the evidence for switching stat-mini to the feat thru route — I'll propose that as a follow-up, not build it now).