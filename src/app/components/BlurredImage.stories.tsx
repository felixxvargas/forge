import type { Meta, StoryObj } from '@storybook/react';
import { BlurredImage } from './BlurredImage';

const SAMPLE = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80';

const meta: Meta<typeof BlurredImage> = {
  title: 'Components/BlurredImage',
  component: BlurredImage,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  decorators: [(Story) => <div style={{ width: 360 }}><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof BlurredImage>;

export const Visible: Story = {
  args: { src: SAMPLE, alt: 'Gaming setup', isBlurred: false },
};

export const Blurred: Story = {
  args: { src: SAMPLE, alt: 'Sensitive content', isBlurred: true },
};
