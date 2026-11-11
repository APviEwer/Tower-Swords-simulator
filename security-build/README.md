# Tower & Swords V2.3 protected preview

This is a **non-deploying** proof-of-build. It does not replace the official release.

Requirements: Node.js 20+.

From the repository root:

```sh
cd security-build
npm install
cd ..
node security-build/build.mjs
node security-build/test.mjs
```

The result is written under `security-build/protected-preview/` and includes a manifest with SHA-256 hashes.

The build minifies/mangles inline JavaScript while preserving the outer HTML markup. It never alters the original files. Even if successful, it is **not approved for public release** until a real desktop/mobile regression test validates UI, language switching, user profiles, damage calculations, artifact selection and auto-optimization performance.

**Security limitations:** this is obfuscation/minification, not encryption, and the browser can still read all delivered program code. If the source remains in a public GitHub repository, it remains public even after an obfuscated build is published. Existing git history and past releases remain accessible. Genuine source confidentiality requires new development to occur in a private repository; this build alone cannot create that confidentiality.

**Maintenance:** Update the original simulator as usual. Never edit the minified output as your source of truth.
