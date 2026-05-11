import figma from '@figma/code-connect';
import { Button } from './button';

figma.connect(Button, 'https://www.figma.com/design/FLcTOqupDgGnxDlq76K8MP/Forge?node-id=67:34', {
  props: {
    variant: figma.enum('variant', {
      'Default': 'default',
      'Destructive': 'destructive',
      'Outline': 'outline',
      'Secondary': 'secondary',
      'Ghost': 'ghost',
      'Link': 'link',
    }),
    size: figma.enum('size', {
      'Default': 'default',
      'Small': 'sm',
      'Large': 'lg',
      'Icon': 'icon',
    }),
  },
  example: ({ variant, size }) => (
    <Button variant={variant} size={size}>
      Label
    </Button>
  ),
});
