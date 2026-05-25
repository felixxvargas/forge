import type { Meta, StoryObj } from '@storybook/react';
import { GameCard } from './GameCard';
import type { Game } from '../data/data';

const eldenRing: Game = {
  id: '119133',
  title: 'Elden Ring',
  platform: 'steam',
  year: 2022,
  coverArt: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg',
};

const baldursGate: Game = {
  id: '119388',
  title: "Baldur's Gate 3",
  platform: 'steam',
  year: 2023,
  coverArt: 'https://upload.wikimedia.org/wikipedia/en/1/12/Baldur%27s_Gate_3_cover_art.jpg',
};

const longTitle: Game = {
  id: '119999',
  title: 'The Legend of Zelda: Tears of the Kingdom',
  platform: 'nintendo',
  year: 2023,
  coverArt: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5vmg.jpg',
};

const meta: Meta<typeof GameCard> = {
  title: 'Components/GameCard',
  component: GameCard,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  decorators: [(Story) => <div style={{ width: 160 }}><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof GameCard>;

export const Default: Story = {
  args: { game: eldenRing },
};

export const WithHours: Story = {
  args: { game: eldenRing, showHours: true },
};

export const LongTitle: Story = {
  args: { game: longTitle },
};

export const FullWidth: Story = {
  decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>],
  args: { game: baldursGate, fullWidth: true },
};

export const GridPreview: Story = {
  decorators: [
    (Story) => (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 160px)', gap: 16 }}>
        {[eldenRing, baldursGate, longTitle].map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
      </div>
    ),
  ],
  args: { game: eldenRing },
};
