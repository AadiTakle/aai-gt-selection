import { createClient } from '@supabase/supabase-js';
import { spawnSync } from 'node:child_process';

let apiUrl = process.env.SUPABASE_URL ?? process.env.API_URL;
let secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SERVICE_ROLE_KEY;

if (!apiUrl || !secretKey) {
  const result = spawnSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || 'Unable to read local Supabase setup values.');
  }

  const status = JSON.parse(result.stdout) as {
    API_URL: string;
    SERVICE_ROLE_KEY: string;
  };
  apiUrl = status.API_URL;
  secretKey = status.SERVICE_ROLE_KEY;
}

if (!apiUrl || !secretKey) {
  throw new Error('Local Supabase did not report the required Auth setup values.');
}

const parsedUrl = new URL(apiUrl);
if (!['127.0.0.1', 'localhost', '::1'].includes(parsedUrl.hostname)) {
  throw new Error('Local Auth fixture creation refuses non-loopback Supabase URLs.');
}

const supabase = createClient(apiUrl, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const syntheticUsers = [
  ['family@example.test', 'family'],
  ['family-two@example.test', 'family'],
  ['admissions@example.test', 'admissions_operator'],
  ['reviewer@example.test', 'reviewer'],
  ['supervisor@example.test', 'review_supervisor'],
  ['auditor@example.test', 'auditor'],
  ['privacy@example.test', 'privacy_steward'],
] as const;

const password = 'Synthetic-Only-2026!';
const { data: existing, error: listError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});

if (listError) {
  throw listError;
}

const existingEmails = new Set(existing.users.map(({ email }) => email));

for (const [email, userRole] of syntheticUsers) {
  if (existingEmails.has(email)) {
    continue;
  }

  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      synthetic_only: true,
      user_role: userRole,
    },
  });

  if (error) {
    throw error;
  }
}

console.log(`Local synthetic Auth users ready: ${syntheticUsers.length}`);
