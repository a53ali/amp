"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setConfig = exports.getConfig = exports.ensureConfig = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const CONFIG_PATH = path_1.default.join(os_1.default.homedir(), '.amp', 'config.json');
const DEFAULT = {
    backend: 'codex',
    maxRetries: 3,
    validate: true,
};
async function ensureConfig() {
    const dir = path_1.default.dirname(CONFIG_PATH);
    try {
        await promises_1.default.mkdir(dir, { recursive: true });
    }
    catch { }
    try {
        await promises_1.default.access(CONFIG_PATH);
    }
    catch {
        await promises_1.default.writeFile(CONFIG_PATH, JSON.stringify(DEFAULT, null, 2), 'utf8');
    }
}
exports.ensureConfig = ensureConfig;
async function getConfig() {
    try {
        await ensureConfig();
        const raw = await promises_1.default.readFile(CONFIG_PATH, 'utf8');
        return JSON.parse(raw);
    }
    catch (err) {
        return DEFAULT;
    }
}
exports.getConfig = getConfig;
async function setConfig(key, value) {
    const cfg = await getConfig();
    // coerce numeric
    if (typeof cfg[key] === 'number') {
        const n = Number(value);
        cfg[key] = Number.isNaN(n) ? cfg[key] : n;
    }
    else if (typeof cfg[key] === 'boolean') {
        cfg[key] = value === 'false' ? false : Boolean(value);
    }
    else {
        cfg[key] = value;
    }
    await promises_1.default.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}
exports.setConfig = setConfig;
