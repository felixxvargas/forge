import type { Meta, StoryObj } from '@storybook/react';
import { Top8Friends } from './Top8Section';

const meta: Meta<typeof Top8Friends> = {
  title: 'Components/Top8Friends',
  component: Top8Friends,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div style={{ maxWidth: 640 }}><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof Top8Friends>;

export const OwnProfile: Story = {
  args: {
    friendIds: ['user-1', 'user-2', 'user-3', 'user-4'],
    isOwnProfile: true,
    canAdd: true,
    onAdd: () => {},
    onRemove: () => {},
  },
};

export const ViewOnly: Story = {
  args: {
    friendIds: ['user-1', 'user-2', 'user-3'],
    isOwnProfile: false,
    canAdd: false,
  },
};

export const Empty: Story = {
  args: {
    friendIds: [],
    isOwnProfile: true,
    canAdd: true,
    onAdd: () => {},
  },
};

export const Full: Story = {
  args: {
    friendIds: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8'],
    isOwnProfile: true,
    canAdd: false,
    onAdd: () => {},
    onRemove: () => {},
  },
};
