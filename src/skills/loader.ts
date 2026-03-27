import fs from 'fs/promises';
import path from 'path';
import os from 'os';
const yaml = require('js-yaml');

export type Skill = {
  name: string;
  description?: string;
  steps: any[];
};

export async function loadSkills(): Promise<Skill[]> {
  const cwd = process.cwd();
  const candidates = [path.join(cwd, '.amp', 'skills'), path.join(os.homedir(), '.amp', 'skills')];
  const skills: Skill[] = [];
  for (const dir of candidates) {
    try {
      const entries = await fs.readdir(dir);
      for (const e of entries) {
        if (!/\.ya?ml$/i.test(e)) continue;
        const full = path.join(dir, e);
        try {
          const raw = await fs.readFile(full, 'utf8');
          const doc = yaml.load(raw) as any;
          if (doc && doc.name && Array.isArray(doc.steps)) skills.push(doc as Skill);
        } catch {}
      }
    } catch {}
  }
  return skills;
}
