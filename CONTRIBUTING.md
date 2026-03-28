CONTRIBUTING

Thanks for helping improve amp. This short guide explains how to run, test, and contribute changes.

1) Quick dev setup
- Install: npm install
- Build: npm run build
- Run locally: node ./bin/amp.js --help

2) Tests & lint
- Run unit tests (if present): npm test
- Linting: npm run lint
- Type-check: tsc --noEmit

3) Branching & commits
- Create a feature branch: git checkout -b feat/my-change
- Make small, focused commits. Keep commit messages imperative (e.g., "fix: handle null response").
- Run tests and lint before committing.

4) Pull requests
- Open a PR against main with a short description and rationale.
- Include test updates or a simple reproduction when relevant.
- Address review comments promptly and re-run tests.

5) Code style & structure
- Follow existing code patterns in src/.
- New adapters: implement src/adapters/<name>.ts and wire in getAdapter in src/index.ts.
- New skills: add to src/skills and register in the skills loader.

6) AI audit & AGENTS.md
- AGENTS.md is the canonical repo context. Use amp init to generate/update it.
- Use amp ai-audit --dry-run to preview audit outputs, or amp ai-audit --modules to generate per-module AGENTS.md.

7) Local debugging tips
- To inspect the compiled prompt: amp "<task>" --dry-run
- To re-run the latest session: amp resume

8) Questions & help
- Open an issue for design or behavior questions.
- Prefer small PRs and clear, descriptive commit messages.

Thank you!
