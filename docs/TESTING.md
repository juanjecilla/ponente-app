# Testing Strategy: Ponente

## Tooling
- **Vitest** + **React Testing Library** + `@testing-library/jest-dom` — unit/component.
- **vitest-axe** — component-level a11y assertions.
- **Lighthouse CI** (`@lhci/cli`) — page-level a11y + performance, run against a Hosting preview channel.
- Environment: `jsdom`. Coverage provider: `v8`.

## Coverage thresholds (block merge)
```ts
// vitest.config.ts
coverage: {
  provider: 'v8',
  thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
  exclude: [
    'src/lib/firebase.ts',        // SDK init, not unit-testable
    'src/lib/storage/firebase.ts',// SDK wrapper
    'src/lib/storage/supabase.ts',// SDK wrapper
    'src/main.tsx',
    '**/*.d.ts',
    'src/types/**',
    'src/i18n/**',
    'scripts/**',
  ],
}
```
Document any new exception inline with a one-line reason.

## What to test
- **Pure logic** (high value): city normalization (`key` slug, accents), `cityTierTokens` derivation, contact-link per-type validation, publish-gate predicate, client-side directory filtering, Remote Config typed accessors, StorageProvider selector.
- **Components**: ProfileForm validation states, CityAvailabilityInput (mock Photon), TopicSelector (mock `tags`), ReportModal (auth-gated), filters, SpeakerCard, ProfileCompletionBanner, LanguageSwitcher.
- **Mock at the boundary**: mock `lib/photon`, `lib/firestore`, `lib/storage`, Remote Config — never hit network or Firebase in unit tests.

## a11y
- Every interactive component gets a `vitest-axe` assertion (`expect(await axe(container)).toHaveNoViolations()`).
- Semantic HTML, labels for all inputs, focus management in modals, `aria-live` for filter result counts.
- Lighthouse CI page thresholds: **a11y ≥ 90, performance ≥ 70, best-practices ≥ 90** (assert in `lighthouserc`).

## Firestore rules testing (recommended)
Use `@firebase/rules-unit-testing` against the emulator to assert: public can't read unpublished/disabled; non-owner can't write; admin fields can't be set by client; publish blocked when required fields missing; reports require `reportedBy == uid`. Add as a CI job once the emulator is wired (can be a fast-follow after task 03).

## CI gates (see task 00)
typecheck → lint → format → test:coverage (→ Codecov) → build → size-limit; preview deploy → Lighthouse CI; CodeQL. All required for merge.
