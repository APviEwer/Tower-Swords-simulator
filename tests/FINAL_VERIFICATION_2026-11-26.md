# Tower & Swords V2.3 — Final regression sign-off (2026-11-26)

## Scope and release safety
- Production `main` reference: `c3e7d5c453334b5dd62e7a3e91c9f0f9c7f11035`.
- Production Pages deployment: https://github.com/APviEwer/Tower-Swords-simulator/actions/runs/45771067619 (success).
- This sign-off concerns the tested scenarios, not proof of global optimum or every browser/device.
- All new test files/workflow are isolated on `test/optimizer-upper-envelope-20261126`; no production HTML changed.

## Automated execution
- Final run: https://github.com/APviEwer/Tower-Swords-simulator/actions/runs/45786869806
- CI outcome: success, both browser platforms.
- Mathematical bound: 1,500 synthetic deterministic test cases passed.
- Script structure: desktop/mobile source parity, no duplicate script ID, matching script open/close tags.
- Chromium opened desktop/mobile HTML, removed initial cover, switched four languages, entered page 03 optimizer, chose skill 1 and clicked Start Optimization.
- Uncaught browser page exceptions: zero in tested flows.

## Latest final run
| Scenario | Desktop result | Mobile result | Desktop / mobile timing |
|---|---|---|---|
| Baseline skill 1 | 8.981R | 8.981R | varies by runner; validated in earlier runs |
| 4 owned artifacts, crit 0, CD 0 | 11.013R | 11.013R | 699 ms / 664 ms |
| 10 owned artifacts, crit >= 30, CD >= 30 | 11.694R, crit 31, CD 30% | 11.694R, crit 31, CD 30% | 765 ms / 707 ms |
- All 10 owned artifacts were considered in the ten-artifact case.
- Full equipment result sections were populated (12 direct children in these runs).
- Basic optimization result remains labelled unproven global optimum, correctly.

## Optional mathematical upper-bound action (same ten-artifact scenario)
- Desktop: 1,164 ms; displayed at least 22.819% of theoretical maximum (best 1.1694e19, upper 5.1247e19).
- Mobile: 1,185 ms; displayed at least 23.075% (best 1.1694e19, upper 5.0679e19).
- Search controls stayed enabled afterward. These certified lower-bound percentages may vary with runtime because this proof is time-limited.
- The percentages are not the share of enumerated configurations, nor evidence that the optimizer returns only 22–23% of attainable damage.

## Remaining limitations / future improvement
- Did not exhaustively prove global damage maximum for complex 10-gear cases (99.9% target not reached).
- No measured network performance in Taiwan or testing on a real iPhone; tests run a hosted Chrome mobile emulation against local serving of production HTML.
- Not a full exhaustive trait-specific damage calculation comparison; complex tests vary artifact ownership and thresholds, not trait combinations.
- No independent before/after matching-save comparison against historical release damage formula.
- If accuracy work continues, preserve candidate search speed and improve safe upper-bound tightness; never label a heuristic result a global maximum without proof.
- Do not merge divergent old PR #7/#9/#12 without reviewing overlaps.

## Decision
Regression scope above is green. No production changes required based on these checks. Ready to start separate new feature development on a fresh branch based on current main.
