"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFromProfile = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
function nonEmptyLines(values) {
    return values.filter((value) => Boolean(value && value.trim()));
}
function fallbackBuild(profile) {
    if (profile.buildCommand)
        return profile.buildCommand;
    if (profile.language === 'typescript')
        return profile.packageManager === 'pnpm' ? 'pnpm run build' : profile.packageManager === 'yarn' ? 'yarn build' : 'npm run build';
    if (profile.language === 'javascript')
        return profile.packageManager === 'pnpm' ? 'pnpm run build' : profile.packageManager === 'yarn' ? 'yarn build' : 'npm run build';
    return null;
}
function fallbackTest(profile) {
    if (profile.testCommand)
        return profile.testCommand;
    if (profile.language === 'go')
        return 'go test ./...';
    if (profile.language === 'rust')
        return 'cargo test';
    if (profile.language === 'python')
        return 'pytest';
    if (profile.packageManager === 'pnpm')
        return 'pnpm test';
    if (profile.packageManager === 'yarn')
        return 'yarn test';
    if (profile.packageManager === 'npm')
        return 'npm test';
    return null;
}
function fallbackLint(profile) {
    if (profile.lintCommand)
        return profile.lintCommand;
    if (profile.language === 'go')
        return 'golangci-lint run';
    if (profile.language === 'rust')
        return 'cargo clippy';
    if (profile.language === 'python')
        return 'ruff check .';
    if (profile.packageManager === 'pnpm')
        return 'pnpm run lint';
    if (profile.packageManager === 'yarn')
        return 'yarn lint';
    if (profile.packageManager === 'npm')
        return 'npm run lint';
    return null;
}
async function generateFromProfile(profile, options = {}) {
    const cwd = process.cwd();
    const agentsPath = path_1.default.join(cwd, 'AGENTS.md');
    const keyFiles = [
        'package.json',
        'tsconfig.json',
        'src/index.ts',
        'src/repo/analyzer.ts',
        'src/repo/generator.ts',
        'src/repo/auditor.ts',
    ];
    if (profile.entryFile && !keyFiles.includes(profile.entryFile))
        keyFiles.unshift(profile.entryFile);
    const buildLines = nonEmptyLines([
        fallbackBuild(profile),
        profile.typeChecker,
    ]);
    const testLines = nonEmptyLines([fallbackTest(profile)]);
    const lintLines = nonEmptyLines([fallbackLint(profile)]);
    const content = [
        '# Project Context',
        '',
        '## What this is',
        `This repository appears to be a ${profile.language} project${profile.framework ? ` using ${profile.framework}` : ''}.`,
        '',
        '## Architecture',
        'Key files and directories are documented below so AI tools can navigate the codebase safely.',
        '',
        '## Build & Run',
        '```',
        ...buildLines,
        '```',
        '',
        '## Test',
        '```',
        ...testLines,
        '```',
        '',
        '## Lint & Type Check',
        '```',
        ...lintLines,
        ...(profile.typeChecker ? [profile.typeChecker] : []),
        '```',
        '',
        '## Conventions',
        `- Language: ${profile.language}`,
        `- Framework: ${profile.framework || 'unknown'}`,
        `- Package manager: ${profile.packageManager || 'unknown'}`,
        '',
        '## Key Files',
        ...keyFiles.map(file => `- ${file}`),
    ].join('\n');
    const exists = await promises_1.default.stat(agentsPath).then(() => true).catch(() => false);
    if (exists && !options.update) {
        console.log('AGENTS.md already exists — use --update to overwrite');
    }
    else {
        await promises_1.default.writeFile(agentsPath, content, 'utf8');
        console.log('✓ Generated AGENTS.md — open it and refine the generated sections for best results.');
    }
    const aux = [
        ['.github/copilot-instructions.md', 'See AGENTS.md at the project root for full project context, conventions, and commands.'],
        ['CLAUDE.md', 'See AGENTS.md at the project root for full project context, conventions, and commands.'],
        ['.cursorrules', 'See AGENTS.md at the project root for full project context, conventions, and commands.'],
    ];
    for (const [relativePath, text] of aux) {
        const full = path_1.default.join(cwd, relativePath);
        await promises_1.default.mkdir(path_1.default.dirname(full), { recursive: true }).catch(() => { });
        await promises_1.default.writeFile(full, `${text}\n`, 'utf8');
    }
    return { agentsPath };
}
exports.generateFromProfile = generateFromProfile;
