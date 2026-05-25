import type { Meta, StoryObj } from '@storybook/react';
import { FollowButton } from './FollowButton';

const meta: Meta<typeof FollowButton> = {
  title: 'Components/FollowButton',
  component: FollowButton,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  args: {
    userId: 'user-123',
    onFollowChange: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof FollowButton>;

export const Unfollowed: Story = {
  args: { initialFollowingState: false },
};

export const Following: Story = {
  args: { initialFollowingState: true },
};

export const Small: Story = {
  args: { size: 'sm', initialFollowingState: false },
};

export const Large: Story = {
  args: { size: 'lg', initialFollowingState: false },
};

export const Outline: Story = {
  args: { variant: 'outline', initialFollowingState: false },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <FollowButton userId="u1" size="sm" />
      <FollowButton userId="u2" size="md" />
      <FollowButton userId="u3" size="lg" />
    </div>
  ),
};
