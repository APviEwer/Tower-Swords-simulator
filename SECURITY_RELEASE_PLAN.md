# Tower & Swords V2.3 — Security and release baseline

This is an isolated protection-development branch. The live `main` branch remains unchanged.

## Owner-friendly release policy
- The owner continues to edit the original game simulator and publishes tested updates as usual.
- The published website remains free, anonymous, and static; there is no login or computation server.
- Never publish a supposed "secret" key in HTML, JavaScript, or WebAssembly.
- Always keep a verified backup of original working files before running an obfuscation/build step.
- Keep source maps, diagnostic dumps, development notes and unpublished formula source out of the publish bundle.
- Run desktop/mobile and TW/EN/KR/JP regression checks before publishing any protection build.

## Protection limits
A browser must download the code/data it executes. Obfuscation, minification, and WebAssembly raise the difficulty of copying but cannot prevent it. Forked files can be modified independently of this official repository. Digital signatures establish provenance only where independently verified; they do not stop republishing.

## Planned steps (none marked complete without tests)
1. Backup current release files and map dependencies.
2. Put editable source in a separate private repository (requires repository creation/visibility permissions).
3. Separate entry HTML from release-only JavaScript/data assets.
4. Add repeatable minification/obfuscation for compatible parts, with original sources retained privately.
5. Add explicit proprietary copyright/usage notice and source-map exclusions.
6. Perform deterministic regression tests for calculation, optimizer, UI and language.
7. Publish only after full checks; keep a rollback option.

## Editing the simulator
Always edit the original sources, NOT the protected/minified output. Rebuild and test the release artifacts for each update. This preserves normal development freedom.

This branch is preparatory. It is not an assurance of uncopyable front-end software.
