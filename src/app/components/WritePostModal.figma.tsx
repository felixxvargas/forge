import figma from '@figma/code-connect';
import { WritePostModal } from './WritePostModal';

figma.connect(WritePostModal, 'https://www.figma.com/design/FLcTOqupDgGnxDlq76K8MP/Forge?node-id=122:170', {
  example: () => <WritePostModal />,
});
