# AGENTS.md

This project was built with [`pastry`](https://github.com/adelrodriguez/pastry) template.

<!-- effect-solutions:start -->

## Effect Best Practices

**IMPORTANT:** Always consult effect-solutions before writing Effect code.

1. Run `effect-solutions list` to see available guides
2. Run `effect-solutions show <topic>...` for relevant patterns (supports multiple topics)
3. Search `.packref/packages/npm/effect/<version>/` for real implementations (run `bunx packref install` first)

Topics: quick-start, project-setup, tsconfig, basics, services-and-layers, data-modeling, error-handling, config, testing, cli.

Never guess at Effect patterns - check the guide first.

<!-- effect-solutions:end -->

## Quality Control

- We use `adamantite` for linting, formatting and type checking, with its `effect` preset.
- Tests use Bun (`bun test`). Do not use Vitest.
- Always run `bun run fix` after editing files.
- After making changes, run `bun run check` (formatting, lint, and type errors) and `bun run test` to ensure the code is still valid.
- After installing or removing dependencies, run `bun run analyze` to ensure we are not using any dependencies that are not needed.
- Run `bunx adamantite doctor` after changing tooling configuration. It must exit 0.

## Architecture

- `src/index.ts` starts the Effect runtime. `src/cli.ts` defines the command tree and the app layer.
- `src/commands` defines one CLI workflow per file and reports its result. Flags shared by every render command live in `src/commands/render-options.ts`.
- `src/terminal` owns terminal presentation, such as the plain logger.
- `src/lib` holds the domain logic. It never imports from `commands`, `terminal`, or `cli.ts`. It reports progress with `Effect.log*` and fails with the typed errors in `src/lib/shared/errors.ts`, whose `message` is the user-facing text.
- `src/lib` layers import only from the layers below them. Oxlint enforces this:
  1. `shared`: domain model, errors, and build-time macros.
  2. `sources` (Markdown and git inputs to code blocks) and `scene` (highlighting, layout, transitions, frames, and canvas drawing). They are siblings and do not import each other.
  3. `video`: the FFmpeg service and the render pipeline. It does not import `sources`.
- Import other modules through `#lib/...`, `#commands/...`, and `#terminal/...` subpath imports, not parent-relative paths.
- Wrap external processes in services (`Git`, `Ffmpeg`) with a `static readonly layer`. Tests replace them with `Layer.succeed`.
- Tests live in `src/__tests__`, mirror the `src/lib` layout, and share fixtures from `src/__tests__/fixtures.ts`.

## Coding Style

- Prefer inline error creation over helper functions. Do not create `toSomeError()` helper functions to convert errors - inline the error construction at each usage site instead.

## Changesets

- We use `changesets` for versioning and changelog management.
- Run `bun changeset --empty` to create a new empty changeset file.
- Never make a major version bump unless the user requests it.
- If a breaking change is being made, and we are on v1.0.0 or higher, alert the user.

<!-- PACKREF:START -->

## Packref

Use Packref when you need to inspect a dependency's exact source implementation or compare referenced versions; read the local `packref` skill, or install it with `npx -y skills add https://github.com/adelrodriguez/packref/tree/v0.3.5 --skill packref --yes`.
Run `remove`, `prune`, `clean`, or `clean --global` only when the user requests that removal scope, because these commands delete state.
<!-- PACKREF:END -->
