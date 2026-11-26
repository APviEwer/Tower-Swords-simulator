# Tower & Swords V2.3 — 2026-11-26 verification handoff

## Production reference
- Production branch: `main` at `c3e7d5c453334b5dd62e7a3e91c9f0f9c7f11035`
- Pages deployment run: https://github.com/APviEwer/Tower-Swords-simulator/actions/runs/45771067619
- Build, deploy, and report-build-status jobs: all concluded success.
- NOTE: GitHub Pages success verifies deployment jobs, not browser behavior or performance.

## Checks actually performed
- Read full desktop and mobile HTML Git blobs from `main`.
- Desktop: 148 opening/148 closing script tags, no duplicate script IDs.
- Mobile: 153 opening/153 closing script tags, no duplicate script IDs.
- Optimizer script `r06-owned-artifact-auto-optimizer` identical between platforms.
- `certifyEquipment` function identical between platforms.
- Certified result uses best/upper ratio (NOT percentage of combinations explored).
- 1,500 deterministic synthetic cases checked the element/spell AM-GM upper bound against exhaustive enumeration: no underestimation observed.

## Re-runnable regression scripts (this test branch only)
- `node tests/optimizer-upper-envelope.test.cjs`
- `node tests/optimizer-source-parity.test.cjs`

These files must run alongside both production HTML files (the test branch is based on the production commit). The mathematical cases were executed independently in the analysis environment; the committed Node scripts have not yet been executed as Node processes.

## Remaining checks — NOT PASSED
1. Open deployed desktop and mobile in real Chromium and verify first paint/entry to page 01.
2. Test four languages, rapid switching, and persistence after reload.
3. Run automatic optimization for baseline, owned-artifact, high-complexity ten-item scenarios. Record elapsed time, evaluated skill, damage, and full Basic/Plus equipment table.
4. Compare with previous release at identical saved state, without changing damage formulas.
5. Click damage-bound verification and ensure timeout/unavailable messages do not block the UI.
6. Independently verify all asset requests and web console errors, and check actual GitHub Pages URL.

## Production safety
This branch contains test files only. Do not merge into production until checks have been run and reviewed. Never merge older divergent PRs #7/#9/#12 without rebasing and evaluating overlapping changes.
