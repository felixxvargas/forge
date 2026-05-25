import type { Meta, StoryObj } from '@storybook/react';
import { ProfilePictureLightbox } from './ProfilePictureLightbox';

const meta: Meta<typeof ProfilePictureLightbox> = {
  title: 'Components/ProfilePictureLightbox',
  component: ProfilePictureLightbox,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: {
    isOpen: true,
    onClose: () => {},
    username: 'testuser',
  },
};

export default meta;
type Story = StoryObj<typeof ProfilePictureLightbox>;

export const WithAvatar: Story = {
  args: { profilePicture: 'https://api.dicebear.com/7.x/bottts/svg?seed=forge' },
};

export const NoAvatar: Story = {
  args: { profilePicture: undefined },
};

export const Closed: Story = {
  args: { isOpen: false },
};
