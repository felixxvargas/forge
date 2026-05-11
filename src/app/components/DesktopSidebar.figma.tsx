import figma from '@figma/code-connect';
import { DesktopSidebar } from './DesktopSidebar';

figma.connect(DesktopSidebar, 'https://www.figma.com/design/FLcTOqupDgGnxDlq76K8MP/Forge?node-id=137:317', {
  example: () => <DesktopSidebar />,
});
