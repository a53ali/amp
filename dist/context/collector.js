"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectRepoContext = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const execP = (0, util_1.promisify)(child_process_1.exec);
async function collectRepoContext() {
    let branch = 'unknown';
    let recentCommits = [];
    let recentDiff = '';
    let fileTree = '';
    let agentsMd = null;
    try {
        const { stdout: b } = await execP('git rev-parse --abbrev-ref HEAD');
        branch = b.trim();
        const { stdout: commits } = await execP('git log --oneline -10');
        recentCommits = commits.trim().split('\n').filter(Boolean);
        const { stdout: diff } = await execP('git diff HEAD~1 --stat');
        recentDiff = diff.trim();
        const { stdout: tree } = await execP('git ls-files | head -n 50');
        fileTree = tree.trim();
    }
    catch {
        // not a git repo or git unavailable — keep defaults
    }
    try {
        const p = path_1.default.resolve(process.cwd(), 'AGENTS.md');
        const raw = await promises_1.default.readFile(p, 'utf8');
        agentsMd = raw;
    }
    catch {
        agentsMd = null;
    }
    return { branch, recentCommits, recentDiff, fileTree, agentsMd };
}
exports.collectRepoContext = collectRepoContext;
