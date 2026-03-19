import { useTheme as useForgeTheme } from '../../context/ThemeContext';
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useForgeTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      toastOptions={{
        style: {
          background: 'rgb(17, 24, 39)',
          color: 'rgb(255, 255, 255)',
          border: '1px solid rgb(55, 65, 81)',
        },
        className: 'font-sans',
      }}
      {...props}
    />
  );
};

export { Toaster };