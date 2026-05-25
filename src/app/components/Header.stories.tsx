import type { Meta, StoryObj } from '@storybook/react';
import { Header } from './Header';

const meta: Meta<typeof Header> = {
  title: 'Components/Header',
  component: Header,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof Header>;

export const Default: Story = {
  args: { title: 'Explore' },
};

export const WithNotifications: Story = {
  args: { title: 'Feed', showNotifications: true },
};

export const WithSettings: Story = {
  args: { title: 'Settings', showSettings: true },
};

export const NoTitle: Story = {
  args: { showNotifications: true, showSettings: true },
};
