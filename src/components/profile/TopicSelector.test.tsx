import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { Timestamp } from 'firebase/firestore';
import { TopicSelector } from './TopicSelector';
import { useTags, type UseTagsResult } from '../../hooks/useTags';
import type { TagWithSlug } from '../../lib/firestore';
import { useAuth, type AuthContextValue } from '../../hooks/useAuth';
import { createTagRequest } from '../../lib/firestore';
import type { User } from 'firebase/auth';
import '../../i18n';

vi.mock('../../hooks/useTags', () => ({ useTags: vi.fn() }));
vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../../lib/firestore', () => ({ createTagRequest: vi.fn() }));

const mockedUseTags = vi.mocked(useTags);
const mockedUseAuth = vi.mocked(useAuth);
const mockedCreateTagRequest = vi.mocked(createTagRequest);

const ts = {} as Timestamp;
const tags: TagWithSlug[] = [
  { slug: 'android', label: { en: 'Android', es: 'Android' }, createdAt: ts },
  { slug: 'web', label: { en: 'Web', es: 'Web' }, createdAt: ts },
  { slug: 'other', label: { en: 'Other', es: 'Otro' }, createdAt: ts },
];

function setTags(partial: Partial<UseTagsResult> = {}) {
  mockedUseTags.mockReturnValue({
    tags,
    loading: false,
    error: null,
    labelFor: (slug) => tags.find((t) => t.slug === slug)?.label.en ?? slug,
    ...partial,
  });
}

function setUser(user: User | null) {
  mockedUseAuth.mockReturnValue({
    user,
    loading: false,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  } satisfies AuthContextValue);
}

const signedInUser = { uid: 'user-1' } as User;

beforeEach(() => {
  vi.clearAllMocks();
  setTags();
  setUser(signedInUser);
  mockedCreateTagRequest.mockResolvedValue(undefined);
});

describe('TopicSelector', () => {
  it('renders a checkbox per tag with translated labels', () => {
    render(<TopicSelector />);
    expect(
      screen.getByRole('checkbox', { name: 'Android' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Web' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Other' })).toBeInTheDocument();
  });

  it('keeps the "other" catch-all last', () => {
    render(<TopicSelector />);
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes.at(-1)).toHaveAccessibleName('Other');
  });

  it('reflects the selected value', () => {
    render(<TopicSelector value={['web']} />);
    expect(screen.getByRole('checkbox', { name: 'Web' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Android' })).not.toBeChecked();
  });

  it('adds a topic slug on select', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TopicSelector value={[]} onChange={onChange} />);

    await user.click(screen.getByRole('checkbox', { name: 'Android' }));
    expect(onChange).toHaveBeenCalledWith(['android']);
  });

  it('removes a topic slug on deselect', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TopicSelector value={['android', 'web']} onChange={onChange} />);

    await user.click(screen.getByRole('checkbox', { name: 'Android' }));
    expect(onChange).toHaveBeenCalledWith(['web']);
  });

  it('shows a loading state', () => {
    setTags({ loading: true, tags: [] });
    render(<TopicSelector />);
    expect(screen.getByText(/loading topics/i)).toBeInTheDocument();
  });

  it('shows an empty state when no tags exist', () => {
    setTags({ tags: [] });
    render(<TopicSelector />);
    expect(screen.getByText(/no topics are available/i)).toBeInTheDocument();
  });

  it('shows an error state', () => {
    setTags({ error: new Error('boom'), tags: [] });
    render(<TopicSelector />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      /couldn't load topics/i,
    );
  });

  it('submits a trimmed, lowercased tag request when signed in', async () => {
    const user = userEvent.setup();
    render(<TopicSelector />);

    await user.type(
      screen.getByRole('textbox', { name: /request it/i }),
      '  Kotlin Multiplatform  ',
    );
    await user.click(screen.getByRole('button', { name: /request it/i }));

    expect(mockedCreateTagRequest).toHaveBeenCalledWith({
      tag: 'kotlin multiplatform',
      requestedBy: 'user-1',
    });
    expect(
      await screen.findByText(/submitted for review/i),
    ).toBeInTheDocument();
  });

  it('disables the request flow and prompts when signed out', () => {
    setUser(null);
    render(<TopicSelector />);

    expect(screen.getByRole('textbox', { name: /request it/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /request it/i })).toBeDisabled();
    expect(
      screen.getByText(/sign in to request a new topic/i),
    ).toBeInTheDocument();
  });

  it('hides the request flow when disabled by the flag', () => {
    render(<TopicSelector enableTagRequests={false} />);
    expect(
      screen.queryByRole('button', { name: /request it/i }),
    ).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<TopicSelector value={['android']} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
