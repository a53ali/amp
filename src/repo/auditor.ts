import fs from 'fs/promises';
import path from 'path';

export type AuditResult = {
  score: number;
  details: string[];
};

function section(raw: string, name: string): string {
  const marker = `## ${name}`;
  const start = raw.indexOf(marker);
  if (start < 0) return '';
  const rest = raw.slice(start + marker.length);
  const next = rest.search(/\n##\s+/);
  return (next >= 0 ? rest.slice(0, next) : rest).trim();
}

function isFilled(text: string): boolean {
  return text.length > 0 && !/TODO/i.test(text);
}

export async function auditRepo(): Promise<AuditResult> {
  const cwd = process.cwd();
  const agentsPath = path.join(cwd, 'AGENTS.md');
  let score = 0;
  const details: string[] = [];

  try {
    const raw = await fs.readFile(agentsPath, 'utf8');
    score += 10;
    details.push('✓ AGENTS.md exists');

    const what = section(raw, 'What this is');
    const arch = section(raw, 'Architecture');
    const build = section(raw, 'Build & Run');
    const test = section(raw, 'Test');
    const lint = section(raw, 'Lint & Type Check');
    const conventions = section(raw, 'Conventions');
    const keyFiles = section(raw, 'Key Files');

    if (isFilled(what)) {
      score += 15;
      details.push('✓ "What this is" section is non-empty');
    } else {
      details.push('✗ "What this is" section is empty');
    }

    if (isFilled(arch)) {
      score += 20;
      details.push('✓ "Architecture" section is non-empty');
    } else {
      details.push('✗ "Architecture" section is empty');
    }

    if (isFilled(build) && isFilled(test)) {
      score += 20;
      details.push('✓ Build & test commands documented');
    } else {
      details.push('✗ Build & test commands missing');
    }

    if (isFilled(lint)) {
      score += 20;
      details.push('✓ Lint & type check commands documented');
    } else {
      details.push('✗ Lint & type check commands missing');
    }

    if (isFilled(conventions) && /Language:/i.test(conventions)) {
      score += 20;
      details.push('✓ Conventions section present');
    } else {
      details.push('✗ Conventions not filled in');
    }

    if (isFilled(keyFiles)) {
      score += 15;
      details.push('✓ Key files section is non-empty');
    } else {
      details.push('✗ Key files not documented');
    }
  } catch {
    details.push('✗ AGENTS.md missing');
  }

  return { score: Math.min(score, 100), details };
}
