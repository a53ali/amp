import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
const execP = promisify(exec);

export type ValidationResult = {
  passed: boolean;
  output: string;
  command: string | null;
};

export async function runValidation(profile: any, cwd: string = process.cwd()): Promise<ValidationResult> {
  // Run type checker -> linter -> tests
  const steps: { name: string; cmd: string }[] = [];
  if (profile.typeChecker) steps.push({ name: 'typecheck', cmd: profile.typeChecker });
  if (profile.lintCommand) steps.push({ name: 'linter', cmd: profile.lintCommand });
  if (profile.testCommand) steps.push({ name: 'tests', cmd: profile.testCommand });

  for (const step of steps) {
    try {
      const { stdout, stderr } = await execP(step.cmd, { cwd, env: process.env });
      const out = (stdout || '') + (stderr || '');
      // assume success if command exits 0
      continue;
    } catch (err: any) {
      const out = (err.stdout || '') + (err.stderr || '') || String(err);
      return { passed: false, output: out, command: step.cmd };
    }
  }

  return { passed: true, output: 'All checks passed', command: null };
}
