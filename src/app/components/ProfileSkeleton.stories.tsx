import type { Meta, StoryObj } from '@storybook/react';
import { ProfileSkeleton } from './ProfileSkeleton';

const meta: Meta<typeof ProfileSkeleton> = {
  title: 'Components/ProfileSkeleton',
  component: ProfileSkeleton,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ProfileSkeleton>;

export const Default: Story = {};
