import { IAdapter } from './interface';
import { exec } from 'child_process';
import { promisify } from 'util';
const execP = promisify(exec);

export class CopilotAdapter implements IAdapter {
  name = 'copilot';

  async isAvailable(): Promise<boolean> {
    try {
      await execP('gh copilot --version');
      return true;
    } catch {
      return false;
    }
  }

  async run(prompt: string): Promise<string> {
    try {
      // using -t shell to request shell/diff-friendly output per plan
      const cmd = `gh copilot suggest -t shell ${JSON.stringify(prompt)}`;
      const { stdout } = await execP(cmd);
      return stdout;
    } catch (err: any) {
      throw new Error('gh copilot is not installed. Run: gh extension install github/gh-copilot');
    }
  }
}
