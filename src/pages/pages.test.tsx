import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProfileEditPage } from './ProfileEditPage';
import '../i18n';

// NOTE: HomePage + SpeakerPage assertions were removed here in task 08; those
// pages are now the public directory / speaker profile and are covered by
// HomePage.test.tsx and SpeakerPage.test.tsx.
describe('page stubs', () => {
  it('ProfileEditPage renders its heading', () => {
    render(<ProfileEditPage />);
    expect(
      screen.getByRole('heading', { name: /edit your profile/i }),
    ).toBeInTheDocument();
  });
});
