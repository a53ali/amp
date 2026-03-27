"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopilotAdapter = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execP = (0, util_1.promisify)(child_process_1.exec);
class CopilotAdapter {
    constructor() {
        this.name = 'copilot';
    }
    async isAvailable() {
        try {
            await execP('gh copilot --version');
            return true;
        }
        catch {
            return false;
        }
    }
    async run(prompt) {
        try {
            // using -t shell to request shell/diff-friendly output per plan
            const cmd = `gh copilot suggest -t shell ${JSON.stringify(prompt)}`;
            const { stdout } = await execP(cmd);
            return stdout;
        }
        catch (err) {
            throw new Error('gh copilot is not installed. Run: gh extension install github/gh-copilot');
        }
    }
}
exports.CopilotAdapter = CopilotAdapter;
