import type { Meta, StoryObj } from '@storybook/react';
import { EditProfileModal } from './EditProfileModal';

const mockUser = {
  id: 'mock-user',
  handle: 'testuser',
  display_name: 'Test User',
  displayName: 'Test User',
  bio: 'Passionate gamer. Love RPGs and strategy games. Always looking for new adventures.',
  profile_picture: 'https://api.dicebear.com/7.x/bottts/svg?seed=forge',
  profilePicture: 'https://api.dicebear.com/7.x/bottts/svg?seed=forge',
  platforms: ['steam', 'nintendo', 'playstation'],
  platform_handles: { steam: 'testuser123', nintendo: 'TestUser-Switch' },
  social_platforms: ['bluesky', 'twitch'],
  social_handles: { bluesky: 'testuser.bsky.social', twitch: 'testuser_streams' },
  gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
};

const meta: Meta<typeof EditProfileModal> = {
  title: 'Components/EditProfileModal',
  component: EditProfileModal,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: {
    user: mockUser as any,
    onClose: () => {},
    onSave: async () => {},
  },
};

export default meta;
type Story = StoryObj<typeof EditProfileModal>;

export const Open: Story = {
  args: { isOpen: true },
};

export const Closed: Story = {
  args: { isOpen: false },
};
