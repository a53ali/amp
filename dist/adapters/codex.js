"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodexAdapter = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execP = (0, util_1.promisify)(child_process_1.exec);
class CodexAdapter {
    constructor() {
        this.name = 'codex';
    }
    async isAvailable() {
        try {
            await execP('which codex');
            return true;
        }
        catch {
            return false;
        }
    }
    async run(prompt) {
        try {
            const { stdout } = await execP(`codex ${JSON.stringify(prompt)}`);
            return stdout;
        }
        catch (err) {
            throw new Error('codex is not installed. Run: npm install -g @openai/codex');
        }
    }
}
exports.CodexAdapter = CodexAdapter;
