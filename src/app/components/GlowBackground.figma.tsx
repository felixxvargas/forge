import figma from '@figma/code-connect';
import { GlowBackground } from './GlowBackground';

figma.connect(GlowBackground, 'https://www.figma.com/design/FLcTOqupDgGnxDlq76K8MP/Forge?node-id=80:12', {
  example: () => <GlowBackground />,
});
