"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runValidation = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execP = (0, util_1.promisify)(child_process_1.exec);
async function runValidation(profile, cwd = process.cwd()) {
    // Run type checker -> linter -> tests
    const steps = [];
    if (profile.typeChecker)
        steps.push({ name: 'typecheck', cmd: profile.typeChecker });
    if (profile.lintCommand)
        steps.push({ name: 'linter', cmd: profile.lintCommand });
    if (profile.testCommand)
        steps.push({ name: 'tests', cmd: profile.testCommand });
    for (const step of steps) {
        try {
            const { stdout, stderr } = await execP(step.cmd, { cwd, env: process.env });
            const out = (stdout || '') + (stderr || '');
            // assume success if command exits 0
            continue;
        }
        catch (err) {
            const out = (err.stdout || '') + (err.stderr || '') || String(err);
            return { passed: false, output: out, command: step.cmd };
        }
    }
    return { passed: true, output: 'All checks passed', command: null };
}
exports.runValidation = runValidation;
