import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
const execP = promisify(exec);

export type RepoContext = {
  branch: string;
  recentCommits: string[];
  recentDiff: string;
  fileTree: string;
  agentsMd: string | null;
};

export async function collectRepoContext(): Promise<RepoContext> {
  let branch = 'unknown';
  let recentCommits: string[] = [];
  let recentDiff = '';
  let fileTree = '';
  let agentsMd: string | null = null;

  try {
    const { stdout: b } = await execP('git rev-parse --abbrev-ref HEAD');
    branch = b.trim();
    const { stdout: commits } = await execP('git log --oneline -10');
    recentCommits = commits.trim().split('\n').filter(Boolean);
    const { stdout: diff } = await execP('git diff HEAD~1 --stat');
    recentDiff = diff.trim();
    const { stdout: tree } = await execP('git ls-files | head -n 50');
    fileTree = tree.trim();
  } catch {
    // not a git repo or git unavailable — keep defaults
  }

  try {
    const p = path.resolve(process.cwd(), 'AGENTS.md');
    const raw = await fs.readFile(p, 'utf8');
    agentsMd = raw;
  } catch {
    agentsMd = null;
  }

  return { branch, recentCommits, recentDiff, fileTree, agentsMd };
}
