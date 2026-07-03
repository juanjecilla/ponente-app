import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { ReportModal } from './ReportModal';
import { createReport } from '../../lib/firestore';
import '../../i18n';

vi.mock('../../lib/firestore', () => ({ createReport: vi.fn() }));

const mockedCreateReport = vi.mocked(createReport);

function renderModal(onClose = vi.fn()) {
  render(
    <ReportModal
      reportedUid="speaker-1"
      reporterUid="reporter-9"
      reportedName="Ada Lovelace"
      onClose={onClose}
    />,
  );
  return { onClose };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedCreateReport.mockResolvedValue(undefined);
});

describe('ReportModal', () => {
  it('renders a labelled dialog with all four reasons', () => {
    renderModal();
    const dialog = screen.getByRole('dialog', { name: /report ada lovelace/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });

  it('moves focus into the dialog on mount', () => {
    renderModal();
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toHaveFocus();
  });

  it('requires a reason before submitting', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: /submit report/i }));

    expect(mockedCreateReport).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/choose a reason/i);
  });

  it('submits with the correct reportedBy/reportedUid and closes', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(screen.getByRole('radio', { name: /inappropriate/i }));
    await user.type(screen.getByLabelText(/additional details/i), '  bad  ');
    await user.click(screen.getByRole('button', { name: /submit report/i }));

    await waitFor(() => expect(mockedCreateReport).toHaveBeenCalledTimes(1));
    expect(mockedCreateReport).toHaveBeenCalledWith({
      reportedUid: 'speaker-1',
      reportedBy: 'reporter-9',
      reason: 'inappropriate',
      comment: 'bad',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('omits the comment field when left blank', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('radio', { name: /spam/i }));
    await user.click(screen.getByRole('button', { name: /submit report/i }));

    await waitFor(() => expect(mockedCreateReport).toHaveBeenCalledTimes(1));
    expect(mockedCreateReport).toHaveBeenCalledWith({
      reportedUid: 'speaker-1',
      reportedBy: 'reporter-9',
      reason: 'spam',
    });
  });

  it('shows an error and stays open when the write fails', async () => {
    const user = userEvent.setup();
    mockedCreateReport.mockRejectedValueOnce(new Error('nope'));
    const { onClose } = renderModal();

    await user.click(screen.getByRole('radio', { name: /fake profile/i }));
    await user.click(screen.getByRole('button', { name: /submit report/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /something went wrong/i,
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('traps Tab focus, wrapping from the last element back to the first', async () => {
    const user = userEvent.setup();
    renderModal();

    const radios = screen.getAllByRole('radio');
    const submit = screen.getByRole('button', { name: /submit report/i });
    submit.focus();
    await user.tab();

    expect(radios[0]).toHaveFocus();
  });

  it('traps Shift+Tab focus, wrapping from the first element to the last', async () => {
    const user = userEvent.setup();
    renderModal();

    const radios = screen.getAllByRole('radio');
    radios[0]?.focus();
    await user.tab({ shift: true });

    expect(
      screen.getByRole('button', { name: /submit report/i }),
    ).toHaveFocus();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations', async () => {
    renderModal();
    const dialog = screen.getByRole('dialog');
    expect(await axe(dialog)).toHaveNoViolations();
  });
});
