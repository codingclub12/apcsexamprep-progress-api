'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SCHOOL / DISTRICT / GEOGRAPHY from a teacher email domain.
//
//  There is no clean public "email domain -> school district" dataset, so this is
//  two layers:
//    1. AUTO PARSE (no maintenance): US public school domains encode the state in
//       `*.k12.<st>.us`, and the TLD gives the country (.cn, .ae, .uk, ...). This
//       covers a chunk of institutions with zero curation and never goes stale.
//    2. DIRECTORY (curated): DOMAINS below maps a specific domain to its school /
//       district / city / state. Seeded with high-confidence entries; extend it as
//       new schools sign up. The analytics `unmapped_domains` list shows exactly
//       which domains to add next (institutional domains not yet in here), so the
//       directory improves itself instead of guessing.
//
//  Personal domains (gmail, etc.) are labelled "Personal email", not an institution.
// ─────────────────────────────────────────────────────────────────────────────

// Curated directory. Add rows as schools sign up (see analytics unmapped_domains).
// Keep only entries you are confident about; a wrong row here shows a wrong
// district in your own analytics. state is the 2-letter USPS code (US only).
const DOMAINS = {
  // Florida (also carried in admin-metrics FLORIDA_DISTRICTS)
  'hcps.net':                 { district: 'Hillsborough County Public Schools', city: 'Tampa', state: 'FL', country: 'US' },
  'sarasotacountyschools.net':{ district: 'Sarasota County Schools', city: 'Sarasota', state: 'FL', country: 'US' },
  'dadeschools.net':          { district: 'Miami-Dade County Public Schools', city: 'Miami', state: 'FL', country: 'US' },
  'volusia.k12.fl.us':        { district: 'Volusia County Schools', city: 'DeLand', state: 'FL', country: 'US' },
  'okaloosaschools.com':      { district: 'Okaloosa County School District', city: 'Fort Walton Beach', state: 'FL', country: 'US' },
  'materacademy.com':         { district: 'Mater Academy', city: 'Hialeah Gardens', state: 'FL', country: 'US' },
  // Other US
  'schools.nyc.gov':          { district: 'NYC Department of Education', city: 'New York', state: 'NY', country: 'US' },
  'lpsb.org':                 { district: 'Lafourche Parish School Board', city: 'Thibodaux', state: 'LA', country: 'US' },
  'argyleisd.com':            { district: 'Argyle ISD', city: 'Argyle', state: 'TX', country: 'US' },
  'lvusd.org':                { district: 'Las Virgenes Unified School District', city: 'Calabasas', state: 'CA', country: 'US' },
  'hvrsd.org':                { district: 'Hopewell Valley Regional School District', city: 'Pennington', state: 'NJ', country: 'US' },
  // International
  'dhafraschools.com':        { school: 'Al Dhafra Private Schools', city: 'Abu Dhabi', state: null, country: 'AE' },
};

// 2-letter USPS state codes, for validating a parsed `.<st>.us` segment.
const US_STATES = new Set(('al ak az ar ca co ct de fl ga hi id il in ia ks ky la me md ma mi ' +
  'mn ms mo mt ne nv nh nj nm ny nc nd oh ok or pa ri sc sd tn tx ut vt va wa wv wi wy dc').split(' '));

// ccTLD -> country for the common non-US cases we see. US is inferred from state
// or from .gov/.edu/.us; everything else stays 'Unknown'.
const CCTLD = {
  cn: 'CN', ae: 'AE', uk: 'GB', ca: 'CA', au: 'AU', in: 'IN', sg: 'SG',
  sn: 'SN', ph: 'PH', mx: 'MX', za: 'ZA', ng: 'NG', de: 'DE', fr: 'FR',
};

const PERSONAL = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'outlook.com', 'hotmail.com',
  'live.com', 'msn.com', 'icloud.com', 'me.com', 'aol.com', 'protonmail.com', 'proton.me',
]);

function emailDomain(email) {
  const at = String(email || '').toLowerCase().trim().lastIndexOf('@');
  return at === -1 ? '' : String(email).toLowerCase().trim().slice(at + 1);
}

// Pull the US state out of a *.k12.<st>.us or *.<st>.us domain, if valid.
function stateFromDomain(domain) {
  let m = domain.match(/\.k12\.([a-z]{2})\.us$/);
  if (m && US_STATES.has(m[1])) return m[1].toUpperCase();
  m = domain.match(/\.([a-z]{2})\.us$/);
  if (m && US_STATES.has(m[1])) return m[1].toUpperCase();
  return null;
}

function countryFromDomain(domain) {
  const tld = domain.split('.').pop();
  if (CCTLD[tld]) return CCTLD[tld];
  if (tld === 'gov' || tld === 'edu' || tld === 'us') return 'US';
  return null; // .org/.com/.net are global; resolved by state if any
}

// Resolve a teacher email to geography. source: 'directory' | 'parsed' | 'personal'
// | 'unknown'. state/country are best-effort and may be null.
function lookup(email) {
  const domain = emailDomain(email);
  if (!domain) return { domain: '', label: 'Unknown', school: null, district: null, city: null, state: null, country: null, source: 'unknown' };

  if (PERSONAL.has(domain)) {
    return { domain, label: 'Personal email', school: null, district: null, city: null, state: null, country: null, source: 'personal' };
  }

  const hit = DOMAINS[domain];
  if (hit) {
    return {
      domain,
      label: hit.district || hit.school || domain,
      school: hit.school || null,
      district: hit.district || null,
      city: hit.city || null,
      state: hit.state || null,
      country: hit.country || (hit.state ? 'US' : null),
      source: 'directory',
    };
  }

  const state = stateFromDomain(domain);
  const country = state ? 'US' : countryFromDomain(domain);
  return {
    domain, label: domain, school: null, district: null, city: null,
    state, country, source: 'parsed',
  };
}

module.exports = { lookup, emailDomain, stateFromDomain, countryFromDomain, DOMAINS, PERSONAL };
