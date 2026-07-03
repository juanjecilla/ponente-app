import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useRemoteConfig } from '../../hooks/useRemoteConfig';
import { ReportModal } from './ReportModal';

export interface ReportButtonProps {
  /** uid of the speaker this button reports. */
  reportedUid: string;
  /** Display name of the reported speaker, for the modal heading. */
  reportedName?: string;
}

/**
 * Entry point for reporting a speaker profile. Hidden entirely when the
 * `enable_report_abuse` flag is off. Reporting is auth-gated: a signed-in user
 * opens the {@link ReportModal}; an anonymous visitor is prompted to sign in
 * (Google OAuth) instead. Focus returns to this button when the modal closes.
 */
export function ReportButton({ reportedUid, reportedName }: ReportButtonProps) {
  const { t } = useTranslation();
  const { user, signInWithGoogle } = useAuth();
  const { flags } = useRemoteConfig();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  if (!flags.enable_report_abuse) return null;

  const handleClick = () => {
    if (!user) {
      // Not signed in: reporting requires accountability (reportedBy == uid).
      void signInWithGoogle();
      return;
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="text-sm text-red-600 underline"
        onClick={handleClick}
      >
        {t('report.button')}
      </button>
      {open && user && (
        <ReportModal
          reportedUid={reportedUid}
          reporterUid={user.uid}
          {...(reportedName !== undefined ? { reportedName } : {})}
          onClose={handleClose}
        />
      )}
    </>
  );
}

export default ReportButton;
