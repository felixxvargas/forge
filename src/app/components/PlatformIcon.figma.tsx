import figma from '@figma/code-connect';
import { PlatformIcon } from './PlatformIcon';

figma.connect(PlatformIcon, 'https://www.figma.com/design/FLcTOqupDgGnxDlq76K8MP/Forge?node-id=124:188', {
  example: () => <PlatformIcon platform="discord" />,
});
