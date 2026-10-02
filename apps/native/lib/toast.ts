/**
 * The one app-wide toast. A new toast replaces the current one and its action. A toast lasts 2.6 s, or 5 s with an
 * action such as “เอากลับคืน”. The action runs once; while it runs the toast stays, and if it fails the toast shows
 * why and keeps the action so it can be tried again.
 */

export type ToastAction = {
  label: string;
  busyLabel?: string;
  run: () => Promise<void>;
};

export type ToastInput = { message: string; action?: ToastAction };

export type Toast = ToastInput & { id: number; busy: boolean };

export const TOAST_DURATION = 2600;
export const TOAST_ACTION_DURATION = 5000;

export function createToastStore() {
  let current: Toast | null = null;
  let nextId = 1;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<() => void>();

  const set = (next: Toast | null) => {
    current = next;
    for (const listener of listeners) listener();
  };

  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const schedule = (toast: Toast) => {
    clearTimer();
    timer = setTimeout(
      () => {
        timer = null;
        if (current?.id === toast.id) set(null);
      },
      toast.action ? TOAST_ACTION_DURATION : TOAST_DURATION
    );
  };

  const show = (input: ToastInput) => {
    const toast: Toast = { ...input, id: nextId++, busy: false };
    set(toast);
    schedule(toast);
  };

  const dismiss = () => {
    clearTimer();
    if (current) set(null);
  };

  const runAction = async () => {
    const toast = current;
    if (!toast?.action || toast.busy) return;
    clearTimer();
    const running: Toast = { ...toast, busy: true };
    set(running);
    try {
      await toast.action.run();
      if (current?.id === toast.id) set(null);
    } catch (cause) {
      if (current?.id !== toast.id) return;
      const failed: Toast = {
        ...toast,
        message: cause instanceof Error && cause.message ? cause.message : "ทำรายการไม่สำเร็จ",
        busy: false,
      };
      set(failed);
      schedule(failed);
    }
  };

  return {
    show,
    dismiss,
    runAction,
    getSnapshot: () => current,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type ToastStore = ReturnType<typeof createToastStore>;

/** The signed-in app's toast. */
export const toast = createToastStore();
