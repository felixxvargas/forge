import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      toastOptions={{
        style: {
          background: 'var(--card)',
          color: 'var(--card-foreground)',
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          fontSize: '0.875rem',
        },
        classNames: {
          title: 'font-medium',
          description: 'text-muted-foreground',
          closeButton: 'text-muted-foreground hover:text-foreground',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };