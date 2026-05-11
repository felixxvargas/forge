import figma from '@figma/code-connect';
import { BetaTag } from './BetaTag';

figma.connect(BetaTag, 'https://www.figma.com/design/FLcTOqupDgGnxDlq76K8MP/Forge?node-id=106:135', {
  example: () => <BetaTag />,
});
