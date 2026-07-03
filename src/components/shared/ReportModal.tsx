import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { createReport } from '../../lib/firestore';
import type { Report } from '../../types';

type ReportReason = Report['reason'];

/** Predefined report reasons, in the order shown in the radio group. */
export const REPORT_REASONS: readonly ReportReason[] = [
  'spam',
  'fake',
  'inappropriate',
  'wrong-info',
];

/** Cap on the optional free-text comment (stored as plain text; ADR 0005). */
const COMMENT_MAX = 500;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ReportModalProps {
  /** uid of the speaker being reported (`reports.reportedUid`). */
  reportedUid: string;
  /** uid of the signed-in reporter (`reports.reportedBy`; auth-gated). */
  reporterUid: string;
  /** Display name of the reported speaker, for the dialog heading. */
  reportedName?: string;
  /** Close the dialog (return focus is handled by the trigger). */
  onClose: () => void;
}

/**
 * Accessible report dialog: a radio group of predefined reasons plus an optional
 * comment. On submit it writes a {@link Report} via {@link createReport} with
 * `reportedBy` set to the signed-in uid, then closes. Implements a focus trap,
 * Escape-to-close, and `role="dialog"` labelling. There is no `reportCount`
 * feedback (admin-only, ADR 0005) — success simply closes the dialog.
 */
export function ReportModal({
  reportedUid,
  reporterUid,
  reportedName,
  onClose,
}: ReportModalProps) {
  const { t } = useTranslation();
  const ids = useId();
  const titleId = `${ids}-title`;
  const descId = `${ids}-desc`;
  const dialogRef = useRef<HTMLDivElement>(null);

  const [reason, setReason] = useState<ReportReason | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Move focus into the dialog on mount (first focusable element).
  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, []);

  // Escape closes; Tab is trapped within the dialog.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const list = Array.from(nodes);
      const first = list[0];
      const last = list[list.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setError(t('report.reasonRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const trimmed = comment.trim();
      await createReport({
        reportedUid,
        reportedBy: reporterUid,
        reason,
        ...(trimmed ? { comment: trimmed } : {}),
      });
      onClose();
    } catch {
      setError(t('report.error'));
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          {reportedName
            ? t('report.titleNamed', { name: reportedName })
            : t('report.title')}
        </h2>
        <p id={descId} className="mt-1 text-sm text-slate-600">
          {t('report.description')}
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <fieldset>
            <legend className="text-sm font-medium text-slate-700">
              {t('report.reasonLegend')}
            </legend>
            <div className="mt-2 space-y-1">
              {REPORT_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`${ids}-reason`}
                    value={r}
                    checked={reason === r}
                    onChange={() => {
                      setReason(r);
                      setError(null);
                    }}
                  />
                  <span>{t(`report.reason.${r}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label
              htmlFor={`${ids}-comment`}
              className="block text-sm font-medium text-slate-700"
            >
              {t('report.commentLabel')}
            </label>
            <textarea
              id={`${ids}-comment`}
              maxLength={COMMENT_MAX}
              rows={3}
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
              placeholder={t('report.commentPlaceholder')}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded border border-slate-300 px-3 py-1"
              onClick={onClose}
            >
              {t('report.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-indigo-600 px-3 py-1 text-white disabled:opacity-50"
            >
              {submitting ? t('report.submitting') : t('report.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReportModal;
