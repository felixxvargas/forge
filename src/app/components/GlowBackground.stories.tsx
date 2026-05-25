import type { Meta, StoryObj } from '@storybook/react';
import { GlowBackground } from './GlowBackground';

const meta: Meta<typeof GlowBackground> = {
  title: 'Components/GlowBackground',
  component: GlowBackground,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', backgrounds: { disable: true } },
};

export default meta;
type Story = StoryObj<typeof GlowBackground>;

export const Default: Story = {
  render: () => (
    <div style={{ position: 'relative', height: '100vh', background: '#0d0d14' }}>
      <GlowBackground />
      <div style={{ position: 'relative', zIndex: 1, padding: 40 }}>
        <h1 className="text-2xl font-bold text-foreground">Content over glow</h1>
        <p className="text-muted-foreground mt-2">The ambient purple glow sits behind all page content.</p>
      </div>
    </div>
  ),
};
