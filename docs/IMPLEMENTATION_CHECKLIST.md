# MageHub Implementation Checklist

> Execution-ready checklist derived from `docs/PROPOSAL.md`

## Goal

Ship a working MageHub v1.0 CLI that:

- loads bundled core skills from YAML
- validates skills and project config against JSON Schema
- installs/removes skills in `.magehub.yaml`
- generates context files for supported AI tools
- ships 10 production-ready core skills

## Current Repo Baseline

As of the proposal draft, the repository contains the proposal document but not the implementation files described in the target project structure. Start by creating the project skeleton before attempting feature work.

---

## Phase 0 — Repo Bootstrap

### Tasks

- [ ] Create `package.json` with Node 18+, ESM, `magehub` bin entry, scripts for build/test/lint
- [ ] Create `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`
- [ ] Add `.editorconfig`, `.gitignore`, `.prettierrc`, `eslint` config
- [ ] Create top-level directories: `src/`, `schema/`, `skills/`, `templates/`, `tests/`, `docs/`

### Acceptance Criteria

- [ ] `npm install` succeeds
- [ ] `npm run build` produces `dist/index.js`
- [ ] `npm run test` executes even if tests are initially placeholders
- [ ] `npm run lint` runs without config errors

### Deliverables

- `package.json`
- TypeScript/build/test/lint config files
- initial folder structure

---

## Phase 1 — Schemas and Types

### Tasks

- [ ] Create `schema/skill.schema.json` from proposal section 4.1
- [ ] Create `schema/config.schema.json` from proposal section 4.3
- [ ] Add TypeScript types in `src/types/skill.ts` and `src/types/config.ts`
- [ ] Ensure schema and TypeScript types match exactly on required fields and enums
- [ ] Decide and document whether recommended fields remain optional in schema

### Acceptance Criteria

- [ ] Valid sample skill YAML passes validation
- [ ] Invalid skill YAML reports all schema errors
- [ ] Valid `.magehub.yaml` passes validation
- [ ] Invalid config exits with documented config error behavior

### Deliverables

- JSON Schema files
- strongly typed interfaces/types
- test fixtures for valid/invalid YAML

---

## Phase 2 — Core Loading and Validation

### Tasks

- [ ] Implement `src/core/skill-loader.ts`
- [ ] Implement `src/core/skill-registry.ts`
- [ ] Implement `src/core/skill-validator.ts`
- [ ] Implement `src/core/config-manager.ts`
- [ ] Add heading-level verification for `instructions` (`#` / `##` warning)
- [ ] Support bundled skills lookup from `skills/<category>/<skill-id>/skill.yaml`

### Acceptance Criteria

- [ ] Loader can read all bundled skill YAML files
- [ ] Registry can list by category and search by keyword/tag
- [ ] Validator returns schema errors and heading warnings separately
- [ ] Config manager can read, write, merge, and persist `.magehub.yaml`

### Deliverables

- working core modules
- fixtures for loader/validator tests
- documented warning/error model

---

## Phase 3 — CLI Skeleton

### Tasks

- [ ] Implement CLI bootstrap in `src/index.ts` and `src/cli.ts`
- [ ] Configure Commander commands and aliases
- [ ] Implement shorthand resolution logic from proposal section 5.4
- [ ] Add shared logging/output helpers
- [ ] Standardize exit codes and stderr/stdout behavior

### Acceptance Criteria

- [ ] `magehub --help` shows all v1.0 commands
- [ ] Ambiguous shorthand exits with code `1`
- [ ] Missing config exits with code `2`
- [ ] Skill/schema errors exit with code `3`
- [ ] Output write failures exit with code `4`

### Deliverables

- runnable CLI shell
- consistent command registration
- reusable logging/error utilities

---

## Phase 4 — v1.0 Commands

### Tasks

#### Project Setup
- [ ] `setup:init`
- [ ] create `.magehub.yaml`
- [ ] optionally update `.gitignore`

#### Read/Inspect Commands
- [ ] `skill:list`
- [ ] `skill:search`
- [ ] `skill:show`
- [ ] `config:show`
- [ ] `config:validate`
- [ ] `skill:verify`

#### Write Commands
- [ ] `skill:install`
- [ ] `skill:remove`

### Acceptance Criteria

- [ ] `setup:init` creates a valid config file
- [ ] `skill:list` supports category filtering and table/json output
- [ ] `skill:search` searches name, description, tags
- [ ] `skill:show` renders metadata, conventions, examples, anti-pattern counts
- [ ] `skill:install` updates `.magehub.yaml` idempotently
- [ ] `skill:remove` removes skills without corrupting config
- [ ] `skill:verify` validates installed or specified skills and prints warnings

