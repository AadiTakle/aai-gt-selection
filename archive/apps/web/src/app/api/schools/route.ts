import { NextResponse, type NextRequest } from 'next/server';

/**
 * Real US public-school directory search, backed by the Urban Institute
 * Education Data API (NCES Common Core of Data).
 *
 * The upstream API only filters efficiently by state (a name query streams the
 * full ~100k-row / 11MB year dump and times out), so this route is
 * STATE-SCOPED: the browser sends `?state=AZ`, we fetch that one state once,
 * trim each row to the few fields the picker needs, and cache it in-process.
 * The client then type-filters that list instantly.
 *
 * This runs server-side, so it is not blocked by the app's strict browser CSP.
 * NOTE (governance): this introduces real (public, non-PII) institutional data
 * into the born-synthetic system. School names are public and already excluded
 * from eligibility; on submit the app still stores a synthetic-safe snapshot.
 * See docs note referenced from the education step.
 */

const CCD_YEAR = 2022;
const UPSTREAM = (fips: number) =>
  `https://educationdata.urban.org/api/v1/schools/ccd/directory/${CCD_YEAR}/?fips=${fips}`;

export type SchoolResult = {
  id: string; // NCES id
  name: string;
  city: string;
  state: string;
  zip: string;
  street: string;
};

const STATE_FIPS: Record<string, number> = {
  AL: 1,
  AK: 2,
  AZ: 4,
  AR: 5,
  CA: 6,
  CO: 8,
  CT: 9,
  DE: 10,
  FL: 12,
  GA: 13,
  HI: 15,
  ID: 16,
  IL: 17,
  IN: 18,
  IA: 19,
  KS: 20,
  KY: 21,
  LA: 22,
  ME: 23,
  MD: 24,
  MA: 25,
  MI: 26,
  MN: 27,
  MS: 28,
  MO: 29,
  MT: 30,
  NE: 31,
  NV: 32,
  NH: 33,
  NJ: 34,
  NM: 35,
  NY: 36,
  NC: 37,
  ND: 38,
  OH: 39,
  OK: 40,
  OR: 41,
  PA: 42,
  RI: 44,
  SC: 45,
  SD: 46,
  TN: 47,
  TX: 48,
  UT: 49,
  VT: 50,
  VA: 51,
  WA: 53,
  WV: 54,
  WI: 55,
  WY: 56,
};

type CacheEntry = { at: number; schools: SchoolResult[] };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 1000 * 60 * 60 * 24; // a day; school directories change slowly

type UpstreamRow = {
  ncessch?: string;
  school_name?: string;
  city_location?: string;
  state_location?: string;
  zip_location?: string;
  street_location?: string;
  school_status?: number | string;
};

async function loadState(stateAbbr: string): Promise<SchoolResult[]> {
  const cached = cache.get(stateAbbr);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.schools;

  const fips = STATE_FIPS[stateAbbr];
  if (!fips) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch(UPSTREAM(fips), {
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        // some WAFs 403 the default undici UA; identify politely
        'user-agent': 'GT-School-Admissions/1.0 (+https://gt.school)',
      },
    });
    if (!res.ok) return cached?.schools ?? [];
    const data = (await res.json()) as { results?: UpstreamRow[] };
    const schools: SchoolResult[] = (data.results ?? [])
      // keep currently-open schools (status 1) with a usable name
      .filter((r) => r.school_name && Number(r.school_status) === 1)
      .map((r) => ({
        id: String(r.ncessch ?? ''),
        name: r.school_name ?? '',
        city: r.city_location ?? '',
        state: r.state_location ?? stateAbbr,
        zip: r.zip_location ?? '',
        street: r.street_location ?? '',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    // only cache a real, non-empty result so a transient failure retries later
    if (schools.length > 0) cache.set(stateAbbr, { at: Date.now(), schools });
    return schools;
  } catch {
    return cached?.schools ?? [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest) {
  const state = (request.nextUrl.searchParams.get('state') ?? '').toUpperCase();
  const query = (request.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase();

  if (!STATE_FIPS[state]) {
    return NextResponse.json({ error: 'unknown_state' }, { status: 400 });
  }

  const all = await loadState(state);
  const filtered = query
    ? all.filter(
        (s) => s.name.toLowerCase().includes(query) || s.city.toLowerCase().includes(query),
      )
    : all;

  // cap the payload the client receives
  return NextResponse.json({ state, count: filtered.length, schools: filtered.slice(0, 40) });
}
