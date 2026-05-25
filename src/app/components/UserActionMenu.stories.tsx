import type { Meta, StoryObj } from '@storybook/react';
import { UserActionMenu } from './UserActionMenu';

const meta: Meta<typeof UserActionMenu> = {
  title: 'Components/UserActionMenu',
  component: UserActionMenu,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof UserActionMenu>;

export const Default: Story = {
  args: { userId: 'user-123', userName: 'GamerPro99' },
};
