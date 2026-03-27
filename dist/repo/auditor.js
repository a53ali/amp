"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRepo = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
function section(raw, name) {
    const marker = `## ${name}`;
    const start = raw.indexOf(marker);
    if (start < 0)
        return '';
    const rest = raw.slice(start + marker.length);
    const next = rest.search(/\n##\s+/);
    return (next >= 0 ? rest.slice(0, next) : rest).trim();
}
function isFilled(text) {
    return text.length > 0 && !/TODO/i.test(text);
}
async function auditRepo() {
    const cwd = process.cwd();
    const agentsPath = path_1.default.join(cwd, 'AGENTS.md');
    let score = 0;
    const details = [];
    try {
        const raw = await promises_1.default.readFile(agentsPath, 'utf8');
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
        }
        else {
            details.push('✗ "What this is" section is empty');
        }
        if (isFilled(arch)) {
            score += 20;
            details.push('✓ "Architecture" section is non-empty');
        }
        else {
            details.push('✗ "Architecture" section is empty');
        }
        if (isFilled(build) && isFilled(test)) {
            score += 20;
            details.push('✓ Build & test commands documented');
        }
        else {
            details.push('✗ Build & test commands missing');
        }
        if (isFilled(lint)) {
            score += 20;
            details.push('✓ Lint & type check commands documented');
        }
        else {
            details.push('✗ Lint & type check commands missing');
        }
        if (isFilled(conventions) && /Language:/i.test(conventions)) {
            score += 20;
            details.push('✓ Conventions section present');
        }
        else {
            details.push('✗ Conventions not filled in');
        }
        if (isFilled(keyFiles)) {
            score += 15;
            details.push('✓ Key files section is non-empty');
        }
        else {
            details.push('✗ Key files not documented');
        }
    }
    catch {
        details.push('✗ AGENTS.md missing');
    }
    return { score: Math.min(score, 100), details };
}
exports.auditRepo = auditRepo;
