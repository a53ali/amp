import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const CONFIG_PATH = path.join(os.homedir(), '.amp', 'config.json');
const DEFAULT = {
  backend: 'codex',
  maxRetries: 3,
  validate: true,
};

export async function ensureConfig(): Promise<void> {
  const dir = path.dirname(CONFIG_PATH);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}
  try {
    await fs.access(CONFIG_PATH);
  } catch {
    await fs.writeFile(CONFIG_PATH, JSON.stringify(DEFAULT, null, 2), 'utf8');
  }
}

export async function getConfig(): Promise<any> {
  try {
    await ensureConfig();
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return DEFAULT;
  }
}

export async function setConfig(key: string, value: any): Promise<void> {
  const cfg = await getConfig();
  // coerce numeric
  if (typeof cfg[key] === 'number') {
    const n = Number(value);
    cfg[key] = Number.isNaN(n) ? cfg[key] : n;
  } else if (typeof cfg[key] === 'boolean') {
    cfg[key] = value === 'false' ? false : Boolean(value);
  } else {
    cfg[key] = value;
  }
  await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}
