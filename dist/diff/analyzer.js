"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeLastDiff = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execP = (0, util_1.promisify)(child_process_1.exec);
async function analyzeLastDiff() {
    try {
        // numstat gives: added\tremoved\tpath
        const { stdout } = await execP('git diff --numstat HEAD');
        const lines = stdout.trim().split('\n').filter(Boolean);
        let totalAdd = 0;
        let totalRem = 0;
        const files = [];
        for (const l of lines) {
            const parts = l.split('\t');
            if (parts.length < 3)
                continue;
            const added = Number(parts[0]) || 0;
            const removed = Number(parts[1]) || 0;
            const p = parts[2];
            totalAdd += added;
            totalRem += removed;
            files.push({ path: p, added, removed });
        }
        // classify risk
        let risk = 'LOW';
        if (files.some(f => /auth|password|secret|config|migration|db/i.test(f.path)))
            risk = 'HIGH';
        else if (files.some(f => /\.ts$|\.js$|\.py$/.test(f.path) && (f.added + f.removed) > 20))
            risk = 'MEDIUM';
        const summary = `Changes: +${totalAdd} −${totalRem} across ${files.length} files`;
        return { added: totalAdd, removed: totalRem, files, risk, summary };
    }
    catch (err) {
        return { added: 0, removed: 0, files: [], risk: 'LOW', summary: 'No diff available' };
    }
}
exports.analyzeLastDiff = analyzeLastDiff;
