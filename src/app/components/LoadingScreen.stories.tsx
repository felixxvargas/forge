import type { Meta, StoryObj } from '@storybook/react';
import { LoadingScreen } from './LoadingScreen';

const meta: Meta<typeof LoadingScreen> = {
  title: 'Components/LoadingScreen',
  component: LoadingScreen,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof LoadingScreen>;

export const Default: Story = {};

export const FeedPath: Story = {
  args: { path: '/feed' },
};

export const ProfilePath: Story = {
  args: { path: '/profile/testuser' },
};

export const ExplorePath: Story = {
  args: { path: '/explore' },
};
