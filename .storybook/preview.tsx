import type { Preview } from '@storybook/react';
import { withThemeByClassName } from '@storybook/addon-themes';
import '../app/globals.css';

const preview: Preview = {
  decorators: [
    withThemeByClassName({
      themes: { Dark: 'dark', Light: '' },
      defaultTheme: 'Dark',
    }),
    (Story, context) => {
      const isDark = (context.globals.theme ?? 'Dark') === 'Dark';
      return (
        <div style={{ background: isDark ? '#0d0d14' : '#f8f9fa', minHeight: '100vh', padding: 24 }}>
          <Story />
        </div>
      );
    },
  ],
  parameters: {
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
