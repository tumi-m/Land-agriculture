# Brief: launch film

**For** people who farm or want to, and the officials and advisers who help them.
**Says** the state leases farmland, this app shows where it is, and the process takes about three months.
**Length** 25 seconds, 1920 × 1080, 30 fps, with sound. It must work muted: every point is on screen as text.

## Beats

1. **Title** (0–4 s). The brand and the promise; the three counts the app is built on.
2. **Country** (3.5–13 s). The nine provinces fall into place in 3D and settle. "9 provinces. 52 districts."
3. **Notices** (12.5–19 s). The outline draws on; a pin drops on every district with a reviewed lease notice while the count climbs. Says that pins mark districts, not farms.
4. **Process** (18.5–23 s). The five stages after the closing day, to scale. "About 87 days to a signed lease."
5. **End** (22.5–25 s). The brand and the line.

## Rules

- Every number comes from the app's own content and carries its source and date on screen (AGENTS.md, rules 1 and 2).
- The palette and type are the app's: Manrope for display, Inter for text.
- No stock footage, no stock music: the score is synthesised in `scripts/sound.ts`.

## Acceptance

`npm run review` checks the render against `launch.json`: length, size, frame rate, an audio track, loudness within 1.5 LU of −16 LUFS with true peak under −1 dBTP, no black gaps and no frozen stretches. It writes a contact sheet and a still from every scene for a person to look at before `npm run ship`.
