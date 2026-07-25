#!/usr/bin/env node
// Configure cloud Supabase Auth email for the GT family portal.
//
// This is a DEFERRED, cloud-affecting ops step. It is DRY-RUN BY DEFAULT: it
// prints exactly what it would send and does nothing to the cloud project unless
// you pass --apply. It never hard-codes secrets — the management token and any
// SMTP credentials are read from the environment.
//
// Two modes (pick with MODE=...):
//
//   MODE=autoconfirm   (token only — no SMTP creds, no real email needed)
//     Sets mailer_autoconfirm=true so the "Create account" sign-up flow works
//     WITHOUT an email round-trip. Good enough for a synthetic demo. NOTE:
//     magic-link sign-in still needs real SMTP (it always sends an email), so
//     this mode fixes sign-up but not magic-link.
//
//   MODE=smtp          (token + SMTP creds — enables real confirmation + magic link)
//     Sets custom SMTP and mailer_autoconfirm=false so both sign-up confirmation
//     and magic-link emails deliver through your provider. AWS SES is blocked in
//     this org (SCP denies iam:CreateUser, and SES SMTP needs an IAM user), so
//     use any SMTP provider you control: Resend, SendGrid, Mailgun, Postmark, or
//     even a Gmail app password. Supabase's built-in email is heavily
//     rate-limited (~a few/hr) — fine only for the tiniest demo.
//
// Required env in all modes:
//   SUPABASE_MGMT_TOKEN   a fresh sbp_... personal access token (rotate after use)
//
// Required env for MODE=smtp:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_ADMIN_EMAIL
//   SMTP_SENDER_NAME (optional, defaults to "GT School")
//
// Usage:
//   MODE=autoconfirm SUPABASE_MGMT_TOKEN=sbp_xxx node scripts/configure-cloud-auth-email.mjs           # dry run
//   MODE=autoconfirm SUPABASE_MGMT_TOKEN=sbp_xxx node scripts/configure-cloud-auth-email.mjs --apply    # applies
//   MODE=smtp SUPABASE_MGMT_TOKEN=sbp_xxx SMTP_HOST=... SMTP_PORT=587 SMTP_USER=... SMTP_PASS=... \
//     SMTP_ADMIN_EMAIL=you@yourdomain node scripts/configure-cloud-auth-email.mjs --apply

const PROJECT_REF = 'uujofwcdizuiyyczgvmo';
const ENDPOINT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;

const apply = process.argv.includes('--apply');
const mode = (process.env.MODE || '').toLowerCase();
const token = process.env.SUPABASE_MGMT_TOKEN;

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

if (mode !== 'autoconfirm' && mode !== 'smtp') {
  fail('Set MODE=autoconfirm or MODE=smtp. See the header of this file for details.');
}
if (!token) {
  fail('Set SUPABASE_MGMT_TOKEN to a fresh sbp_... personal access token (rotate it after use).');
}

let body;
if (mode === 'autoconfirm') {
  // Sign-up works without email; keep signups enabled.
  body = {
    disable_signup: false,
    mailer_autoconfirm: true,
  };
} else {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_ADMIN_EMAIL'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    fail(`MODE=smtp requires these env vars: ${missing.join(', ')}`);
  }
  body = {
    disable_signup: false,
    external_email_enabled: true,
    mailer_autoconfirm: false,
    smtp_host: process.env.SMTP_HOST,
    smtp_port: process.env.SMTP_PORT,
    smtp_user: process.env.SMTP_USER,
    smtp_pass: process.env.SMTP_PASS,
    smtp_admin_email: process.env.SMTP_ADMIN_EMAIL,
    smtp_sender_name: process.env.SMTP_SENDER_NAME || 'GT School',
  };
}

// Redact secrets when echoing the plan.
const redacted = { ...body };
for (const key of ['smtp_pass', 'smtp_user']) {
  if (redacted[key]) redacted[key] = '***redacted***';
}

console.log(`\nGT cloud Supabase Auth email config`);
console.log(`  project : ${PROJECT_REF}`);
console.log(`  endpoint: PATCH ${ENDPOINT}`);
console.log(`  mode    : ${mode}`);
console.log(`  payload : ${JSON.stringify(redacted, null, 2)}`);

if (!apply) {
  console.log(`\n(dry run) Nothing was sent. Re-run with --apply to write this to the cloud project.\n`);
  process.exit(0);
}

const response = await fetch(ENDPOINT, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const text = await response.text();
if (!response.ok) {
  fail(`Management API returned ${response.status}: ${text}`);
}
console.log(`\n✓ Applied. Response: ${text}\n`);
console.log('Reminder: rotate/revoke the SUPABASE_MGMT_TOKEN now that it has been used.\n');
