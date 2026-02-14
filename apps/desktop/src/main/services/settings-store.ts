import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const settingsPath = path.join(app.getPath('userData'), 'settings.json');

let cache: Record<string, any> | null = null;

function load(): Record<string, any> {
  if (cache) return cache;
  try {
    const data = fs.readFileSync(settingsPath, 'utf-8');
    cache = JSON.parse(data);
    return cache!;
  } catch {
    cache = {};
    return cache;
  }
}

function save(settings: Record<string, any>) {
  cache = settings;
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
}

export function getSettings(): Record<string, any> {
  return load();
}

export function setSetting(key: string, value: any): void {
  const settings = load();
  settings[key] = value;
  save(settings);
}
