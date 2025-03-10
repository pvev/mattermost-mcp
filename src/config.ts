import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MonitoringConfig {
  enabled: boolean;
  schedule: string; // cron format
  channels: string[]; // channel names to monitor
  topics: string[]; // topics to look for
  messageLimit: number; // number of messages to analyze per channel
  stateFilePath: string; // path to store state
  processExistingOnFirstRun: boolean; // whether to process existing messages on first run
  firstRunLimit: number; // number of messages to process on first run
}

export interface Config {
  mattermostUrl: string;
  token: string;
  teamId: string;
  monitoring?: MonitoringConfig;
}

export function loadConfig(): Config {
  try {
    // First try to load from config.local.json
    const localConfigPath = path.resolve(__dirname, '../config.local.json');
    
    // Check if local config exists
    if (fs.existsSync(localConfigPath)) {
      const configData = fs.readFileSync(localConfigPath, 'utf8');
      const config = JSON.parse(configData) as Config;
      
      // Validate required fields
      validateConfig(config);
      return config;
    }
    
    // Fall back to config.json
    const configPath = path.resolve(__dirname, '../config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData) as Config;
    
    // Validate required fields
    validateConfig(config);
    return config;
  } catch (error) {
    console.error('Error loading configuration:', error);
    throw new Error('Failed to load configuration. Please ensure config.json or config.local.json exists and contains valid data.');
  }
}

// Helper function to validate config
function validateConfig(config: Config): void {
  if (!config.mattermostUrl) {
    throw new Error('Missing mattermostUrl in configuration');
  }
  if (!config.token) {
    throw new Error('Missing token in configuration');
  }
  if (!config.teamId) {
    throw new Error('Missing teamId in configuration');
  }
}
