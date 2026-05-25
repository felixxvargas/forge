import type { Meta, StoryObj } from '@storybook/react';
import { LoginModule } from './LoginModule';

const meta: Meta<typeof LoginModule> = {
  title: 'Components/LoginModule',
  component: LoginModule,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  args: {
    onSuccess: () => alert('Login success'),
  },
};

export default meta;
type Story = StoryObj<typeof LoginModule>;

export const Page: Story = {
  args: { variant: 'page' },
  decorators: [(Story) => <div style={{ width: 480 }}><Story /></div>],
};

export const Sidebar: Story = {
  args: { variant: 'sidebar' },
  decorators: [(Story) => <div style={{ width: 300 }}><Story /></div>],
};
