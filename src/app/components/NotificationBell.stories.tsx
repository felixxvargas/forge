import type { Meta, StoryObj } from '@storybook/react';
import { NotificationBell } from './NotificationBell';

const meta: Meta<typeof NotificationBell> = {
  title: 'Components/NotificationBell',
  component: NotificationBell,
  tags: ['autodocs'],
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/FLcTOqupDgGnxDlq76K8MP/Forge-Global-Design-System?node-id=308-338',
    },
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof NotificationBell>;

export const NoUnread: Story = {
  args: { onClick: () => alert('Bell clicked'), hasUnreadNotifications: false, unreadNotificationCount: 0 },
};

export const WithCount: Story = {
  args: { onClick: () => alert('Bell clicked'), hasUnreadNotifications: true, unreadNotificationCount: 3 },
};

export const HighCount: Story = {
  args: { onClick: () => alert('Bell clicked'), hasUnreadNotifications: true, unreadNotificationCount: 150 },
};
