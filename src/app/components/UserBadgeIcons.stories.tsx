import type { Meta, StoryObj } from '@storybook/react';
import { UserBadgeIcons } from './UserBadgeIcons';

const meta: Meta<typeof UserBadgeIcons> = {
  title: 'Components/UserBadgeIcons',
  component: UserBadgeIcons,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof UserBadgeIcons>;

export const NewAccount: Story = {
  args: { handle: 'newuser', createdAt: new Date().toISOString() },
};

export const EstablishedAccount: Story = {
  args: { handle: 'veteran', createdAt: '2020-01-01T00:00:00Z' },
};
