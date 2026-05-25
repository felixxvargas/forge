import type { Meta, StoryObj } from '@storybook/react';
import { ShareModal } from './ShareModal';

const mockPost = {
  id: 'post-1',
  userId: 'mock-user',
  content: 'Just hit 100 hours in Elden Ring. Still discovering new areas!',
  platform: 'forge' as const,
  timestamp: new Date(),
  likes: 24,
  reposts: 6,
  comments: 8,
};

const meta: Meta<typeof ShareModal> = {
  title: 'Components/ShareModal',
  component: ShareModal,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: {
    isOpen: true,
    onClose: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof ShareModal>;

export const SharePost: Story = {
  args: { post: mockPost as any },
};

export const ShareUser: Story = {
  args: {
    user: { handle: 'testuser', display_name: 'Test User', id: 'mock-user' } as any,
  },
};

export const ShareGame: Story = {
  args: {
    game: {
      title: 'Elden Ring',
      id: '119133',
      coverArt: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg',
    } as any,
  },
};

export const Closed: Story = {
  args: { isOpen: false },
};
