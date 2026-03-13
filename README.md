# Autopilot Agent

AI-powered task management agent that uses Claude Code CLI to automatically implement tasks (bugs, features, improvements).

## Requirements

- [Node.js](https://nodejs.org/) v18+
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code/overview)
- Git

## Install

```bash
npm install -g autopilot-agent
```

Or clone and run directly:

```bash
git clone https://github.com/nghiant8x/auto-pilot-public.git
cd auto-pilot-public
npm install
```

## Setup

1. Create an account at [auto-pilot-tool.vercel.app](https://auto-pilot-tool.vercel.app)
2. Generate an API key: Profile → API Keys → Generate
3. Run the setup wizard:

```bash
autopilot setup
# or: node setup.js
```

4. Follow the prompts to enter your API key and configure projects.

## Usage

```bash
autopilot start    # Start the agent
autopilot status   # Show configuration
autopilot setup    # Re-run setup wizard
```

## How it works

The agent uses a 3-stage pipeline:

1. **Luna** — Evaluates and refines task requests
2. **Aria** — Reads codebase, implements changes, commits and pushes to a branch
3. **Nova** — Reviews the diff, then merges or creates a PR (configurable per project)

Each stage uses Claude Code CLI (`claude -p`) to perform its work autonomously.

## License

ISC
