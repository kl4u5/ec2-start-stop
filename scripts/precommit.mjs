#!/usr/bin/env node

const { spawn } = require('child_process');
const { platform } = require('os');

const isWindows = platform() === 'win32';

// ANSI color codes for better output
const colors = {
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const cmd = isWindows && command === 'pnpm' ? 'pnpm.cmd' : command;
    const child = spawn(cmd, args, {
      stdio: options.silent ? 'pipe' : 'inherit',
      shell: isWindows,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function runPreCommitChecks() {
  log('\n🔍 Running pre-commit checks...', colors.bold);
  log('');

  const steps = [
    {
      name: '📝 1/5 Formatting code with Prettier...',
      command: 'pnpm',
      args: ['run', 'format']
    },
    {
      name: '🔧 2/5 Fixing ESLint issues...',
      command: 'pnpm',
      args: ['run', 'lint:fix']
    },
    {
      name: '🏗️  3/5 Building all projects...',
      command: 'pnpm',
      args: ['run', 'build:all']
    },
    {
      name: '🧪 4/5 Running tests...',
      command: 'pnpm',
      args: ['run', 'test']
    }
  ];

  try {
    for (const step of steps) {
      log(step.name, colors.blue);
      await runCommand(step.command, step.args, { silent: true });
    }

    log('✅ 5/5 All checks passed!', colors.green);
    log('');
    log('🚀 Ready to commit! All formatting, linting, building, and testing completed successfully.', colors.green + colors.bold);
    log('');

    process.exit(0);
  } catch (error) {
    log('');
    log('❌ Pre-commit checks failed!', colors.red + colors.bold);
    log('Fix the issues above and try again.', colors.red);
    log('');
    log('💡 Tip: Run "pnpm run fix" to auto-fix formatting and linting issues.', colors.yellow);
    log('');

    process.exit(1);
  }
}

runPreCommitChecks();
