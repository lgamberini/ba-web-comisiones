const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const rootEnvPath = path.join(rootDir, '.env');
const backDir = path.join(rootDir, 'back');
const frontDir = path.join(rootDir, 'front');
const backEnvPath = path.join(backDir, '.env');

const processes = [];
let isShuttingDown = false;

function ensureBackEnv() {
  if (fs.existsSync(backEnvPath)) {
    return;
  }

  if (fs.existsSync(rootEnvPath)) {
    fs.copyFileSync(rootEnvPath, backEnvPath);
    console.log('[dev-local] Se copio .env de la raiz hacia back/.env');
    return;
  }

  throw new Error(
    'No existe back/.env ni .env en la raiz. Crea alguno de esos archivos antes de ejecutar dev-local.'
  );
}

function prefixStream(stream, label) {
  let buffer = '';

  stream.on('data', chunk => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';

    lines.forEach(line => {
      if (line.trim().length) {
        console.log(`[${label}] ${line}`);
      }
    });
  });

  stream.on('end', () => {
    if (buffer.trim().length) {
      console.log(`[${label}] ${buffer}`);
    }
  });
}

function startProcess(label, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    stdio: ['inherit', 'pipe', 'pipe']
  });

  processes.push(child);
  prefixStream(child.stdout, label);
  prefixStream(child.stderr, `${label}:error`);

  child.on('exit', code => {
    if (isShuttingDown) {
      return;
    }

    if (code !== 0) {
      console.error(`[${label}] termino con codigo ${code}`);
      shutdown(code || 1);
    }
  });

  child.on('error', error => {
    console.error(`[${label}] no pudo iniciar: ${error.message}`);
    shutdown(1);
  });

  return child;
}

function shutdown(exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log('[dev-local] Cerrando procesos...');

  processes.forEach(child => {
    if (!child.killed) {
      child.kill('SIGINT');
    }
  });

  setTimeout(() => process.exit(exitCode), 300);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

try {
  ensureBackEnv();
} catch (error) {
  console.error(`[dev-local] ${error.message}`);
  process.exit(1);
}

console.log('[dev-local] Iniciando backend en http://127.0.0.1:3000');
console.log('[dev-local] Iniciando frontend en http://127.0.0.1:5500');

startProcess('back', 'npm', ['start'], backDir);
startProcess('front', 'python3', ['-m', 'http.server', '5500'], frontDir);
