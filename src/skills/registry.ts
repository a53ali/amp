import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
const execP = promisify(exec);

export async function installSkill(userRepo: string): Promise<string> {
  // Expect user/repo
  const [user, repo] = userRepo.split('/');
  if (!user || !repo) throw new Error('Invalid user/repo');
  const url = `https://raw.githubusercontent.com/${user}/${repo}/main/skill.yaml`;
  const destDir = path.join(os.homedir(), '.amp', 'skills');
  await fs.mkdir(destDir, { recursive: true });
  const outPath = path.join(destDir, `${repo}.yaml`);
  try {
    // Try curl
    await execP(`curl -fsSL ${url} -o ${outPath}`);
    return outPath;
  } catch (err) {
    throw new Error(`Failed to fetch skill from ${url}. Please download manually.`);
  }
}
