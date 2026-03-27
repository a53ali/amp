"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSkill = void 0;
const index_1 = require("../config/index");
const analyzer_1 = require("../repo/analyzer");
const codex_1 = require("../adapters/codex");
const copilot_1 = require("../adapters/copilot");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execP = (0, util_1.promisify)(child_process_1.exec);
async function getAdapter(name) {
    if (!name) {
        const cfg = await (0, index_1.getConfig)();
        name = cfg.backend;
    }
    if (name === 'codex')
        return new codex_1.CodexAdapter();
    if (name === 'copilot')
        return new copilot_1.CopilotAdapter();
    throw new Error(`Unknown backend: ${name}`);
}
async function runSkill(skill, task) {
    let prev = '';
    const outputs = [];
    const profile = await (0, analyzer_1.analyzeRepo)();
    for (const step of skill.steps) {
        if (step.prompt) {
            const prompt = step.prompt.replace(/{{task}}/g, task).replace(/{{prev}}/g, prev || '');
            const via = step.via || undefined;
            const adapter = await getAdapter(via);
            if (!(await adapter.isAvailable()))
                throw new Error(`${adapter.name} not available`);
            const out = await adapter.run(prompt);
            outputs.push(out);
            prev = out;
        }
        else if (step.run) {
            try {
                const { stdout, stderr } = await execP(step.run, { env: process.env });
                const out = (stdout || '') + (stderr || '');
                outputs.push(out);
                prev = out;
            }
            catch (err) {
                throw new Error(`Step command failed: ${err}`);
            }
        }
    }
    return outputs.join('\n---\n');
}
exports.runSkill = runSkill;
