import figma from '@figma/code-connect';
import { LFGFlareModal } from './LFGFlareModal';

figma.connect(LFGFlareModal, 'https://www.figma.com/design/FLcTOqupDgGnxDlq76K8MP/Forge?node-id=123:170', {
  example: () => <LFGFlareModal />,
});
