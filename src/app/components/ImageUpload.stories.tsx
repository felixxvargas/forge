import type { Meta, StoryObj } from '@storybook/react';
import { ImageUpload } from './ImageUpload';

const meta: Meta<typeof ImageUpload> = {
  title: 'Components/ImageUpload',
  component: ImageUpload,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  args: {
    onUpload: (url) => alert(`Upload complete: ${url}`),
    onRemove: () => alert('Image removed'),
    onUploadingChange: () => {},
  },
  decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof ImageUpload>;

export const Empty: Story = {};

export const WithExistingImage: Story = {
  args: { existingUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=forge' },
};

export const AvatarBucket: Story = {
  args: { bucketType: 'avatar' },
};

export const PostBucket: Story = {
  args: { bucketType: 'post', accept: 'image/*', maxSizeMB: 10 },
};
