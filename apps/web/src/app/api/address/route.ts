import { NextResponse, type NextRequest } from 'next/server';

import { ADDRESS_SUGGESTIONS } from '@/lib/family/vocab';

/**
 * Real US address autocomplete — free and keyless by default (OpenStreetMap
 * Nominatim), just like the schools search. Runs server-side so it isn't blocked
 * by the browser CSP and we can send the required User-Agent.
 *
 * Each prediction already carries the resolved parts, so selecting one fills
 * street/city/state/zip with no second request.
 *
 * If GOOGLE_PLACES_API_KEY is set, it isn't required — Nominatim is the default.
 * With no upstream reachable at all, we fall back to curated synthetic samples so
 * the picker still works offline/in CI.
 *
 * NOTE (governance, B-06): real address strings flow through this route, but the
 * app still stores a born-synthetic snapshot on submit (see draft-mapper).
 * Persisting real addresses verbatim is a separate decision.
 *
 *   GET /api/address?q=<text>  →  { predictions: [{ id, label, address }] }
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

export type ResolvedAddress = {
  street1: string;
  city: string;
  stateCode: string; // SYN_REGION_<ABBR> to satisfy the born-synthetic contract
  zip: string;
};

export type AddressPrediction = { id: string; label: string; address: ResolvedAddress };

// full US state/territory name → USPS abbreviation, for SYN_REGION_<ABBR> codes
const STATE_ABBR: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  'district of columbia': 'DC',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
};

type NominatimAddress = {
  house_number?: string;
  road?: string;
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  state?: string;
  postcode?: string;
};

type NominatimResult = {
  place_id: number | string;
  display_name: string;
  address?: NominatimAddress;
};

function toResolved(a: NominatimAddress): ResolvedAddress {
  const street = [a.house_number, a.road].filter(Boolean).join(' ');
  const city = a.city ?? a.town ?? a.village ?? a.hamlet ?? '';
  const abbr = a.state ? STATE_ABBR[a.state.toLowerCase()] : undefined;
  return {
    street1: street,
    city,
    stateCode: abbr ? `SYN_REGION_${abbr}` : '',
    zip: a.postcode ?? '',
  };
}

async function fetchNominatim(q: string): Promise<AddressPrediction[] | null> {
  const url = `${NOMINATIM}?q=${encodeURIComponent(q)}&format=jsonv2&addressdetails=1&countrycodes=us&limit=6`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        // Nominatim policy requires a descriptive UA
        'user-agent': 'GT-School-Admissions/1.0 (family admissions portal)',
      },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as NominatimResult[];
    return (
      rows
        // keep results that resolved to a real street address
        .filter((r) => r.address?.road)
        .map((r) => ({
          id: String(r.place_id),
          label: r.display_name,
          address: toResolved(r.address ?? {}),
        }))
    );
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 3) return NextResponse.json({ predictions: [] });

  const real = await fetchNominatim(q);
  if (real && real.length > 0) {
    return NextResponse.json({ real: true, predictions: real });
  }

  // offline / upstream unreachable → curated synthetic samples
  const ql = q.toLowerCase();
  const predictions: AddressPrediction[] = ADDRESS_SUGGESTIONS.filter((a) =>
    a.label.toLowerCase().includes(ql),
  ).map((a) => ({
    id: a.id,
    label: a.label,
    address: { street1: a.street1, city: a.city, stateCode: a.stateCode, zip: a.zip },
  }));
  return NextResponse.json({ real: false, predictions });
}
