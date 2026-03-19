import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning'
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: 'bg-red-500/10 border-red-500/20 text-red-500',
    warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500',
    info: 'bg-accent/10 border-accent/20 text-accent'
  };

  const buttonStyles = {
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    info: 'bg-accent hover:bg-accent/90 text-accent-foreground'
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-card rounded-2xl p-6 max-w-md w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className={`w-12 h-12 rounded-full ${variantStyles[variant]} flex items-center justify-center mb-4`}>
          <AlertTriangle className="w-6 h-6" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold mb-2">{title}</h2>

        {/* Message */}
        <p className="text-muted-foreground mb-6">{message}</p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-2.5 rounded-lg transition-colors font-medium ${buttonStyles[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
