# amp — simple guide

A compact CLI to help automate AI-assisted code workflows. Keep it simple: init, audit, run tasks, and manage sessions.

Quick start

1. Install (local):

   npm install
   npm run build

2. Prepare repository context:

   amp init

3. Inspect AI readiness:

   amp audit

4. Run an AI task (dry-run shows the compiled prompt):

   amp "fix the auth bug" --dry-run
   amp "fix the auth bug" --via copilot

ai-audit (recommended)

Generate repository audit and skills file:

- Dry-run: amp ai-audit --dry-run
- Real run (writes audit.json and skills.md): amp ai-audit
- Generate per-module AGENTS.md: amp ai-audit --modules
- Optional: write outputs to a directory: amp ai-audit --out-dir ./out

Commands overview

- amp init [--update]        Generate AGENTS.md and companion files
- amp ai-audit [--modules] [--out-dir DIR] [--dry-run]  Produce audit.json and skills.md
- amp audit                  Score AI readiness (reads AGENTS.md)
- amp "<task>" [--via codex|copilot] [--dry-run]
- amp sync                   Check for stale generated context
- amp history | resume | session show <id>
- amp pr                     Generate a PR body from saved sessions
- amp config get|set         Manage local config (~/.amp/config.json)
- amp help                  Show help

Notes

- AGENTS.md is the single source of truth for repo context. Edit it to improve AI prompts.
- Skills and audit outputs are meant as guides; review them before acting.
- Sessions are stored at ~/.amp/sessions.db

Want this README longer or to include examples for contributors? Replace with more detail or keep it short and link to AGENTS.md.