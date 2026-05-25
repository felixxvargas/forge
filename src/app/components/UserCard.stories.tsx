import type { Meta, StoryObj } from '@storybook/react';
import { UserCard } from './UserCard';

const mockUser = {
  id: 'user-123',
  handle: 'testuser',
  displayName: 'Test User',
  display_name: 'Test User',
  bio: 'Passionate gamer and streamer. Love RPGs and strategy games.',
  profilePicture: 'https://api.dicebear.com/7.x/bottts/svg?seed=forge',
  profile_picture: 'https://api.dicebear.com/7.x/bottts/svg?seed=forge',
  platforms: ['steam', 'nintendo'],
  socialPlatforms: ['bluesky'],
  followerCount: 234,
  followingCount: 89,
  gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
};

const noAvatarUser = {
  ...mockUser,
  id: 'user-456',
  handle: 'anonymousgamer',
  displayName: 'Anonymous Gamer',
  display_name: 'Anonymous Gamer',
  profilePicture: '',
  profile_picture: '',
  bio: 'Just here to play games.',
};

const meta: Meta<typeof UserCard> = {
  title: 'Components/UserCard',
  component: UserCard,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof UserCard>;

export const Default: Story = {
  args: { user: mockUser as any },
};

export const NoAvatar: Story = {
  args: { user: noAvatarUser as any },
};

export const GridPreview: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
      <UserCard user={mockUser as any} />
      <UserCard user={noAvatarUser as any} />
      <UserCard user={{ ...mockUser, id: 'u3', handle: 'raidleader', display_name: 'Raid Leader', followerCount: 1204 } as any} />
      <UserCard user={{ ...mockUser, id: 'u4', handle: 'casual_gamer', display_name: 'Casual Gamer', followerCount: 12 } as any} />
    </div>
  ),
};
