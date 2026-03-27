"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSync = exports.initSync = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const STATE_DIR = path_1.default.join(process.env.HOME || '.', '.amp');
const STATE_FILE = path_1.default.join(STATE_DIR, 'sync-state.json');
async function hashFile(filePath) {
    try {
        const data = await promises_1.default.readFile(filePath);
        return crypto_1.default.createHash('md5').update(data).digest('hex');
    }
    catch {
        return null;
    }
}
function trackedFiles(cwd) {
    const files = new Set(['package.json', 'tsconfig.json']);
    try {
        for (const entry of (0, fs_1.readdirSync)(cwd, { withFileTypes: true })) {
            if (!entry.isFile())
                continue;
            if (/\.config\.[cm]?[jt]s$/.test(entry.name) ||
                entry.name === 'Makefile' ||
                entry.name === 'pyproject.toml' ||
                entry.name === 'requirements.txt' ||
                entry.name === 'go.mod' ||
                entry.name === 'Cargo.toml') {
                files.add(entry.name);
            }
        }
    }
    catch {
        // ignore
    }
    return Array.from(files);
}
async function initSync() {
    const cwd = process.cwd();
    const files = trackedFiles(cwd);
    const hashes = {};
    for (const file of files) {
        hashes[file] = await hashFile(path_1.default.join(cwd, file));
    }
    await promises_1.default.mkdir(STATE_DIR, { recursive: true }).catch(() => { });
    await promises_1.default.writeFile(STATE_FILE, JSON.stringify({ timestamp: Date.now(), hashes }, null, 2), 'utf8');
}
exports.initSync = initSync;
async function checkSync() {
    const cwd = process.cwd();
    try {
        const raw = await promises_1.default.readFile(STATE_FILE, 'utf8');
        const state = JSON.parse(raw);
        const files = Object.keys(state.hashes || {});
        let changed = false;
        for (const file of files) {
            const hash = await hashFile(path_1.default.join(cwd, file));
            if (hash !== state.hashes?.[file]) {
                changed = true;
            }
        }
        if (changed) {
            return { stale: true, message: 'package.json or another tracked file changed since last init — AGENTS.md may be stale. Run `amp init --update` to refresh.' };
        }
        return { stale: false, message: 'Context files unchanged since last init' };
    }
    catch {
        return { stale: true, message: 'No sync state found — run amp init to create it' };
    }
}
exports.checkSync = checkSync;
