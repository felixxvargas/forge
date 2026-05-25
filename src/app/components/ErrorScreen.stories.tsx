import type { Meta, StoryObj } from '@storybook/react';
import { ErrorScreen } from './ErrorScreen';

const meta: Meta<typeof ErrorScreen> = {
  title: 'Components/ErrorScreen',
  component: ErrorScreen,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ErrorScreen>;

export const Default: Story = {
  args: { error: new Error('Something went wrong') },
};

export const NotFound: Story = {
  args: { is404: true, title: 'Page not found', description: "The page you're looking for doesn't exist or has been moved." },
};

export const WithReset: Story = {
  args: {
    error: new Error('Failed to load data'),
    reset: () => alert('Retry triggered'),
    title: 'Failed to load',
    description: 'We could not load this content. Please try again.',
  },
};

export const CustomMessage: Story = {
  args: {
    error: new Error('Network error'),
    title: 'Connection error',
    description: 'Check your internet connection and try again.',
    reset: () => alert('Retry triggered'),
  },
};
