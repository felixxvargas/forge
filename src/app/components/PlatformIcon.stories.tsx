import type { Meta, StoryObj } from '@storybook/react';
import { PlatformIcon } from './PlatformIcon';

const meta: Meta<typeof PlatformIcon> = {
  title: 'Components/PlatformIcon',
  component: PlatformIcon,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof PlatformIcon>;

export const Steam: Story = { args: { platform: 'steam' } };
export const PlayStation: Story = { args: { platform: 'playstation' } };
export const Nintendo: Story = { args: { platform: 'nintendo' } };
export const Xbox: Story = { args: { platform: 'xbox' } };
export const Bluesky: Story = { args: { platform: 'bluesky' } };
export const Twitch: Story = { args: { platform: 'twitch' } };
export const Discord: Story = { args: { platform: 'discord' } };

export const WithHandle: Story = {
  args: { platform: 'steam', userHandle: 'gamer123', showHandle: true },
};

export const AllGamingPlatforms: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      {['nintendo', 'playstation', 'steam', 'pc', 'mac', 'xbox', 'epic', 'ea', 'gog', 'ubisoft', 'rockstar'].map((p) => (
        <div key={p} className="flex flex-col items-center gap-1.5">
          <PlatformIcon platform={p} />
          <span className="text-xs text-muted-foreground">{p}</span>
        </div>
      ))}
    </div>
  ),
};

export const AllSocialPlatforms: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      {['bluesky', 'twitch', 'discord', 'x', 'instagram', 'threads', 'tiktok', 'youtube', 'reddit', 'mastodon', 'github', 'spotify', 'patreon'].map((p) => (
        <div key={p} className="flex flex-col items-center gap-1.5">
          <PlatformIcon platform={p} />
          <span className="text-xs text-muted-foreground">{p}</span>
        </div>
      ))}
    </div>
  ),
};
