import { spawn } from 'node:child_process';
const command = process.argv[2] === 'start' ? 'start' : 'build';
const child = spawn(
  process.execPath,
  [
    'node_modules/next/dist/bin/next',
    command,
    'apps/web',
    ...(command === 'start' ? ['--hostname', '0.0.0.0', '--port', process.env.PORT ?? '3000'] : []),
  ],
  { stdio: 'inherit', env: { ...process.env, SIGNAL_BUILD: '1' } },
);
child.on('exit', (code) => process.exit(code ?? 1));
