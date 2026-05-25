import type { Meta, StoryObj } from '@storybook/react';
import { ConfirmationModal } from './ConfirmationModal';

const meta: Meta<typeof ConfirmationModal> = {
  title: 'Components/ConfirmationModal',
  component: ConfirmationModal,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  args: {
    isOpen: true,
    onClose: () => {},
    onConfirm: () => {},
    title: 'Confirm Action',
    message: 'Are you sure you want to continue? This will apply your changes.',
  },
};

export default meta;
type Story = StoryObj<typeof ConfirmationModal>;

export const Info: Story = {
  args: { variant: 'info', title: 'Save Changes', message: 'Your profile will be updated with the new information.' },
};

export const Warning: Story = {
  args: { variant: 'warning', title: 'Remove Game', message: 'This will remove Elden Ring from your library. You can re-add it any time.', confirmText: 'Remove', cancelText: 'Keep' },
};

export const Danger: Story = {
  args: { variant: 'danger', title: 'Delete Account', message: 'This will permanently delete your Forge account and all your posts, lists, and data. This cannot be undone.', confirmText: 'Delete Forever', cancelText: 'Keep My Account' },
};

export const Closed: Story = {
  args: { isOpen: false },
};
