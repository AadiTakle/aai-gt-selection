# Local Supabase boundary

This directory contains the local-only Supabase project boundary.

The bootstrap migration creates only private `app` and exposed `api` schemas, non-bypass owner
roles, and pgTAP. It intentionally creates no admissions entities, policies, allocation,
evaluation, finance, or real-data structures.

Use the root `db:*` commands for start/reset/lint/test/type generation. Do not link this
repository to a hosted Supabase project or place production credentials here.
