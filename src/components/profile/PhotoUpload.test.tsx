import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { PhotoUpload } from './PhotoUpload';
import { useAuth } from '../../hooks/useAuth';
import { getStorageProvider } from '../../lib/storage';
import '../../i18n';

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../../lib/storage', () => ({ getStorageProvider: vi.fn() }));

const uploadPhoto = vi.fn();
const deletePhoto = vi.fn();

const mockedUseAuth = vi.mocked(useAuth);
const mockedGetProvider = vi.mocked(getStorageProvider);

function setUser(user: { uid: string; displayName?: string | null } | null) {
  mockedUseAuth.mockReturnValue({
    user: user as never,
    loading: false,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  });
}

/** A `File` of `type` and a given byte length (for size validation). */
function imageFile(type: string, name: string, bytes = 1024): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetProvider.mockReturnValue({ uploadPhoto, deletePhoto });
  setUser({ uid: 'u1', displayName: 'Ada Lovelace' });
});

describe('PhotoUpload', () => {
  it('renders an empty state with a file input and initials', () => {
    render(<PhotoUpload />);
    expect(screen.getByLabelText(/choose a photo/i)).toBeInTheDocument();
    expect(screen.getByText('AL')).toBeInTheDocument(); // Ada Lovelace initials
  });

  it('uploads a valid image and shows the returned URL as preview', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    uploadPhoto.mockResolvedValue('https://cdn.example.com/u1/avatar.webp');
    render(<PhotoUpload onChange={onChange} />);

    await user.upload(
      screen.getByLabelText(/choose a photo/i),
      imageFile('image/png', 'me.png'),
    );

    await waitFor(() =>
      expect(uploadPhoto).toHaveBeenCalledWith('u1', expect.any(File)),
    );
    expect(onChange).toHaveBeenCalledWith(
      'https://cdn.example.com/u1/avatar.webp',
    );
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      'https://cdn.example.com/u1/avatar.webp',
    );
  });

  it('shows an error and does not call onChange when upload fails', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    uploadPhoto.mockRejectedValue(new Error('network'));
    render(<PhotoUpload onChange={onChange} />);

    await user.upload(
      screen.getByLabelText(/choose a photo/i),
      imageFile('image/webp', 'me.webp'),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /upload failed/i,
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rejects a disallowed file type without uploading', async () => {
    render(<PhotoUpload />);
    // fireEvent bypasses the input `accept` filter to exercise our own guard.
    fireEvent.change(screen.getByLabelText(/choose a photo/i), {
      target: { files: [imageFile('application/pdf', 'doc.pdf')] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /jpeg, png or webp/i,
    );
    expect(uploadPhoto).not.toHaveBeenCalled();
  });

  it('rejects a file larger than 2 MB without uploading', async () => {
    const user = userEvent.setup();
    render(<PhotoUpload />);

    await user.upload(
      screen.getByLabelText(/choose a photo/i),
      imageFile('image/jpeg', 'big.jpg', 2 * 1024 * 1024 + 1),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(/too large/i);
    expect(uploadPhoto).not.toHaveBeenCalled();
  });

  it('removes an existing photo via the provider and clears the value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    deletePhoto.mockResolvedValue(undefined);
    render(
      <PhotoUpload
        value="https://cdn.example.com/old.webp"
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('img')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /remove photo/i }));

    await waitFor(() => expect(deletePhoto).toHaveBeenCalledWith('u1'));
    expect(onChange).toHaveBeenCalledWith(undefined);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <PhotoUpload value="https://cdn.example.com/old.webp" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
