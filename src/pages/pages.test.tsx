import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HomePage } from './HomePage';
import { SpeakerPage } from './SpeakerPage';
import '../i18n';

describe('page stubs', () => {
  it('HomePage renders the hero heading', () => {
    render(<HomePage />);
    expect(
      screen.getByRole('heading', { name: /ponente/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/travel to your city/i)).toBeInTheDocument();
  });

  it('SpeakerPage renders its heading and the uid param', () => {
    render(
      <MemoryRouter initialEntries={['/speaker/xyz-42']}>
        <Routes>
          <Route path="/speaker/:uid" element={<SpeakerPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('heading', { name: /speaker profile/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('xyz-42')).toBeInTheDocument();
  });
});
