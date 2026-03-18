import { toast } from 'sonner';

/**
 * Show a success toast message
 */
export function showSuccess(message: string) {
  toast.success(message, {
    duration: 3000,
  });
}

/**
 * Show an error toast message
 */
export function showError(message: string) {
  toast.error(message, {
    duration: 4000,
  });
}

/**
 * Show an info toast message
 */
export function showInfo(message: string) {
  toast.info(message, {
    duration: 3000,
  });
}

/**
 * Show a loading toast message
 */
export function showLoading(message: string) {
  return toast.loading(message);
}

/**
 * Dismiss a specific toast
 */
export function dismissToast(toastId: string | number) {
  toast.dismiss(toastId);
}

/**
 * Handle API errors gracefully - extract user-friendly message and show toast
 */
export function handleApiError(error: any, fallbackMessage = 'Something went wrong') {
  const message = error?.message || fallbackMessage;
  showError(message);
  console.error('API Error:', error);
}
