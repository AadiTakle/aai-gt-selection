import { spawnSync } from 'node:child_process';

function run(command: string, args: string[], environment = process.env) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: environment,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed with status ${result.status ?? 'unknown'}.`,
    );
  }
}

function localSupabaseEnvironments() {
  const result = spawnSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || 'Unable to read local Supabase status.');
  }

  const status = JSON.parse(result.stdout) as {
    API_URL: string;
    PUBLISHABLE_KEY: string;
    SERVICE_ROLE_KEY: string;
  };

  const publicEnvironment = {
    ...process.env,
    NEXT_PUBLIC_GT_RETURN_URL: 'http://127.0.0.1:3000',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  };
  const integrationEnvironment = {
    ...publicEnvironment,
    GT_LOCAL_SYNTHETIC_ADAPTER_ENABLED: 'true',
    GT_LOCAL_SYNTHETIC_PROJECT_ID: 'gt-selection-capstone',
  };

  return {
    integrationEnvironment,
    publicEnvironment,
    setupEnvironment: {
      ...publicEnvironment,
      API_URL: status.API_URL,
      SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
      SUPABASE_URL: status.API_URL,
    },
  };
}

run('pnpm', ['format:check']);
run('pnpm', ['lint']);
run('pnpm', ['typecheck']);
run('pnpm', ['test']);
run('pnpm', ['boundaries:check']);
run('pnpm', ['db:start']);

try {
  run('pnpm', ['db:reset']);
  run('pnpm', ['db:lint']);
  run('pnpm', ['db:test']);
  run('pnpm', ['db:types:check']);

  const { integrationEnvironment, publicEnvironment, setupEnvironment } =
    localSupabaseEnvironments();
  run('pnpm', ['db:users'], setupEnvironment);
  run('pnpm', ['--filter', '@gt-selection/web', 'test:integration'], integrationEnvironment);
  run('pnpm', ['build'], publicEnvironment);
  run('pnpm', ['security:scan'], publicEnvironment);
  run('pnpm', ['--filter', '@gt-selection/web', 'test:e2e'], publicEnvironment);
} finally {
  run('pnpm', ['db:stop']);
}

console.log('Phase B verification completed.');
