---
"sakuga": patch
---

Remove the `types` condition from `exports`. It pointed at `dist/index.d.ts`, which the build never emits, because sakuga is a CLI with no library API.
