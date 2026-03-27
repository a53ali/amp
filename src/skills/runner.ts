import { Skill } from './loader';
import { getConfig } from '../config/index';
import { compilePrompt } from '../context/compiler';
import { analyzeRepo } from '../repo/analyzer';
import { CodexAdapter } from '../adapters/codex';
import { CopilotAdapter } from '../adapters/copilot';
import { exec } from 'child_process';
import { promisify } from 'util';
const execP = promisify(exec);

async function getAdapter(name?: string) {
  if (!name) {
    const cfg = await getConfig();
    name = cfg.backend;
  }
  if (name === 'codex') return new CodexAdapter();
  if (name === 'copilot') return new CopilotAdapter();
  throw new Error(`Unknown backend: ${name}`);
}

export async function runSkill(skill: Skill, task: string) {
  let prev = '';
  const outputs: string[] = [];
  const profile = await analyzeRepo();
  for (const step of skill.steps) {
    if (step.prompt) {
      const prompt = step.prompt.replace(/{{task}}/g, task).replace(/{{prev}}/g, prev || '');
      const via = step.via || undefined;
      const adapter = await getAdapter(via);
      if (!(await adapter.isAvailable())) throw new Error(`${adapter.name} not available`);
      const out = await adapter.run(prompt);
      outputs.push(out);
      prev = out;
    } else if (step.run) {
      try {
        const { stdout, stderr } = await execP(step.run, { env: process.env });
        const out = (stdout || '') + (stderr || '');
        outputs.push(out);
        prev = out;
      } catch (err: any) {
        throw new Error(`Step command failed: ${err}`);
      }
    }
  }
  return outputs.join('\n---\n');
}
