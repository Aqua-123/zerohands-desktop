import { useState, useCallback, useRef, useEffect } from 'react';
import { useCustomToast } from '@/components/ui/custom-toast/CustomToastProvider';

interface UndoSendOptions<T = unknown> {
  onSend: (data: T) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}
const undoDuration = 5;

export function useUndoSend<T = unknown>({
  onSend,
  onSuccess,
  onError,
  successMessage = 'Email sent successfully!',
  errorMessage = 'Failed to send email',
}: UndoSendOptions<T>) {
  const [isSending, setIsSending] = useState(false);
  const [pendingData, setPendingData] = useState<T | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastIdRef = useRef<string | null>(null);
  const { show, dismiss, success, error: errorToast } = useCustomToast();
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
      if (toastIdRef.current) {
        dismiss(toastIdRef.current);
      }
    };
  }, [dismiss]);

  const cancelSend = useCallback(() => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
    if (toastIdRef.current) {
      dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
    setPendingData(null);
    setIsSending(false);
    // Do not show a follow-up toast on cancel to avoid reappearing UI
  }, [dismiss]);

  const executeSend = useCallback(
    async (data: T) => {
      try {
        await onSend(data);
        success(successMessage, { durationMs: 3000 });
        onSuccess?.();
      } catch (error) {
        console.error('Error sending:', error);
        errorToast(error instanceof Error ? error.message : errorMessage);
        onError?.(error instanceof Error ? error : new Error(errorMessage));
      } finally {
        setIsSending(false);
        setPendingData(null);
        undoTimeoutRef.current = null;
        toastIdRef.current = null;
      }
    },
    [onSend, onSuccess, onError, successMessage, errorMessage, errorToast, success]
  );

  const sendWithUndo = useCallback(
    async (data: T) => {
      setIsSending(true);
      setPendingData(data);

      // Show undo toast with cross-as-action = Undo
      const toastId = `undo-send-${Date.now()}`;
      toastIdRef.current = show({
        id: toastId,
        title: 'Sending...',
        description: `Your message will be sent in ${undoDuration} seconds`,
        variant: 'info',
        label: 'Undo',
        closeAsAction: true,
        onAction: () => cancelSend(),
        durationMs: undoDuration * 1000,
      });

      // Set timeout to actually send
      undoTimeoutRef.current = setTimeout(async () => {
        if (toastIdRef.current) {
          dismiss(toastIdRef.current);
        }
        await executeSend(data);
      }, undoDuration * 1000);
    },
    [executeSend, cancelSend, dismiss, show]
  );

  return {
    sendWithUndo,
    cancelSend,
    isSending,
    hasPendingSend: !!pendingData,
  };
}
