'use client';

import type { Database } from '@gt-selection/db-types';
import { createBrowserClient } from '@supabase/ssr';

import { getPublicEnvironment } from '@/lib/env';

export function createSupabaseBrowserClient() {
  const environment = getPublicEnvironment();
  return createBrowserClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
