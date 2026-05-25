import type { Meta, StoryObj } from '@storybook/react';
import { NotificationBell } from './NotificationBell';

// Storybook stories for NotificationBell.
// Note: this component reads hasUnreadNotifications + unreadNotificationCount from AppDataContext.
// Since AppDataContext requires Supabase auth, these stories use a mock decorator.

const meta: Meta<typeof NotificationBell> = {
  title: 'Components/NotificationBell',
  component: NotificationBell,
  tags: ['autodocs'],
  parameters: {
    // Replace NOTIFBELL_NODE_ID below once the Figma component is created
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/FLcTOqupDgGnxDlq76K8MP/Forge-Global-Design-System?node-id=308-338',
    },
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof NotificationBell>;

export const Default: Story = {
  args: { onClick: () => alert('Bell clicked') },
};
