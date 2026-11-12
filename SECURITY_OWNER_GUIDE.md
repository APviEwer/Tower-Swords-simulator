# Tower & Swords V2.3 — Maintainer security notes

## What the owner controls
Only APviEwer may approve official updates to the `main` branch. This branch `security/v2.3-protection` is for developing security changes, and **does not publish** new versions.

## Current limits
- The source repository is currently **public**. Anyone can download the original files and previous commits.
- Files delivered to a browser cannot be made impossible to copy, inspect, or modify.
- Source minification does not grant ownership control over copied files.
- This repository has not been migrated to a private source repository.

## Owner's normal update flow (once protection is actually verified)
1. Change the original editable simulator (game updates, equipment, numbers, UI) as usual.
2. Produce a new protected preview.
3. Compare behavior with the original and review automated regression reports.
4. Only approved build output is copied into the official public release by the owner.
5. Keep source privately backed up and keep the previous official release for rollback.

## Required before attempting any official migration
1. Create a *new private repository* for original editable sources. Do not simply switch the current public GitHub Pages repository to private without checking the live site impact.
2. Import current source and establish a private build workflow.
3. Publish only generated release assets to the existing public website repository.
4. Enforce official branch permissions, token hygiene and two-factor authentication in GitHub settings.
5. Remember: copies already published in Git history cannot be made secret retroactively.
6. Verify desktop/mobile interface, 4 languages, input focus, formula results, primary artifact selection and optimizer search before deployment.

## Automated release gate
The protected preview builder + structural tests + SHA-256 verifier check syntax/structure, not behavioral correctness. Never treat a successful GitHub Action as sufficient approval to deploy the full simulator.
