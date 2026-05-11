import figma from '@figma/code-connect';
import { BottomNav } from './BottomNav';

figma.connect(BottomNav, 'https://www.figma.com/design/FLcTOqupDgGnxDlq76K8MP/Forge?node-id=83:2', {
  example: () => <BottomNav />,
});
