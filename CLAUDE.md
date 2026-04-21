# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Primary reference: AGENTS.md

`AGENTS.md` in the repo root is the canonical style and testing guide for this project. Read it before editing source. It covers: build/lint/test commands (including how to run a single test), import ordering, the `.js` extension rule for local imports, naming conventions, error-handling strategy, command file pattern, and test style. Don't duplicate that guidance here — follow it.

## Common commands

```bash
npm install
npm run build          # tsup -> dist/ (ESM, node18, with shebang banner)
npm run test           # vitest run (all tests)
npm run test:watch
npm run lint           # eslint with type-checking
npm run format:check   # prettier (no auto-fix)

# Single test
npx vitest run tests/unit/skill-loader.test.ts
npx vitest run -t "loadSkillFile"

# Exercising the CLI locally after build
node ./dist/index.js setup:init --format=claude
node ./dist/index.js skill:list
node ./dist/index.js generate
```

There is no `npm run start` / dev script — the CLI is consumed via the built `dist/index.js` (declared in `package.json` `bin`).

## Architecture

MageHub is a TypeScript CLI that reads bundled + user-authored Magento 2 "skill" definitions and renders them into AI-tool-specific context files (Claude, OpenCode, Cursor, Codex, Qoder, Trae, plain markdown).

The data flow is:

```
skills/**/*.yaml  ──►  skill-loader ──►  skill-normalizer ──►  SkillRegistry
     (+ custom_skills_path)                                          │
                                                                     ▼
.magehub.yaml  ──►  config-manager ──────────────────────────►  renderer ──►  templates/<format>.hbs  ──►  output file
```

Key modules in `src/core/`:

- `skill-registry.ts` — the **only stateful class**, built fresh per command invocation. Holds the merged bundled + custom skill set and rejects duplicate IDs.
- `skill-loader.ts` / `skill-normalizer.ts` — filesystem discovery and shape normalization for skill YAML.
- `schema-validator.ts` — Ajv-based validation of skill YAML and `.magehub.yaml` against `schema/*.schema.json`. Uses a module-level `Map` cache; tests must call `clearSchemaValidatorCache()` in `beforeEach`.
- `config-manager.ts` — loads and validates `.magehub.yaml` (YAML only — not JSON/TOML).
- `renderer.ts` — compiles Handlebars templates in `templates/*.hbs` into format-specific output.
- `runtime-assets.ts` / `paths.ts` — resolves bundled resource paths so the CLI works both from source (`src/`) and from the published `dist/` layout.

Command layer (`src/commands/`) uses the **two-export pattern** described in `AGENTS.md`: a testable `runXxxCommand(options, rootDir?)` and a `registerXxxCommand(program)` that wires it into Commander. `src/cli.ts` registers all commands; `src/index.ts` is the entrypoint with the top-level `CliError` catch boundary that maps to process exit codes.

Bundled skills live under `skills/<category>/<skill-id>/skill.yaml` and are shipped via the `files` field in `package.json` (`dist`, `docs`, `schema`, `skills`, `templates`). Users can extend the set via `custom_skills_path` in `.magehub.yaml`; that path is resolved relative to the project root and **must stay inside it**.

## Output formats

Each supported format maps to one Handlebars template and one default output path:

| Format     | Template                | Default output             |
| ---------- | ----------------------- | -------------------------- |
| `claude`   | `templates/claude.hbs`  | `CLAUDE.md`                |
| `opencode` | `templates/opencode.hbs`| `.opencode/skills/magehub.md` |
| `cursor`   | `templates/cursor.hbs`  | `.cursorrules`             |
| `codex`    | `templates/codex.hbs`   | `AGENTS.md`                |
| `qoder`    | `templates/qoder.hbs`   | `.qoder/context.md`        |
| `trae`     | `templates/trae.hbs`    | `.trae/rules/magehub.md`   |
| `markdown` | `templates/markdown.hbs`| `MAGEHUB.md`               |

When adding a new format, a template, a renderer case, a config-type entry, and an e2e smoke test are all required — `tests/e2e/` covers all seven existing formats.

## Documentation map

Planning and scope live in `docs/`:

- `docs/PROPOSAL.md` — product scope
- `docs/IMPLEMENTATION_CHECKLIST.md` — execution order
- `docs/IMPLEMENTATION_BACKLOG.md` — next issue-sized units of work
- `docs/cli-reference.md` — user-facing command reference
- `docs/creating-skills.md` — authoring guide for skill YAML
