import type { Meta, StoryObj } from '@storybook/react';
import { ProfileAvatar } from './ProfileAvatar';

const meta: Meta<typeof ProfileAvatar> = {
  title: 'Components/ProfileAvatar',
  component: ProfileAvatar,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
  },
};

export default meta;
type Story = StoryObj<typeof ProfileAvatar>;

export const InitialsOnly: Story = {
  args: { username: 'ForgeUser', size: 'md' },
};

export const WithAvatar: Story = {
  args: {
    username: 'ForgeUser',
    profilePicture: 'https://api.dicebear.com/7.x/bottts/svg?seed=forge',
    size: 'md',
  },
};

export const Small: Story = {
  args: { username: 'TK', size: 'sm' },
};

export const Large: Story = {
  args: { username: 'GuildLeader', size: 'lg' },
};

export const ExtraLarge: Story = {
  args: { username: 'ProGamer99', size: 'xl' },
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      {(['sm', 'md', 'lg', 'xl'] as const).map(size => (
        <ProfileAvatar key={size} username="Forge" size={size} />
      ))}
    </div>
  ),
};
