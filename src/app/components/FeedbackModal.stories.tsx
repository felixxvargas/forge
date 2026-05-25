import type { Meta, StoryObj } from '@storybook/react';
import { FeedbackModal } from './FeedbackModal';

const meta: Meta<typeof FeedbackModal> = {
  title: 'Components/FeedbackModal',
  component: FeedbackModal,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof FeedbackModal>;

export const Open: Story = {
  args: { onClose: () => {} },
};
