import { IAdapter } from './interface';
import { exec } from 'child_process';
import { promisify } from 'util';
const execP = promisify(exec);

export class CodexAdapter implements IAdapter {
  name = 'codex';

  async isAvailable(): Promise<boolean> {
    try {
      await execP('which codex');
      return true;
    } catch {
      return false;
    }
  }

  async run(prompt: string): Promise<string> {
    try {
      const { stdout } = await execP(`codex ${JSON.stringify(prompt)}`);
      return stdout;
    } catch (err: any) {
      throw new Error('codex is not installed. Run: npm install -g @openai/codex');
    }
  }
}
