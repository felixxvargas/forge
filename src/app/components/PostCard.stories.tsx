import type { Meta, StoryObj } from '@storybook/react';
import { PostCard } from './PostCard';
import type { Post, User } from '../data/data';

const mockUser: User = {
  id: 'mock-user',
  handle: 'testuser',
  displayName: 'Test User',
  bio: 'Passionate gamer',
  profilePicture: 'https://api.dicebear.com/7.x/bottts/svg?seed=forge',
  platforms: ['steam'],
  socialPlatforms: ['bluesky'],
  gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
} as any;

const basePost: Post = {
  id: 'post-1',
  userId: 'mock-user',
  content: 'Just finished Elden Ring for the third time and it keeps getting better. The lore in this game is absolutely unmatched — FromSoftware really outdid themselves.',
  platform: 'forge',
  timestamp: new Date(Date.now() - 1000 * 60 * 45),
  likes: 24,
  reposts: 6,
  comments: 8,
};

const meta: Meta<typeof PostCard> = {
  title: 'Components/PostCard',
  component: PostCard,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div style={{ maxWidth: 600 }}><Story /></div>],
  args: {
    post: basePost,
    user: mockUser,
    onLike: () => {},
    onRepost: () => {},
    onComment: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof PostCard>;

export const TextPost: Story = {};

export const WithImage: Story = {
  args: {
    post: {
      ...basePost,
      id: 'post-2',
      content: 'Just hit 200 hours. Still finding new areas!',
      images: ['https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc8gbf.jpg'],
    },
  },
};

export const TaggedGame: Story = {
  args: {
    post: {
      ...basePost,
      id: 'post-3',
      content: 'This game never gets old.',
      game_title: 'Elden Ring',
      game_id: '119133',
    },
  },
};

export const Liked: Story = {
  args: {
    isLiked: true,
    post: { ...basePost, id: 'post-4', likes: 25 },
  },
};

export const DetailView: Story = {
  args: {
    post: {
      ...basePost,
      id: 'post-5',
      content: 'Long-form thoughts on Elden Ring after 200 hours. The open world design is a masterclass in environmental storytelling. Every corner has a secret, every boss has a backstory. This is what open world games should aspire to.',
      likes: 142,
      reposts: 38,
      comments: 29,
    },
    isDetailView: true,
    showDelete: true,
  },
};

export const FromBluesky: Story = {
  args: {
    post: {
      ...basePost,
      id: 'post-6',
      platform: 'bluesky',
      content: 'Playing Elden Ring tonight — come hang 🎮',
      external_url: 'https://bsky.app/profile/testuser.bsky.social/post/abc123',
    },
  },
};

export const Repost: Story = {
  args: {
    post: {
      ...basePost,
      id: 'post-7',
      repostedBy: 'friend-user',
    },
  },
};
