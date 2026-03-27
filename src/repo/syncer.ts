import fs from 'fs/promises';
import { readdirSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

const STATE_DIR = path.join(process.env.HOME || '.', '.amp');
const STATE_FILE = path.join(STATE_DIR, 'sync-state.json');

async function hashFile(filePath: string): Promise<string | null> {
  try {
    const data = await fs.readFile(filePath);
    return crypto.createHash('md5').update(data).digest('hex');
  } catch {
    return null;
  }
}

function trackedFiles(cwd: string): string[] {
  const files = new Set<string>(['package.json', 'tsconfig.json']);
  try {
    for (const entry of readdirSync(cwd, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (
        /\.config\.[cm]?[jt]s$/.test(entry.name) ||
        entry.name === 'Makefile' ||
        entry.name === 'pyproject.toml' ||
        entry.name === 'requirements.txt' ||
        entry.name === 'go.mod' ||
        entry.name === 'Cargo.toml'
      ) {
        files.add(entry.name);
      }
    }
  } catch {
    // ignore
  }
  return Array.from(files);
}

export async function initSync(): Promise<void> {
  const cwd = process.cwd();
  const files = trackedFiles(cwd);
  const hashes: Record<string, string | null> = {};
  for (const file of files) {
    hashes[file] = await hashFile(path.join(cwd, file));
  }
  await fs.mkdir(STATE_DIR, { recursive: true }).catch(() => {});
  await fs.writeFile(STATE_FILE, JSON.stringify({ timestamp: Date.now(), hashes }, null, 2), 'utf8');
}

export async function checkSync(): Promise<{ stale: boolean; message: string }> {
  const cwd = process.cwd();
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf8');
    const state = JSON.parse(raw) as { hashes?: Record<string, string | null> };
    const files = Object.keys(state.hashes || {});
    let changed = false;

    for (const file of files) {
      const hash = await hashFile(path.join(cwd, file));
      if (hash !== state.hashes?.[file]) {
        changed = true;
      }
    }

    if (changed) {
      return { stale: true, message: 'package.json or another tracked file changed since last init — AGENTS.md may be stale. Run `amp init --update` to refresh.' };
    }
    return { stale: false, message: 'Context files unchanged since last init' };
  } catch {
    return { stale: true, message: 'No sync state found — run amp init to create it' };
  }
}
