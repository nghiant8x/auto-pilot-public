import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir, hostname } from 'os';

const CONFIG_DIR = join(homedir(), '.autopilot');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const AGENT_VERSION = '2.0.0';

/**
 * Load agent configuration.
 * Priority: ~/.autopilot/config.json > .env variables
 */
export function loadConfig() {
  // Try loading from config file first
  if (existsSync(CONFIG_FILE)) {
    try {
      const raw = readFileSync(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(raw);
      return {
        supabaseUrl: config.supabase_url || process.env.SUPABASE_URL,
        supabaseAnonKey: config.supabase_anon_key,
        supabaseServiceKey: null,
        apiKey: config.api_key,
        projects: config.projects || {},
        machineId: config.machine_id || hostname(),
        machineName: config.machine_name || hostname(),
        version: AGENT_VERSION,
      };
    } catch (e) {
      console.warn(`Warning: Failed to parse ${CONFIG_FILE}: ${e.message}`);
    }
  }

  // Fallback to .env (legacy mode — service key no longer supported)
  return {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY, // deprecated, agent will reject
    apiKey: process.env.AUTOPILOT_API_KEY,
    projects: {},
    machineId: hostname(),
    machineName: hostname(),
    version: AGENT_VERSION,
  };
}

export function getConfigPath() {
  return CONFIG_FILE;
}

export function getConfigDir() {
  return CONFIG_DIR;
}
