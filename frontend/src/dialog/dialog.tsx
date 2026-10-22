import { X } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  confirmPrompt,
  dismissDialog,
  getDialogQueue,
  getDialogVersion,
  subscribeDialogs,
  type PendingDialog,
} from './api';
import './dialog.css';

function DialogCard({ dialog }: { dialog: PendingDialog }) {
  const [draft, setDraft] = useState(dialog.inputValue);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissDialog(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const danger = dialog.kind === 'confirm' && dialog.tone === 'danger';
  const isPrompt = dialog.kind === 'prompt';
  const promptValid = draft.trim() !== '';
  // Destructive confirms focus the safe option so Enter can't misfire.
  const focusCancel = danger;

  const submit = () => {
    if (isPrompt) {
      if (promptValid) confirmPrompt(draft.trim());
    } else {
      dismissDialog(true);
    }
  };

  return (
    <div
      className="ff-dialog-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && dismissDialog(false)}
    >
      <div className="ff-dialog" role="alertdialog" aria-label={dialog.title}>
        <button className="ff-dlg-x" onClick={() => dismissDialog(false)} aria-label="Close">
          <X size={16} />
        </button>
        <h2>{dialog.title}</h2>
        {dialog.body && <p>{dialog.body}</p>}
        {isPrompt && (
          <div className="ff-dialog-input">
            <input
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              aria-label={dialog.title}
            />
          </div>
        )}
        <div className="ff-dialog-actions">
          {dialog.kind !== 'alert' && (
            <button className="ff-dlg-btn" autoFocus={focusCancel} onClick={() => dismissDialog(false)}>
              {dialog.cancelLabel}
            </button>
          )}
          <button
            className={danger ? 'ff-dlg-btn ff-dlg-danger' : 'ff-dlg-btn ff-dlg-primary'}
            autoFocus={!focusCancel && !isPrompt}
            disabled={isPrompt && !promptValid}
            onClick={submit}
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Mount once at the app root; renders whatever the dialog queue holds. */
export function DialogHost() {
  useSyncExternalStore(subscribeDialogs, getDialogVersion);
  const current = getDialogQueue()[0];
  if (!current) return null;
  // Keyed by request so each dialog gets a fresh input draft.
  return <DialogCard key={current.seq} dialog={current} />;
}
