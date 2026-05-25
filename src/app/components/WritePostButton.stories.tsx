import type { Meta, StoryObj } from '@storybook/react';
import { WritePostButton } from './WritePostButton';

const meta: Meta<typeof WritePostButton> = {
  title: 'Components/WritePostButton',
  component: WritePostButton,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof WritePostButton>;

export const Default: Story = {};
