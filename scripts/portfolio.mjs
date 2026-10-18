import { spawn } from 'node:child_process';
const action = process.argv[2] ?? 'build';
if (!['build', 'dev', 'start'].includes(action)) throw new Error('Expected build, dev or start');
const environment = {
  ...process.env,
  NEXT_PUBLIC_SIGNAL_PORTFOLIO: 'true',
  SIGNAL_BUILD: action === 'dev' ? 'portfolio-dev' : 'portfolio',
  NEXT_TELEMETRY_DISABLED: '1',
};
for (const key of [
  'DATABASE_URL',
  'REDIS_URL',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'AI_API_KEY',
  'EMBEDDING_API_KEY',
  'SMTP_PASS',
])
  delete environment[key];
environment.DATABASE_URL = 'postgresql://portfolio:portfolio@127.0.0.1:1/not-used';
environment.REDIS_URL = '';
const child = spawn(
  process.execPath,
  [
    'node_modules/next/dist/bin/next',
    action,
    'apps/web',
    ...(action === 'build'
      ? []
      : ['--hostname', '127.0.0.1', '--port', process.env.PORT ?? '3002']),
  ],
  { stdio: 'inherit', env: environment },
);
child.on('exit', (code) => process.exit(code ?? 1));
