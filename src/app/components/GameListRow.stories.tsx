import type { Meta, StoryObj } from '@storybook/react';
import { GameListRow } from './GameListRow';

const meta: Meta<typeof GameListRow> = {
  title: 'Components/GameListRow',
  component: GameListRow,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof GameListRow>;

const FakeCard = ({ title }: { title: string }) => (
  <div className="flex items-center gap-3 p-3 bg-card rounded-lg">
    <div className="w-10 h-14 bg-muted rounded shrink-0" />
    <div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">2023</p>
    </div>
  </div>
);

export const Default: Story = {
  render: () => (
    <GameListRow>
      <FakeCard title="Elden Ring" />
      <FakeCard title="Baldur's Gate 3" />
      <FakeCard title="Hades II" />
    </GameListRow>
  ),
};

export const Inset: Story = {
  render: () => (
    <GameListRow inset>
      <FakeCard title="Final Fantasy XVI" />
      <FakeCard title="Street Fighter 6" />
    </GameListRow>
  ),
};
