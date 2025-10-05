import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { SendingToast } from "./SendingToast";

export type CustomToastVariant =
  | "default"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "loading";

export interface CustomToastAction {
  label?: string;
  onAction?: () => void | Promise<void>;
  closeAsAction?: boolean;
}

export interface CustomToastOptions extends CustomToastAction {
  id?: string;
  title?: string;
  description?: string;
  variant?: CustomToastVariant;
  durationMs?: number;
}

export interface CustomToast
  extends Required<
    Pick<CustomToastOptions, "id" | "title" | "description" | "variant">
  > {
  durationMs: number | null;
  label?: string;
  onAction?: () => void | Promise<void>;
  closeAsAction?: boolean;
}

interface CustomToastContextValue {
  show: (options: CustomToastOptions) => string;
  dismiss: (id: string) => void;
  success: (
    title: string,
    opts?: Omit<CustomToastOptions, "title" | "variant">,
  ) => string;
  error: (
    title: string,
    opts?: Omit<CustomToastOptions, "title" | "variant">,
  ) => string;
  info: (
    title: string,
    opts?: Omit<CustomToastOptions, "title" | "variant">,
  ) => string;
}

const CustomToastContext = createContext<CustomToastContextValue | null>(null);

export function useCustomToast() {
  const ctx = useContext(CustomToastContext);
  if (!ctx)
    throw new Error("useCustomToast must be used within CustomToastProvider");
  return ctx;
}

export function CustomToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<CustomToast[]>([]);
  const timersRef = useRef<Record<string, NodeJS.Timeout>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
    const timer = timersRef.current[id];
    if (timer) {
      clearTimeout(timer);
      delete timersRef.current[id];
    }
  }, []);

  const show = useCallback(
    (options: CustomToastOptions) => {
      const id =
        options.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const toast: CustomToast = {
        id,
        title: options.title ?? "",
        description: options.description ?? "",
        variant: options.variant ?? "default",
        durationMs:
          options.durationMs ?? (options.variant === "loading" ? null : 4000),
        label: options.label,
        onAction: options.onAction,
        closeAsAction: options.closeAsAction,
      };

      setToasts((prev) => [toast, ...prev]);

      if (toast.durationMs && toast.durationMs > 0) {
        timersRef.current[id] = setTimeout(() => dismiss(id), toast.durationMs);
      }

      return id;
    },
    [dismiss],
  );

  const success = useCallback(
    (title: string, opts?: Omit<CustomToastOptions, "title" | "variant">) =>
      show({ ...opts, title, variant: "success" }),
    [show],
  );
  const error = useCallback(
    (title: string, opts?: Omit<CustomToastOptions, "title" | "variant">) =>
      show({ ...opts, title, variant: "error" }),
    [show],
  );
  const info = useCallback(
    (title: string, opts?: Omit<CustomToastOptions, "title" | "variant">) =>
      show({ ...opts, title, variant: "info" }),
    [show],
  );

  const value = useMemo<CustomToastContextValue>(
    () => ({ show, dismiss, success, error, info }),
    [dismiss, error, info, show, success],
  );

  return (
    <CustomToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </CustomToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: CustomToast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-end justify-center gap-2 p-4 sm:items-end sm:justify-end">
      <div className="pointer-events-auto mr-2 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
        ))}
      </div>
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: CustomToast;
  onDismiss: () => void;
}) {
  const isActionClose = toast.closeAsAction && toast.onAction;

  return (
    <SendingToast
      onClose={async () => {
        if (isActionClose && toast.onAction) {
          await toast.onAction();
        }
        onDismiss();
      }}
      countdown={getCountdownFromDescription(toast.description)}
    />
  );
}

function getCountdownFromDescription(description: string): number | undefined {
  // Try to extract a number like "5 seconds" from description
  const match = description.match(/(\d+)\s*seconds?/i);
  if (match) {
    const value = parseInt(match[1], 10);
    if (!Number.isNaN(value)) return value;
  }
  return undefined;
}

// Reserved for future variant-specific rendering
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const variantClasses: Record<CustomToastVariant, string> = {
  default: "",
  success: "",
  error: "",
  warning: "",
  info: "",
  loading: "",
};
