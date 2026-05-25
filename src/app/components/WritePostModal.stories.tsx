import type { Meta, StoryObj } from '@storybook/react';
import { WritePostModal } from './WritePostModal';

const meta: Meta<typeof WritePostModal> = {
  title: 'Components/WritePostModal',
  component: WritePostModal,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof WritePostModal>;

export const Open: Story = {
  args: { isOpen: true, onClose: () => {} },
};

export const Closed: Story = {
  args: { isOpen: false, onClose: () => {} },
};
