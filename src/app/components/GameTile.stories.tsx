import type { Meta, StoryObj } from '@storybook/react';
import { GameTile } from './GameTile';

const exampleGame = {
  id: '1942',
  title: 'Elden Ring',
  year: 2022,
  artwork: [
    {
      artwork_type: 'cover',
      url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg',
    },
  ],
};

const longTitleGame = {
  id: '119388',
  title: 'The Legend of Zelda: Tears of the Kingdom',
  year: 2023,
  artwork: [
    {
      artwork_type: 'cover',
      url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5vmg.jpg',
    },
  ],
};

const noArtGame = {
  id: '9999',
  title: 'Unknown Game',
  year: 2024,
  artwork: [],
};

const meta: Meta<typeof GameTile> = {
  title: 'Components/GameTile',
  component: GameTile,
  tags: ['autodocs'],
  parameters: {
    // Replace GAMETILE_NODE_ID below once the Figma component is created
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/FLcTOqupDgGnxDlq76K8MP/Forge-Global-Design-System?node-id=306-338',
    },
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 160 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GameTile>;

export const Default: Story = {
  args: { game: exampleGame, postCount: 7, showPostCount: true, onClick: () => alert('Navigate to game') },
};

export const NoChip: Story = {
  args: { game: exampleGame, postCount: 0, showPostCount: false, onClick: () => alert('Navigate to game') },
};

export const WithBadge: Story = {
  args: { game: exampleGame, postCount: 7, showPostCount: true, onClick: () => alert('Navigate to game') },
};

export const HighScore: Story = {
  args: { game: exampleGame, postCount: 42, showPostCount: true, onClick: () => alert('Navigate to game') },
};

export const LongTitle: Story = {
  args: { game: longTitleGame, postCount: 3, showPostCount: true, onClick: () => alert('Navigate to game') },
};

export const NoArtwork: Story = {
  args: { game: noArtGame, postCount: 0, showPostCount: false, onClick: () => alert('Navigate to game') },
};

export const GridPreview: Story = {
  decorators: [
    (Story) => (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 160px)', gap: 16 }}>
        {[exampleGame, longTitleGame, exampleGame, longTitleGame].map((g, i) => (
          <GameTile key={i} game={{ ...g, id: String(i) }} postCount={i * 3} showPostCount={true} onClick={() => {}} />
        ))}
      </div>
    ),
  ],
  args: { game: exampleGame, onClick: () => {} },
};
