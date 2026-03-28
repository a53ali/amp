#!/usr/bin/env node
import { getConfig, setConfig } from './config/index';
import { collectRepoContext } from './context/collector';
import { compilePrompt } from './context/compiler';
import { CodexAdapter } from './adapters/codex';
import { CopilotAdapter } from './adapters/copilot';
import { analyzeRepo } from './repo/analyzer';
import { generateFromProfile } from './repo/generator';
import { auditRepo } from './repo/auditor';
import { initSync, checkSync } from './repo/syncer';
import { Session } from './session/model';
import { SessionStore } from './session/store';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import { readFileSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';

const execP = promisify(exec);
const sessionStore = new SessionStore();

async function getAdapter(via?: string) {
  const cfg = await getConfig();
  const backend = via ?? cfg.backend;
  if (backend === 'codex') return new CodexAdapter();
  if (backend === 'copilot') return new CopilotAdapter();
  throw new Error(`Unknown backend: ${backend}`);
}

async function showHelp() {
  console.log('amp — backend-agnostic CLI for AI-assisted coding workflows');
  console.log('');
  console.log('Usage:');
  console.log('  amp [command]');
  console.log('  amp "<task>" [--via codex|copilot] [--dry-run]');
  console.log('');
  console.log('Core commands:');
  console.log('  amp init [--update]        Generate AGENTS.md and companion context files');
  console.log('  amp ai-audit               Generate AGENTS.md, audit.json, skills.md, and per-module AGENTS.md');
  console.log('  amp audit                  Score repository AI readiness');
  console.log('  amp sync                   Check for stale generated context');
  console.log('  amp pr                     Build a PR title/body from saved sessions');
  console.log('');
  console.log('Session commands:');
  console.log('  amp history                List recent saved sessions');
  console.log('  amp resume                 Re-run the latest saved session');
  console.log('  amp session show <id>      Print a saved session in full');
  console.log('');
  console.log('Config commands:');
  console.log('  amp config get             Show current config');
  console.log('  amp config set <k> <v>     Update a config value');
  console.log('');
  console.log('Other:');
  console.log('  amp help <command>         Show command-specific help');
  console.log('  amp --help | -h | -help    Show this message');
  console.log('  amp --version | -v         Print the installed version');
}

async function showCommandHelp(command?: string): Promise<void> {
  if (!command) {
    await showHelp();
    return;
  }

  const helpText: Record<string, string> = {
    config: [
      'amp config get',
      'amp config set <key> <value>',
      '',
      'Read or update ~/.amp/config.json.',
    ].join('\n'),
    init: [
      'amp init',
      'amp init --update',
      '',
      'Analyze the repository and generate AGENTS.md plus companion files.',
    ].join('\n'),
    audit: [
      'amp audit',
      '',
      'Score the repository AI readiness based on AGENTS.md.',
    ].join('\n'),
    sync: [
      'amp sync',
      '',
      'Warn when tracked files changed after the last init.',
    ].join('\n'),
    history: [
      'amp history',
      '',
      'List recent saved sessions.',
    ].join('\n'),
    resume: [
      'amp resume',
      '',
      'Re-run the latest saved session.',
    ].join('\n'),
    session: [
      'amp session show <id>',
      '',
      'Print a saved session in full.',
    ].join('\n'),
    pr: [
      'amp pr',
      '',
      'Generate a PR title/body from sessions on the current branch.',
    ].join('\n'),
    run: [
      'amp "<task>" [--via codex|copilot] [--dry-run]',
      '',
      'Compile repo context into a prompt and send it to the selected backend.',
    ].join('\n'),
  };

  const text = helpText[command];
  if (!text) {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }

  console.log(text);
}

async function currentBranch(): Promise<string> {
  try {
    const { stdout } = await execP('git rev-parse --abbrev-ref HEAD');
    return stdout.trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

async function changedFiles(): Promise<string[]> {
  try {
    const { stdout } = await execP('git diff --name-only');
    return stdout.split('\n').map(line => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function sessionSnippet(prompt: string): string {
  return prompt.length > 80 ? `${prompt.slice(0, 77)}...` : prompt;
}

function sessionId(): string {
  return `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
}

function printSession(session: Session): void {
  console.log(`ID: ${session.id}`);
  console.log(`Timestamp: ${new Date(session.timestamp).toISOString()}`);
  console.log(`Backend: ${session.backend}`);
  console.log(`Branch: ${session.branch}`);
  console.log(`Prompt: ${session.prompt}`);
  console.log('Compiled prompt:');
  console.log(session.compiledPrompt);
  console.log('Response:');
  console.log(session.response);
  console.log(`Files changed: ${session.filesChanged.length ? session.filesChanged.join(', ') : '(none)'}`);
}

async function runTaskPrompt(args: string[]): Promise<void> {
  const raw = args.join(' ');
  const viaMatch = raw.match(/--via\s+(codex|copilot)/);
  const dry = /--dry-run/.test(raw);
  const noValidate = /--no-validate/.test(raw);
  const retriesMatch = raw.match(/--retries\s+(\d+)/);
  const retriesFlag = retriesMatch ? Number(retriesMatch[1]) : undefined;
  const via = viaMatch ? viaMatch[1] : undefined;
  const prompt = raw.replace(/--via\s+(codex|copilot)/, '').replace(/--dry-run/, '').replace(/--no-validate/, '').replace(/--retries\s+\d+/, '').trim().replace(/^"|"$/g, '');

  if (!prompt) {
    console.error('No task prompt provided.');
    process.exit(1);
  }

  const context = await collectRepoContext();
  const profile = await analyzeRepo();
  let compiled = compilePrompt(prompt, context);
  if (dry) {
    console.log('--- Compiled prompt ---\n');
    console.log(compiled);
    return;
  }

  const adapter = await getAdapter(via);
  if (!(await adapter.isAvailable())) {
    console.error(`${adapter.name} adapter is not available on this system.`);
    process.exit(1);
  }

  const cfg = await getConfig();
  const maxRetries = retriesFlag ?? cfg.maxRetries ?? 3;

  try {
    let attempt = 0;
    let lastOut = '';
    let passed = false;
    while (attempt < maxRetries) {
      attempt++;
      lastOut = await adapter.run(compiled);
      console.log('--- Adapter response (attempt ' + attempt + ') ---');
      console.log(lastOut);

      if (noValidate) {
        passed = true;
        break;
      }

      const { runValidation } = await import('./validation/runner');
      const result = await runValidation(profile);
      if (result.passed) {
        passed = true;
        break;
      }
      // append failure details and retry
      compiled += `\n\nPrevious attempt failed:\n${result.output}\nFix the above issues.`;
      console.warn('Validation failed, retrying...');
    }

    if (!passed) {
      console.error('Failed after ' + maxRetries + ' attempts. Last validation output:');
      console.error('---');
      console.error(lastOut);
      process.exit(1);
    }

    const backend = via ?? cfg.backend;
    sessionStore.save({
      id: sessionId(),
      timestamp: Date.now(),
      prompt,
      compiledPrompt: compiled,
      response: lastOut,
      backend,
      branch: context.branch,
      filesChanged: await changedFiles(),
    });
  } catch (err: any) {
    console.error('Adapter error:', err.message || err);
    process.exit(1);
  }
}


async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    await showHelp();
    return;
  }

  if (args.includes('--help') || args.includes('-h') || args.includes('-help')) {
    await showHelp();
    return;
  }

  if (args.includes('--version') || args.includes('-v')) {
    const pkg = JSON.parse(readFileSync(path.join(__dirname, '../package.json'), 'utf8')) as { version?: string };
    console.log(pkg.version || '0.0.0');
    return;
  }

  if (args[0] === 'help') {
    await showCommandHelp(args[1]);
    return;
  }

  if (args[0] === 'config') {
    if (args[1] === 'get') {
      const cfg = await getConfig();
      console.log(JSON.stringify(cfg, null, 2));
      return;
    }
    if (args[1] === 'set') {
      const key = args[2];
      const value = args[3];
      if (!key || value === undefined) {
        console.error('Usage: amp config set <key> <value>');
        process.exit(1);
      }
      await setConfig(key, value);
      console.log('ok');
      return;
    }
  }

  if (args[0] === 'init') {
    const update = args.includes('--update');
    console.log('Analyzing repository...');
    const profile = await analyzeRepo();
    await generateFromProfile(profile, { update });
    await initSync();
    console.log('Init complete.');
    return;
  }

  if (args[0] === 'ai-audit') {
    console.log('Running AI-aware audit and generating AGENTS.md (repo-level and per-module)...');
    const profile = await analyzeRepo();
    await generateFromProfile(profile, { update: true });
    const audit = await auditRepo();
    const out = { generatedAt: new Date().toISOString(), profile, audit };
    const auditPath = path.join(process.cwd(), 'audit.json');
    await fs.writeFile(auditPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
    console.log('Wrote', auditPath);
    const skills = (() => {
      const recs: string[] = [];
      if ((profile as any).language === 'typescript') {
        recs.push('TypeScript basics and advanced typing');
        recs.push('tsc and type-checking workflows');
      } else if ((profile as any).language === 'javascript') {
        recs.push('Modern JavaScript (ES6+)');
      } else if ((profile as any).language === 'python') {
        recs.push('Python testing with pytest');
      }
      if ((profile as any).framework) recs.push(`${(profile as any).framework} fundamentals`);
      if ((profile as any).testRunner) recs.push(`${(profile as any).testRunner} testing`);
      if ((profile as any).linter) recs.push(`${(profile as any).linter} linting rules`);
      if ((profile as any).packageManager) recs.push(`Using ${(profile as any).packageManager}`);
      if ((profile as any).typeChecker) recs.push('Static type checking and fixes');
      return Array.from(new Set(recs));
    })();
    const skillsMd = ['# Recommended Skills', '', ...skills.map(s => `- ${s}`)].join('\n') + '\n';
    const skillsPath = path.join(process.cwd(), 'skills.md');
    await fs.writeFile(skillsPath, skillsMd, 'utf8');
    console.log('Wrote', skillsPath);
    // per-module AGENTS.md
    try {
      const srcDir = path.join(process.cwd(), 'src');
      const entries = await fs.readdir(srcDir, { withFileTypes: true }).then(list => list.filter(e => e.isDirectory()).map(d => d.name));
      for (const dir of entries) {
        if (/^(repo|cli|__tests__|__mocks__)$/i.test(dir)) continue;
        const dirPath = path.join(srcDir, dir);
        const files = await fs.readdir(dirPath).catch(() => []);
        if (!files.some(f => /\\.tsx?$|\\.jsx?$/.test(f))) continue;
        const agentsPath = path.join(dirPath, 'AGENTS.md');
        const content = [
          `# Module: ${dir}`,
          '',
          '## What this is',
          `This module contains the ${dir} implementation and related code.`,
          '',
          '## Recommended Skills',
          ...skills.map(s => `- ${s}`),
          '',
          '## Build & Run',
          '```',
          (profile as any).buildCommand || '',
          '```',
          '',
          '## Test',
          '```',
          (profile as any).testCommand || '',
          '```',
          '',
          '## Notes',
          '- This file was generated by amp ai-audit. Refine for module-specific details.'
        ].join('\n') + '\n';
        await fs.writeFile(agentsPath, content, 'utf8').catch(() => {});
        console.log('Wrote', agentsPath);
      }
    } catch (e) {
      // ignore
    }
    console.log(`AI audit score: ${audit.score}/100`);
    for (const d of audit.details) console.log(`- ${d}`);
    return;
  }

  if (args[0] === 'audit') {
    const res = await auditRepo();
    console.log(`AI Readiness Score: ${res.score}/100\n`);
    for (const d of res.details) console.log(d);
    return;
  }

  if (args[0] === 'sync') {
    const res = await checkSync();
    if (res.stale) console.warn(res.message);
    else console.log(res.message);
    return;
  }

  if (args[0] === 'history') {
    const sessions = sessionStore.list(20);
    if (sessions.length === 0) {
      console.log('No sessions saved yet.');
      return;
    }
    for (const session of sessions) {
      console.log(`${session.id} | ${new Date(session.timestamp).toISOString()} | ${session.backend} | ${sessionSnippet(session.prompt)}`);
    }
    return;
  }

  if (args[0] === 'session' && args[1] === 'show') {
    const id = args[2];
    if (!id) {
      console.error('Usage: amp session show <id>');
      process.exit(1);
    }
    const session = sessionStore.getById(id);
    if (!session) {
      console.error(`Session not found: ${id}`);
      process.exit(1);
    }
    printSession(session);
    return;
  }

  if (args[0] === 'resume') {
    const latest = sessionStore.getLatest();
    if (!latest) {
      console.error('No previous session found.');
      process.exit(1);
    }
    const adapter = await getAdapter(latest.backend);
    if (!(await adapter.isAvailable())) {
      console.error(`${adapter.name} adapter is not available on this system.`);
      process.exit(1);
    }
    const response = await adapter.run(latest.compiledPrompt);
    console.log('--- Adapter response ---');
    console.log(response);
    sessionStore.save({
      id: sessionId(),
      timestamp: Date.now(),
      prompt: latest.prompt,
      compiledPrompt: latest.compiledPrompt,
      response,
      backend: latest.backend,
      branch: latest.branch,
      filesChanged: await changedFiles(),
    });
    return;
  }

  if (args[0] === 'diff') {
    const d = await (await import('./diff/analyzer')).analyzeLastDiff();
    console.log(d.summary);
    console.log(`Risk: ${d.risk}`);
    for (const f of d.files) console.log(`${f.path} (+${f.added} −${f.removed})`);
    return;
  }

  if (args[0] === 'shell-init') {
    console.log(`# amp shell hook`);
    console.log(`_amp_error_hook() {`);
    console.log(`  local exit_code=$?`);
    console.log(`  local last_cmd=$(fc -ln -1 2>/dev/null || history 1 | sed 's/^[ ]*[0-9]*[ ]*//')`);
    console.log(`  if [ $exit_code -ne 0 ] && [ -n "$last_cmd" ]; then`);
    console.log(`    printf "\\n✗ Command failed (exit %s)\\n" "$exit_code"`);
    console.log(`    printf "Fix with amp? [y/n] "`);
    console.log(`    read -r answer < /dev/tty`);
    console.log(`    if [ "$answer" = "y" ]; then`);
    console.log(`      amp "fix: \`$last_cmd\` failed with exit code $exit_code"`);
    console.log(`    fi`);
    console.log(`  fi`);
    console.log(`}`);
    console.log(`trap '_amp_error_hook' ERR`);
    return;
  }

  if (args[0] === 'pr') {
    const branch = await currentBranch();
    const sessions = sessionStore.listByBranch(branch);
    if (sessions.length === 0) {
      console.error(`No sessions found for branch ${branch}`);
      process.exit(1);
    }
    const title = sessions[sessions.length - 1].prompt;
    console.log(`Title: ${title}`);
    console.log('');
    console.log('## What changed');
    for (const session of sessions) {
      console.log(`- ${session.prompt}`);
    }
    console.log('');
    console.log('## Why');
    for (const session of sessions) {
      console.log(session.response.trim());
      console.log('');
    }
    console.log('## Testing');
    console.log('Not run');
    return;
  }

  await runTaskPrompt(args);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
