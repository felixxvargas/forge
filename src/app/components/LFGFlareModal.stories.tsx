import type { Meta, StoryObj } from '@storybook/react';
import { LFGFlareModal } from './LFGFlareModal';

const meta: Meta<typeof LFGFlareModal> = {
  title: 'Components/LFGFlareModal',
  component: LFGFlareModal,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: {
    isOpen: true,
    onClose: () => {},
    onCreated: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof LFGFlareModal>;

export const LFG: Story = {
  args: { prefilledType: 'lfg' },
};

export const LFM: Story = {
  args: { prefilledType: 'lfm' },
};

export const WithGamePrefilled: Story = {
  args: {
    prefilledType: 'lfg',
    prefilledGame: { id: '119133', title: 'Elden Ring' },
  },
};

export const Closed: Story = {
  args: { isOpen: false },
};
