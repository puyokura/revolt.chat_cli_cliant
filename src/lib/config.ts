import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_PATH = path.join(os.homedir(), '.revolt-cli-config.json');

export interface Config {
  token?: string;
  lastServerId?: string;
  lastChannelId?: string;
}

export function readConfig(): Config {
  if (fs.existsSync(CONFIG_PATH)) {
    const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
    try {
      return JSON.parse(content);
    } catch (e) {
      return {};
    }
  }
  return {};
}

export function writeConfig(config: Config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function clearConfig() {
    if (fs.existsSync(CONFIG_PATH)) {
        fs.unlinkSync(CONFIG_PATH);
    }
}