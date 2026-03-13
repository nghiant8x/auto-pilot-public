#!/usr/bin/env node

const command = process.argv[2];

switch (command) {
  case 'setup':
    await import('./setup.js');
    break;
  case 'start':
    await import('./index.js');
    break;
  case 'status': {
    const { loadConfig, getConfigPath } = await import('./config.js');
    const config = loadConfig();
    console.log('Autopilot Agent Status');
    console.log('─────────────────────');
    console.log(`Config: ${getConfigPath()}`);
    console.log(`Auth: ${config.apiKey ? 'API Key' : config.supabaseServiceKey ? 'Service Key' : 'Not configured'}`);
    console.log(`Projects: ${Object.keys(config.projects).length}`);
    for (const [id, proj] of Object.entries(config.projects)) {
      console.log(`  ${id.slice(0, 8)}... → ${proj.repo_path} (${proj.commit_behavior})`);
    }
    break;
  }
  default:
    console.log('Autopilot Agent CLI');
    console.log('');
    console.log('Usage:');
    console.log('  autopilot setup    Interactive setup wizard');
    console.log('  autopilot start    Start the agent');
    console.log('  autopilot status   Show current configuration');
    console.log('');
}
