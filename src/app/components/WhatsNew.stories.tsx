import type { Meta, StoryObj } from '@storybook/react';
import { WhatsNewModal } from './WhatsNew';

const meta: Meta<typeof WhatsNewModal> = {
  title: 'Components/WhatsNewModal',
  component: WhatsNewModal,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => {
      // Clear the seen flag so the modal always renders in Storybook
      if (typeof window !== 'undefined') {
        localStorage.removeItem('forge-whats-new-seen');
      }
      return <Story />;
    },
  ],
};

export default meta;
type Story = StoryObj<typeof WhatsNewModal>;

export const Default: Story = {};
