"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSkills = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const yaml = require('js-yaml');
async function loadSkills() {
    const cwd = process.cwd();
    const candidates = [path_1.default.join(cwd, '.amp', 'skills'), path_1.default.join(os_1.default.homedir(), '.amp', 'skills')];
    const skills = [];
    for (const dir of candidates) {
        try {
            const entries = await promises_1.default.readdir(dir);
            for (const e of entries) {
                if (!/\.ya?ml$/i.test(e))
                    continue;
                const full = path_1.default.join(dir, e);
                try {
                    const raw = await promises_1.default.readFile(full, 'utf8');
                    const doc = yaml.load(raw);
                    if (doc && doc.name && Array.isArray(doc.steps))
                        skills.push(doc);
                }
                catch { }
            }
        }
        catch { }
    }
    return skills;
}
exports.loadSkills = loadSkills;
