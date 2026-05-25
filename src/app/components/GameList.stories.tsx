import type { Meta, StoryObj } from '@storybook/react';
import { GameList } from './GameList';
import type { Game } from '../data/data';

const games: Game[] = [
  { id: '1', title: 'Elden Ring', platform: 'steam', year: 2022, coverArt: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg' },
  { id: '2', title: "Baldur's Gate 3", platform: 'steam', year: 2023, coverArt: 'https://upload.wikimedia.org/wikipedia/en/1/12/Baldur%27s_Gate_3_cover_art.jpg' },
  { id: '3', title: 'Hades II', platform: 'steam', year: 2024, coverArt: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co7juj.jpg' },
  { id: '4', title: 'Final Fantasy XVI', platform: 'pc', year: 2023, coverArt: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co6qng.jpg' },
  { id: '5', title: 'The Legend of Zelda: Tears of the Kingdom', platform: 'nintendo', year: 2023, coverArt: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5vmg.jpg' },
  { id: '6', title: 'Street Fighter 6', platform: 'steam', year: 2023, coverArt: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co6lrd.jpg' },
];

const meta: Meta<typeof GameList> = {
  title: 'Components/GameList',
  component: GameList,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    title: 'Recently Played',
    games,
    onEdit: () => {},
    onAddGame: () => {},
    onDelete: () => {},
    onHide: () => {},
  },
  decorators: [(Story) => <div style={{ maxWidth: 640 }}><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof GameList>;

export const Default: Story = {};

export const Sortable: Story = {
  args: { sortable: true, listType: 'library' },
};

export const WithBadges: Story = {
  args: { badges: ['42h', 'PC', 'RPG'] },
};

export const ShowFirstOnly: Story = {
  args: { showFirstOnly: true, listType: 'recently-played' },
};

export const Empty: Story = {
  args: { games: [], title: 'Wishlist' },
};

export const Wishlist: Story = {
  args: { title: 'Wishlist', listType: 'wishlist', games: games.slice(0, 3) },
};
