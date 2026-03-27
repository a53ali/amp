"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.installSkill = void 0;
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const promises_1 = __importDefault(require("fs/promises"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execP = (0, util_1.promisify)(child_process_1.exec);
async function installSkill(userRepo) {
    // Expect user/repo
    const [user, repo] = userRepo.split('/');
    if (!user || !repo)
        throw new Error('Invalid user/repo');
    const url = `https://raw.githubusercontent.com/${user}/${repo}/main/skill.yaml`;
    const destDir = path_1.default.join(os_1.default.homedir(), '.amp', 'skills');
    await promises_1.default.mkdir(destDir, { recursive: true });
    const outPath = path_1.default.join(destDir, `${repo}.yaml`);
    try {
        // Try curl
        await execP(`curl -fsSL ${url} -o ${outPath}`);
        return outPath;
    }
    catch (err) {
        throw new Error(`Failed to fetch skill from ${url}. Please download manually.`);
    }
}
exports.installSkill = installSkill;
