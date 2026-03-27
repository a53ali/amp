import fs from 'fs/promises';
import path from 'path';

export type RepoProfile = {
  language: 'typescript' | 'javascript' | 'python' | 'go' | 'rust' | 'unknown';
  framework: string | null;
  buildCommand: string | null;
  testRunner: string | null;
  testCommand: string | null;
  linter: string | null;
  lintCommand: string | null;
  typeChecker: string | null;
  packageManager: string | null;
  entryFile: string | null;
};

type JsonRecord = Record<string, unknown>;

function safeJson(raw: string): JsonRecord | null {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as JsonRecord) : null;
  } catch {
    return null;
  }
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath: string): Promise<JsonRecord | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return safeJson(raw);
  } catch {
    return null;
  }
}

function scriptsOf(pkg: JsonRecord | null): JsonRecord | null {
  if (!pkg || typeof pkg.scripts !== 'object' || pkg.scripts === null) return null;
  return pkg.scripts as JsonRecord;
}

function scriptCommand(scripts: JsonRecord | null, names: string[]): string | null {
  if (!scripts) return null;
  for (const name of names) {
    const value = scripts[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function dependencyNames(pkg: JsonRecord | null): string[] {
  const deps = pkg && typeof pkg.dependencies === 'object' && pkg.dependencies !== null ? pkg.dependencies as JsonRecord : {};
  const devDeps = pkg && typeof pkg.devDependencies === 'object' && pkg.devDependencies !== null ? pkg.devDependencies as JsonRecord : {};
  return Object.keys({ ...deps, ...devDeps });
}

export async function analyzeRepo(): Promise<RepoProfile> {
  const cwd = process.cwd();

  let language: RepoProfile['language'] = 'unknown';
  let framework: string | null = null;
  let buildCommand: string | null = null;
  let testRunner: string | null = null;
  let testCommand: string | null = null;
  let linter: string | null = null;
  let lintCommand: string | null = null;
  let typeChecker: string | null = null;
  let packageManager: string | null = null;
  let entryFile: string | null = null;

  const pkg = await readJson(path.join(cwd, 'package.json'));
  const scripts = scriptsOf(pkg);

  if (pkg) {
    language = 'javascript';
    const hasTsconfig = await exists(path.join(cwd, 'tsconfig.json'));
    const deps = dependencyNames(pkg);

    if (hasTsconfig) {
      language = 'typescript';
      typeChecker = scriptCommand(scripts, ['typecheck']) || 'tsc --noEmit';
    }

    if (deps.some(dep => /next/i.test(dep))) framework = 'nextjs';
    else if (deps.some(dep => /express/i.test(dep))) framework = 'express';
    else if (deps.some(dep => /react/i.test(dep))) framework = 'react';

    buildCommand = scriptCommand(scripts, ['build']) || (hasTsconfig ? 'tsc' : null);
    testCommand = scriptCommand(scripts, ['test', 'test:ci']) || null;
    lintCommand = scriptCommand(scripts, ['lint']) || null;

    if (deps.some(dep => /vitest/i.test(dep))) {
      testRunner = 'vitest';
      testCommand = testCommand || 'vitest run';
    } else if (deps.some(dep => /jest/i.test(dep))) {
      testRunner = 'jest';
      testCommand = testCommand || 'jest';
    }

    if (deps.some(dep => /eslint/i.test(dep))) {
      linter = 'eslint';
      lintCommand = lintCommand || 'eslint .';
    }

    if (!buildCommand && language === 'typescript') buildCommand = 'tsc';
    if (!testCommand && pkg.scripts && typeof pkg.scripts === 'object') testCommand = 'npm test';
    if (!lintCommand && linter) lintCommand = 'npm run lint';
    if (!typeChecker && language === 'typescript') typeChecker = 'tsc --noEmit';

    if (typeof pkg.main === 'string') entryFile = pkg.main;
    if (typeof pkg.module === 'string' && !entryFile) entryFile = pkg.module;
    if (typeof pkg.bin === 'string' && !entryFile) entryFile = pkg.bin;
    if (pkg.bin && typeof pkg.bin === 'object') {
      const values = Object.values(pkg.bin as JsonRecord).filter((value): value is string => typeof value === 'string');
      if (!entryFile && values.length > 0) entryFile = values[0];
    }

    if (await exists(path.join(cwd, 'pnpm-lock.yaml'))) packageManager = 'pnpm';
    else if (await exists(path.join(cwd, 'yarn.lock'))) packageManager = 'yarn';
    else if (await exists(path.join(cwd, 'package-lock.json'))) packageManager = 'npm';
    else packageManager = 'npm';
  }

  if (await exists(path.join(cwd, 'pyproject.toml')) || await exists(path.join(cwd, 'requirements.txt'))) {
    language = 'python';
    packageManager = packageManager || 'pip';
    if (await exists(path.join(cwd, 'pyproject.toml'))) {
      const pyproject = await fs.readFile(path.join(cwd, 'pyproject.toml'), 'utf8').catch(() => '');
      if (/pytest/i.test(pyproject)) {
        testRunner = testRunner || 'pytest';
        testCommand = testCommand || 'pytest';
      }
      if (/ruff/i.test(pyproject)) {
        linter = linter || 'ruff';
        lintCommand = lintCommand || 'ruff check .';
      }
      if (/mypy/i.test(pyproject)) {
        typeChecker = typeChecker || 'mypy .';
      }
    }
    if (await exists(path.join(cwd, 'requirements.txt')) && !testCommand) {
      testRunner = testRunner || 'pytest';
      testCommand = 'pytest';
    }
  }

  if (await exists(path.join(cwd, 'go.mod'))) {
    language = 'go';
    buildCommand = buildCommand || 'go build ./...';
    testRunner = 'go test';
    testCommand = 'go test ./...';
    lintCommand = lintCommand || 'golangci-lint run';
    typeChecker = typeChecker || 'go test ./...';
    packageManager = 'go mod';
  }

  if (await exists(path.join(cwd, 'Cargo.toml'))) {
    language = 'rust';
    buildCommand = buildCommand || 'cargo build';
    testRunner = 'cargo test';
    testCommand = 'cargo test';
    lintCommand = lintCommand || 'cargo clippy';
    typeChecker = typeChecker || 'cargo check';
    packageManager = 'cargo';
  }

  if (!framework) {
    if (await exists(path.join(cwd, 'next.config.js')) || await exists(path.join(cwd, 'next.config.mjs'))) framework = 'nextjs';
    else if (await exists(path.join(cwd, 'vite.config.ts')) || await exists(path.join(cwd, 'vite.config.js'))) framework = 'vite';
    else if (await exists(path.join(cwd, 'express.js'))) framework = 'express';
  }

  if (!entryFile) {
    const candidates = ['src/index.ts', 'src/index.js', 'index.ts', 'index.js'];
    for (const candidate of candidates) {
      if (await exists(path.join(cwd, candidate))) {
        entryFile = candidate;
        break;
      }
    }
  }

  return {
    language,
    framework,
    buildCommand,
    testRunner,
    testCommand,
    linter,
    lintCommand,
    typeChecker,
    packageManager,
    entryFile,
  };
}
