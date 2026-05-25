import type { Meta, StoryObj } from '@storybook/react';
import { BottomNav } from './BottomNav';

const meta: Meta<typeof BottomNav> = {
  title: 'Components/BottomNav',
  component: BottomNav,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', height: '100vh' }}>
        <div className="flex-1 p-4">
          <p className="text-muted-foreground text-sm">Page content area</p>
        </div>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BottomNav>;

export const Default: Story = {};
