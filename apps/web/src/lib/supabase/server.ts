import type { Database } from '@gt-selection/db-types';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { getServerEnvironment } from '@/lib/env';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const environment = getServerEnvironment();

  return createServerClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot always write refreshed cookies. The request proxy handles
            // refresh for navigations; Server Actions and Route Handlers can write normally.
          }
        },
      },
    },
  );
}
