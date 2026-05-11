import figma from '@figma/code-connect';
import { WritePostButton } from './WritePostButton';

figma.connect(WritePostButton, 'https://www.figma.com/design/FLcTOqupDgGnxDlq76K8MP/Forge?node-id=75:14', {
  example: () => <WritePostButton />,
});
