import { cp, mkdir, rename, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

// Wrangler's dry run produces a self-contained Worker bundle without publishing.
await rm('dist', { recursive: true, force: true });
await mkdir('dist/server', { recursive: true });
const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'deploy', '--dry-run', '--outdir', 'dist/server'], {
  stdio: 'inherit',
  env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
});
if (result.status !== 0) process.exit(result.status ?? 1);
await rename('dist/server/worker.js', 'dist/server/index.js');
await cp('.open-next/assets', 'dist/client', { recursive: true });
await mkdir('dist/.openai', { recursive: true });
await cp('.openai/hosting.json', 'dist/.openai/hosting.json');
console.log('Sites Worker and assets staged in dist/.');
