import type { Meta, StoryObj } from '@storybook/react';
import { Top8Games } from './Top8Section';

const meta: Meta<typeof Top8Games> = {
  title: 'Components/Top8Games',
  component: Top8Games,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div style={{ maxWidth: 640 }}><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof Top8Games>;

export const OwnProfile: Story = {
  args: {
    gameIds: ['119133', '119388', '119999'],
    isOwnProfile: true,
    onManage: () => {},
  },
};

export const ViewOnly: Story = {
  args: {
    gameIds: ['119133', '119388'],
    isOwnProfile: false,
  },
};

export const Empty: Story = {
  args: {
    gameIds: [],
    isOwnProfile: true,
    onManage: () => {},
  },
};
