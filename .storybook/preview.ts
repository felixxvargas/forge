import type { Preview } from '@storybook/react';
import '../app/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0d0d14' },
        { name: 'card', value: '#16151f' },
        { name: 'light', value: '#f8f9fa' },
      ],
    },
  },
};

export default preview;
