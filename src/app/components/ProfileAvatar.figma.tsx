import figma from '@figma/code-connect';
import { ProfileAvatar } from './ProfileAvatar';

figma.connect(ProfileAvatar, 'https://www.figma.com/design/FLcTOqupDgGnxDlq76K8MP/Forge?node-id=68:18', {
  props: {
    size: figma.enum('size', {
      'Small': 'sm',
      'Medium': 'md',
      'Large': 'lg',
      'XL': 'xl',
    }),
  },
  example: ({ size }) => (
    <ProfileAvatar username="gamertag" size={size} />
  ),
});
