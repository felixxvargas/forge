import type { Meta, StoryObj } from '@storybook/react';
import { DesktopSidebar } from './DesktopSidebar';
import { SidebarProvider } from '../context/SidebarContext';

const meta: Meta<typeof DesktopSidebar> = {
  title: 'Components/DesktopSidebar',
  component: DesktopSidebar,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', height: '100vh' }}>
        <SidebarProvider>
          <Story />
          <div className="flex-1 p-6">
            <p className="text-muted-foreground text-sm">Hover the sidebar to expand it</p>
          </div>
        </SidebarProvider>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DesktopSidebar>;

export const Default: Story = {};
