import figma from '@figma/code-connect';
import { Header } from './Header';

figma.connect(Header, 'https://www.figma.com/design/FLcTOqupDgGnxDlq76K8MP/Forge?node-id=83:50', {
  props: {
    showNotifications: figma.enum('state', {
      'Default': false,
      'Has Notifications': true,
    }),
    showSettings: figma.boolean('showSettings'),
  },
  example: ({ showNotifications, showSettings }) => (
    <Header showNotifications={showNotifications} showSettings={showSettings} />
  ),
});
