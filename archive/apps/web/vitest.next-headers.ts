interface StoredCookie {
  name: string;
  value: string;
  options?: Record<string, unknown> | undefined;
}

const cookieStore = new Map<string, StoredCookie>();

export function resetIntegrationCookieStore() {
  cookieStore.clear();
}

export async function cookies() {
  return {
    getAll() {
      return [...cookieStore.values()].map(({ name, value }) => ({ name, value }));
    },
    set(nameOrCookie: string | StoredCookie, value?: string, options?: Record<string, unknown>) {
      const cookie =
        typeof nameOrCookie === 'string'
          ? { name: nameOrCookie, value: value ?? '', options }
          : nameOrCookie;
      cookieStore.set(cookie.name, cookie);
    },
  };
}
