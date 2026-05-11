import figma from '@figma/code-connect';
import { GameList } from './GameList';

figma.connect(GameList, 'https://www.figma.com/design/FLcTOqupDgGnxDlq76K8MP/Forge?node-id=117:172', {
  example: () => <GameList title="My Games" games={[]} />,
});
