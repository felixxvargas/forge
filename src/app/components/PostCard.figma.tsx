import figma from '@figma/code-connect';
import { PostCard } from './PostCard';

figma.connect(PostCard, 'https://www.figma.com/design/FLcTOqupDgGnxDlq76K8MP/Forge?node-id=70:2', {
  example: () => <PostCard />,
});