### Deliverables

- complete v1.0 command surface except `generate`
- CLI integration tests for success and failure paths

---

## Phase 5 — Formatters and Generation

### Tasks

- [ ] Create base formatter abstraction
- [ ] Add Handlebars templates:
  - [ ] `templates/claude.hbs`
  - [ ] `templates/opencode.hbs`
  - [ ] `templates/cursor.hbs`
  - [ ] `templates/codex.hbs`
  - [ ] `templates/qoder.hbs`
  - [ ] `templates/trae.hbs`
  - [ ] `templates/markdown.hbs`
- [ ] Implement formatter classes under `src/formatters/`
- [ ] Implement merge rules for instructions, conventions, examples, anti-patterns
- [ ] Implement heading normalization during merge
- [ ] Implement format auto-detection fallback
- [ ] Implement `generate`

### Acceptance Criteria

- [ ] `magehub generate` works from `.magehub.yaml`
- [ ] `--format` overrides detected/default format
- [ ] `--output` writes to custom path
- [ ] `--no-examples` and `--no-antipatterns` affect output correctly
- [ ] Codex output defaults to `AGENTS.md`
- [ ] Generated files match documented locations and structures

### Deliverables

- formatter implementations
- template files
- end-to-end generate tests for each supported format

---

## Phase 6 — 10 Core Skills

### Required v1.0 Skills

- [ ] `module-scaffold`
- [ ] `module-plugin`
- [ ] `module-di`
- [ ] `module-setup`
- [ ] `admin-ui-grid`
- [ ] `api-graphql-resolver`
- [ ] `hyva-module-compatibility`
- [ ] `testing-phpunit`
- [ ] `performance-caching`
- [ ] `standards-coding`

### For Each Skill

- [ ] Create `skill.yaml` in the correct category directory
- [ ] Include required metadata and instructions
- [ ] Include conventions
- [ ] Include realistic code examples
- [ ] Include anti-patterns with rationale
- [ ] Include references to official documentation where possible
- [ ] Verify headings start at `###` or deeper inside `instructions`
- [ ] Validate against schema

### Acceptance Criteria

- [ ] All 10 skills pass `skill:verify`
- [ ] All 10 skills can be installed and generated together
- [ ] No generated output has heading collisions
- [ ] Code examples are production-like and Magento-specific

### Deliverables

- complete bundled v1.0 skill set
- skill fixtures usable in formatter and integration tests

---

## Phase 7 — Quality Assurance

### Tasks

- [ ] Add unit tests for loader, validator, config manager, shorthand resolution
- [ ] Add command integration tests
- [ ] Add formatter snapshot tests
- [ ] Test on macOS, Linux, Windows path behavior
- [ ] Manually test against at least one Magento 2 codebase

### Acceptance Criteria

- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] All generated outputs are stable in snapshots
- [ ] Manual smoke test confirms the generated context files are usable

---

## Phase 8 — Release Readiness

### Tasks

- [ ] Write `README.md` with install, quick start, supported formats, examples
- [ ] Write `docs/cli-reference.md`
- [ ] Write `docs/creating-skills.md`
- [ ] Write `CONTRIBUTING.md`
- [ ] Add CI workflow for build/test/lint
- [ ] Add release workflow for npm publish
- [ ] Prepare `CHANGELOG.md`

### Acceptance Criteria

- [ ] Fresh user can install and run `setup:init`
- [ ] CI passes on pull request
- [ ] npm package includes `dist`, `skills`, `templates`, `schema`
- [ ] release checklist completed for `v1.0.0`

---

## Suggested Execution Order

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4 (except `generate`)
6. Phase 6 in parallel with late Phase 4
7. Phase 5
8. Phase 7
9. Phase 8

## Critical Risks to Watch

- Keep v1.0 strictly limited to bundled offline skills
- Do not mix v1.1 remote registry behavior into v1.0 command behavior
- Keep `AGENTS.md` as the Codex default output path everywhere
- Enforce heading normalization consistently in validator and formatter
- Avoid drift between JSON Schema, TypeScript types, and documentation examples

## Definition of Done for v1.0

MageHub v1.0 is done when:

- [ ] all 10 bundled skills exist and validate
- [ ] all documented v1.0 commands work
- [ ] context generation works for every supported tool format
- [ ] tests/build/lint pass in CI
- [ ] documentation matches actual behavior
