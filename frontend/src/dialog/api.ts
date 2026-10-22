// Promise-based dialog API. Pair with <DialogHost/> (dialog.tsx) mounted
// once at the app root. Call sites read like the native calls they replace:
//   if (await confirmDialog({ title: 'Delete?' })) …

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
}

export interface AlertOptions {
  title: string;
  body?: string;
  okLabel?: string;
}

export interface PromptOptions {
  title: string;
  body?: string;
  initialValue?: string;
  confirmLabel?: string;
}

export interface PendingDialog {
  seq: number;
  kind: 'confirm' | 'alert' | 'prompt';
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: 'default' | 'danger';
  inputValue: string;
  resolve: (result: boolean | string | null) => void;
}

const queue: PendingDialog[] = [];
const listeners = new Set<() => void>();
let version = 0;
let seq = 0;

function emit(): void {
  version += 1;
  listeners.forEach((l) => l());
}

export function subscribeDialogs(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getDialogVersion(): number {
  return version;
}

export function getDialogQueue(): readonly PendingDialog[] {
  return queue;
}

export function dismissDialog(confirmed: boolean): void {
  const current = queue.shift();
  if (!current) return;
  emit();
  current.resolve(confirmed);
}

function request(
  kind: 'confirm' | 'alert' | 'prompt',
  opts: {
    title: string;
    body?: string;
    confirmLabel: string;
    cancelLabel: string;
    tone?: 'default' | 'danger';
    inputValue?: string;
  },
): Promise<boolean | string | null> {
  return new Promise((resolve) => {
    seq += 1;
    queue.push({ ...opts, seq, kind, tone: opts.tone ?? 'default', inputValue: opts.inputValue ?? '', resolve });
    emit();
  });
}

/** Drop-in replacement for window.confirm. Resolves true on confirm, false on cancel/Esc/overlay. */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return request('confirm', {
    title: opts.title,
    body: opts.body,
    confirmLabel: opts.confirmLabel ?? 'Confirm',
    cancelLabel: opts.cancelLabel ?? 'Cancel',
    tone: opts.tone,
  }).then((r) => r === true);
}

/** Drop-in replacement for window.alert. */
export function alertDialog(opts: AlertOptions): Promise<void> {
  return request('alert', {
    title: opts.title,
    body: opts.body,
    confirmLabel: opts.okLabel ?? 'OK',
    cancelLabel: 'Cancel',
  }).then(() => undefined);
}

/** Text-input dialog. Resolves the trimmed value, or null on cancel/Esc/overlay. */
export function promptDialog(opts: PromptOptions): Promise<string | null> {
  return request('prompt', {
    title: opts.title,
    body: opts.body,
    confirmLabel: opts.confirmLabel ?? 'Save',
    cancelLabel: 'Cancel',
    inputValue: opts.initialValue,
  }).then((r) => (typeof r === 'string' ? r : null));
}

/** Resolve the open prompt with a value. */
export function confirmPrompt(value: string): void {
  const current = queue.shift();
  if (!current) return;
  emit();
  current.resolve(value);
}
