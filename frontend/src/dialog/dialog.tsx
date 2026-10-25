import { useState, useSyncExternalStore } from 'react';
import {
  confirmPrompt,
  dismissDialog,
  getDialogQueue,
  getDialogVersion,
  subscribeDialogs,
  type PendingDialog,
} from './api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function DialogCard({ dialog }: { dialog: PendingDialog }) {
  const [draft, setDraft] = useState(dialog.inputValue);

  const danger = dialog.kind === 'confirm' && dialog.tone === 'danger';
  const isPrompt = dialog.kind === 'prompt';
  const promptValid = draft.trim() !== '';

  const submit = () => {
    if (isPrompt) {
      if (promptValid) confirmPrompt(draft.trim());
    } else {
      dismissDialog(true);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && dismissDialog(false)}>
      <DialogContent className="max-w-md bg-stone-950 border-stone-800 text-stone-100 shadow-2xl">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg font-semibold tracking-tight text-stone-100">
            {dialog.title}
          </DialogTitle>
          {dialog.body && (
            <DialogDescription className="text-sm text-stone-400">
              {dialog.body}
            </DialogDescription>
          )}
        </DialogHeader>

        {isPrompt && (
          <div className="py-2">
            <Input
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              aria-label={dialog.title}
              className="bg-stone-900 border-stone-700 text-stone-100 placeholder:text-stone-500 focus-visible:ring-lime-400"
            />
          </div>
        )}

        <DialogFooter className="mt-4 gap-2 sm:gap-2">
          {dialog.kind !== 'alert' && (
            <Button
              variant="outline"
              onClick={() => dismissDialog(false)}
            >
              {dialog.cancelLabel}
            </Button>
          )}
          <Button
            variant={danger ? 'destructive' : 'default'}
            disabled={isPrompt && !promptValid}
            onClick={submit}
          >
            {dialog.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
