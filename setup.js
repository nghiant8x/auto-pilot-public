#!/usr/bin/env node
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createInterface } from 'readline';
import { execSync } from 'child_process';

const CONFIG_DIR = join(homedir(), '.autopilot');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

const SUPABASE_URL = 'https://qjzzjqcbpwftkolaykuc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5xLB8rrLWc2yxzGqsReBHQ_Ptro3cLf';
const API_BASE = `${SUPABASE_URL}/functions/v1`;

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

function printBanner() {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║     🤖 Autopilot Agent Setup         ║');
  console.log('  ║     AI-powered task management       ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
}

/** Call an Edge Function with API key auth */
async function apiCall(apiKey, path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}/${path}`, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

/** Verify a local repo path */
function verifyRepo(repoPath) {
  const results = { exists: false, isGit: false, claudeMd: null };

  if (!existsSync(repoPath)) return results;
  results.exists = true;

  try {
    execSync('git rev-parse --is-inside-work-tree', { cwd: repoPath, encoding: 'utf-8', stdio: 'pipe' });
    results.isGit = true;
  } catch {}

  // Check for CLAUDE.md
  const claudeMdPath = join(repoPath, 'CLAUDE.md');
  if (existsSync(claudeMdPath)) {
    results.claudeMd = claudeMdPath.replace(/\\/g, '/');
  }

  return results;
}

async function main() {
  printBanner();

  // Step 1: Check for existing config
  if (existsSync(CONFIG_FILE)) {
    const overwrite = await ask('  Config already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('  Setup cancelled.');
      rl.close();
      return;
    }
  }

  // ── Step 1: Authentication ──────────────────────────────
  console.log('  Step 1: Authentication\n');

  const hasAccount = await ask('  Do you have an Autopilot account? (y/N): ');
  let apiKey;

  if (hasAccount.toLowerCase() === 'y') {
    // Existing user — enter API key
    console.log('\n  Enter your API key from https://auto-pilot-tool.vercel.app');
    console.log('  (Profile → API Keys → Generate)\n');

    apiKey = await ask('  API key (ap_...): ');
    if (!apiKey.startsWith('ap_')) {
      console.error('  ✗ API key must start with "ap_"');
      rl.close();
      return;
    }
  } else {
    // New user — create account
    console.log('\n  Create a new account:\n');

    const email = await ask('  Email: ');
    if (!email.includes('@')) {
      console.error('  ✗ Invalid email');
      rl.close();
      return;
    }

    const password = await ask('  Password (min 6 chars): ');
    if (password.length < 6) {
      console.error('  ✗ Password must be at least 6 characters');
      rl.close();
      return;
    }

    const displayName = await ask('  Display name: ');

    console.log('  Creating account...');
    try {
      const res = await fetch(`${API_BASE}/agent-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          display_name: displayName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(`  ✗ ${data.error}`);
        rl.close();
        return;
      }
      apiKey = data.api_key;
      console.log('  ✓ Account created!');
      console.log(`  ✓ API key generated: ${apiKey.substring(0, 11)}...\n`);
    } catch (e) {
      console.error(`  ✗ Failed to create account: ${e.message}`);
      rl.close();
      return;
    }
  }

  // Verify API key by fetching projects
  console.log('  Verifying API key...');
  let existingProjects = [];
  let existingConfigs = [];
  try {
    const data = await apiCall(apiKey, 'agent-projects');
    existingProjects = data.projects || [];
    existingConfigs = data.configs || [];
    console.log('  ✓ API key verified!\n');
  } catch (e) {
    console.error(`  ✗ Invalid API key or connection failed: ${e.message}`);
    rl.close();
    return;
  }

  // ── Step 2: Check Claude CLI ────────────────────────────
  console.log('  Step 2: Claude CLI');
  try {
    const version = execSync('claude --version', { encoding: 'utf-8' }).trim();
    console.log(`  ✓ Claude CLI found: ${version}\n`);
  } catch {
    console.error('  ✗ Claude CLI not found. Install from https://docs.anthropic.com/en/docs/claude-code/overview');
    console.error('    The agent requires Claude CLI to run.\n');
    const cont = await ask('  Continue anyway? (y/N): ');
    if (cont.toLowerCase() !== 'y') {
      rl.close();
      return;
    }
    console.log('');
  }

  // ── Step 3: Project Configuration ───────────────────────
  console.log('  Step 3: Projects\n');

  // Show existing projects
  if (existingProjects.length > 0) {
    console.log('  Your projects:');
    for (let i = 0; i < existingProjects.length; i++) {
      const p = existingProjects[i];
      const config = existingConfigs.find(c => c.project_id === p.id);
      const status = config ? `✓ ${config.repo_path}` : '⚠ not configured';
      console.log(`    ${i + 1}. ${p.name} [${p.role}] — ${status}`);
    }
    console.log('');
  }

  const localProjects = {};

  // Configure existing projects
  if (existingProjects.length > 0) {
    const configExisting = await ask('  Configure existing projects? (Y/n): ');
    if (configExisting.toLowerCase() !== 'n') {
      for (const p of existingProjects) {
        const config = existingConfigs.find(c => c.project_id === p.id);
        const currentPath = config?.repo_path || '';

        console.log(`\n  ── ${p.name} ──`);
        const repoPath = await ask(`  Repo path${currentPath ? ` [${currentPath}]` : ''}: `);
        const finalPath = repoPath.trim() || currentPath;

        if (!finalPath) {
          console.log('  Skipped (no path).');
          continue;
        }

        // Verify repo
        const check = verifyRepo(finalPath);
        if (!check.exists) {
          console.log(`  ⚠ Path "${finalPath}" does not exist.`);
          const cont = await ask('  Continue anyway? (y/N): ');
          if (cont.toLowerCase() !== 'y') continue;
        } else {
          console.log(`  ✓ Path exists${check.isGit ? ', git repo' : ', NOT a git repo'}${check.claudeMd ? ', CLAUDE.md found' : ''}`);
        }

        const claudeMd = check.claudeMd || (await ask('  CLAUDE.md path (Enter to skip): ')).trim() || null;
        const currentBehavior = config?.commit_behavior || 'pr_only';
        const behavior = await ask(`  Commit behavior [merge/pr_only] (${currentBehavior}): `);
        const commitBehavior = behavior.trim() === 'merge' ? 'merge' : (behavior.trim() === 'pr_only' ? 'pr_only' : currentBehavior);

        // Sync config to server
        try {
          await apiCall(apiKey, 'agent-projects', 'PUT', {
            project_id: p.id,
            repo_path: finalPath.replace(/\\/g, '/'),
            claude_md_path: claudeMd,
            commit_behavior: commitBehavior,
            enabled: true,
          });
          console.log('  ✓ Config synced!');
        } catch (e) {
          console.log(`  ⚠ Sync failed: ${e.message}`);
        }

        localProjects[p.id] = {
          name: p.name,
          repo_path: finalPath.replace(/\\/g, '/'),
          claude_md_path: claudeMd,
          commit_behavior: commitBehavior,
          auto_deploy: commitBehavior === 'merge',
          enabled: true,
        };
      }
    }
  }

  // Create new projects
  console.log('\n  ── New Projects ──');
  console.log('  Add new projects. Type "done" when finished.\n');

  while (true) {
    const name = await ask('  Project name (or "done"): ');
    if (name.toLowerCase() === 'done' || !name.trim()) break;

    const description = await ask('  Description (optional): ');
    const repoPath = await ask('  Local repo path: ');

    if (!repoPath.trim()) {
      console.log('  ✗ Repo path is required for new projects.');
      continue;
    }

    // Verify repo
    const check = verifyRepo(repoPath);
    if (!check.exists) {
      console.log(`  ⚠ Path "${repoPath}" does not exist.`);
      const cont = await ask('  Continue anyway? (y/N): ');
      if (cont.toLowerCase() !== 'y') continue;
    } else {
      if (!check.isGit) {
        console.log('  ⚠ Not a git repository. Agent needs git to create branches and commits.');
        const cont = await ask('  Continue anyway? (y/N): ');
        if (cont.toLowerCase() !== 'y') continue;
      } else {
        console.log(`  ✓ Git repo verified${check.claudeMd ? ', CLAUDE.md found' : ''}`);
      }
    }

    // Test git remote
    if (check.isGit) {
      try {
        const remote = execSync('git remote get-url origin', { cwd: repoPath, encoding: 'utf-8', stdio: 'pipe' }).trim();
        console.log(`  ✓ Remote: ${remote}`);
      } catch {
        console.log('  ⚠ No git remote configured. Agent may not be able to push.');
      }
    }

    const claudeMd = check.claudeMd || (await ask('  CLAUDE.md path (Enter to skip): ')).trim() || null;
    const behavior = await ask('  Commit behavior [merge/pr_only] (default: pr_only): ');
    const commitBehavior = behavior.trim() === 'merge' ? 'merge' : 'pr_only';

    // Create project on server
    console.log('  Creating project...');
    try {
      const { project } = await apiCall(apiKey, 'agent-projects', 'POST', {
        name: name.trim(),
        description: description.trim() || null,
        repo_path: repoPath.replace(/\\/g, '/'),
        claude_md_path: claudeMd,
        commit_behavior: commitBehavior,
      });

      localProjects[project.id] = {
        name: project.name,
        repo_path: repoPath.replace(/\\/g, '/'),
        claude_md_path: claudeMd,
        commit_behavior: commitBehavior,
        auto_deploy: commitBehavior === 'merge',
        enabled: true,
      };

      console.log(`  ✓ Project "${project.name}" created! (${project.id.slice(0, 8)}...)\n`);
    } catch (e) {
      console.log(`  ✗ Failed to create project: ${e.message}\n`);
    }
  }

  // ── Step 4: Save local config ───────────────────────────
  mkdirSync(CONFIG_DIR, { recursive: true });

  const configData = {
    supabase_url: SUPABASE_URL,
    supabase_anon_key: SUPABASE_ANON_KEY,
    api_key: apiKey,
    projects: localProjects,
  };

  writeFileSync(CONFIG_FILE, JSON.stringify(configData, null, 2));
  console.log(`\n  ✓ Config saved to ${CONFIG_FILE}`);

  // ── Summary ─────────────────────────────────────────────
  const projectCount = Object.keys(localProjects).length;
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║     Setup Complete! 🎉               ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
  console.log(`  Projects configured: ${projectCount}`);
  for (const [id, p] of Object.entries(localProjects)) {
    console.log(`    ${p.name} → ${p.repo_path} (${p.commit_behavior})`);
  }
  console.log('');
  console.log('  To start the agent:');
  console.log('    autopilot start');
  console.log('');

  rl.close();
}

main().catch((e) => {
  console.error('Setup error:', e.message);
  rl.close();
  process.exit(1);
});
