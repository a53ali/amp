# amp

`amp` is a backend-agnostic CLI for AI-assisted coding workflows.

It compiles repo context into a stronger prompt, sends it to your chosen AI backend, and stores session history for later resume / PR generation.

## Contents

- [What it does](#what-it-does)
- [Install](#install)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Examples](#examples)
- [Using Copilot](#using-copilot)
- [Commands](#commands)
- [Generated project files](#generated-project-files)
- [Version and help](#version-and-help)
- [Notes](#notes)

## What it does

- Generates repo context files from a single source of truth (`AGENTS.md`)
- Compiles prompts with git and repository context
- Runs prompts through Codex or GitHub Copilot CLI
- Stores sessions locally in SQLite
- Produces PR summaries from prior sessions on the current branch

Status: Experimental

This project is experimental software. Use cautiously: features, command names, and behavior may change rapidly. The design is intended for exploration and to provide pragmatic automation around AI-assisted coding workflows; it's not a stable production tool yet.

Why use amp?

- Orchestration: turns single-shot AI suggestions into repeatable, auditable workflows (generate → run → validate → PR).
- Session persistence: saves prompts, compiled context, and responses so work can be resumed, reviewed, or turned into a PR.
- Validation + retry: runs typecheck, linter, and tests after AI changes and retries automatically by appending failures to the next prompt.
- Skills & automation: supports YAML-defined skills (macros) for common workflows and installable skill sets.
- Repository auditing & generator: creates AGENTS.md plus companion files to help AI agents understand the repo.
- Diff intelligence: classifies risk for changes and surfaces risky files before creating a PR.
- Multi-backend: use Copilot CLI, Codex, or future adapters—amp focuses on orchestration, not model quality.

How this differs from GitHub Copilot CLI

- Copilot CLI is an interactive agent with deep GitHub integration and an IDE-like experience. amp is focused on automation and reproducible repo workflows that complement—not replace—interactive tools.


## Install

```bash
npm install -g amp-cli
```

Or run it locally from the repository:

```bash
npm install
npm run build
./bin/amp.js --help
```

## Requirements

- Node.js
- Git
- Optional backends:
  - Codex CLI
  - GitHub Copilot CLI extension

To use Copilot:

```bash
gh extension install github/gh-copilot
```

## Quick start

```bash
amp init
amp audit
amp sync
amp "fix the auth bug" --dry-run
amp "fix the auth bug"
```

## Examples

Use Copilot for a one-off fix:

```bash
amp "fix the auth bug" --via copilot
```

Generate and inspect the compiled prompt before running anything:

```bash
amp "refactor the session store" --dry-run
```

Run a task, then inspect the saved session and PR summary:

```bash
amp "update validation logic"
amp history
amp pr
```

## Using Copilot

Make Copilot the default backend:

```bash
amp config set backend copilot
amp "fix the auth bug"
```

Or use Copilot for one run:

```bash
amp "fix the auth bug" --via copilot
```

Preview the compiled prompt without executing Copilot:

```bash
amp "fix the auth bug" --via copilot --dry-run
```

## Commands

### Help

```bash
amp --help
amp help init
```

### Config

```bash
amp config get
amp config set backend codex
amp config set backend copilot
amp config set maxRetries 5
```

### Repo context

```bash
amp init
amp init --update
amp audit
amp sync
```

`amp init` analyzes the repository and generates:

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `CLAUDE.md`
- `.cursorrules`

`AGENTS.md` is the source of truth. The other files defer to it.

### Prompt runs

```bash
amp "fix the auth bug"
amp "fix the auth bug" --via codex
amp "fix the auth bug" --via copilot
amp "fix the auth bug" --dry-run
```

### Sessions

```bash
amp history
amp resume
amp session show <id>
amp pr
```

`amp history` lists recent saved sessions.

`amp resume` reruns the most recent session.

`amp session show <id>` prints the full stored session.

`amp pr` generates a simple PR title/body for sessions on the current branch.

## Generated project files

After `amp init`, the generated files point back to `AGENTS.md` so you only maintain one source of truth.

If the generated content looks incomplete, fill in the TODOs inside `AGENTS.md` and rerun:

```bash
amp init --update
```

## Version and help

```bash
amp --version
amp -h
amp help audit
```

## Notes

- Sessions are stored locally in `~/.amp/sessions.db`
- Config is stored locally in `~/.amp/config.json`
- `amp sync` warns when tracked repo files change after initialization
