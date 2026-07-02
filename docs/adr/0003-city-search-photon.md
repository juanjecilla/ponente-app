# ADR 0003: City Search via Photon (not Nominatim)

**Status:** Accepted (2026-06) · Supersedes the Nominatim approach in earlier drafts.

## Context
City availability is the core differentiator, so city input must be search-as-you-type. The earlier design used Nominatim (OpenStreetMap's geocoder). Research of the current Nominatim Usage Policy found two blockers:
- **Autocomplete is explicitly prohibited**: "Autocomplete search is not supported by Nominatim and you must not implement such a service on the client side using the API."
- **Hard cap of 1 request/second** across *all* users of the app, results must be cached, repeated identical queries can get the client blocked.

A keystroke-driven city picker would violate the policy and risk a block.

## Decision
Use **Photon** (`https://photon.komoot.io/api`), an OSM-based geocoder by komoot that **explicitly supports search-as-you-type**, is free, and needs no API key.

- Debounce input **≥300 ms**, abort in-flight requests on new keystrokes.
- **Cache** responses by query string in memory.
- Query with `osm_tag=place:city` (+ `place:town` for small-town coverage), `limit=6`.
- Ship a **static curated fallback** `public/data/cities.json` (GeoNames cities >15k pop, ES + EU) used when Photon fails or `enable_city_autocomplete` is false (then plain text input + fuzzy match on the static list).
- Store both a canonical `name` (Photon display) and a normalized `key` slug (lowercased, accent-stripped) so filter tokens match reliably.

## Consequences
- ✅ Policy-compliant autocomplete, free, no key.
- ✅ Graceful degradation via static list + feature flag.
- ⚠️ Photon public instance is fair-use ("extensive usage will be throttled", no availability guarantee). Fine at MVP scale; **self-hosted Photon** is the documented escape hatch (roadmap).
- ⚠️ Photon and Nominatim return slightly different naming; normalization (`key`) is mandatory for matching.

## Alternatives considered
- **Nominatim** — prohibited for autocomplete (the reason for this ADR).
- **Static-only bundled list** — zero policy risk but limited coverage + bundle weight; kept as fallback, not primary.
- **Geoapify / LocationIQ free tiers** — allow autocomplete but need an API key, signup, and have a paid cliff. Rejected to keep "no keys, no signup" for the core path.
