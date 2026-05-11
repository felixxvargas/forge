import figma from '@figma/code-connect';
import { GameCard } from './GameCard';

figma.connect(GameCard, 'https://www.figma.com/design/FLcTOqupDgGnxDlq76K8MP/Forge?node-id=115:148', {
  props: {
    fullWidth: figma.enum('size', {
      'Full': true,
      'Default': false,
    }),
    showHours: figma.boolean('showHours'),
  },
  example: ({ fullWidth, showHours }) => (
    <GameCard
      game={{ id: 'example', title: 'Example Game', coverArt: '' }}
      fullWidth={fullWidth}
      showHours={showHours}
    />
  ),
});
