import type { Meta, StoryObj } from '@storybook/react';
import { AuthShell } from './AuthShell';

const meta: Meta<typeof AuthShell> = {
  title: 'Components/AuthShell',
  component: AuthShell,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof AuthShell>;

export const SignIn: Story = {
  render: () => (
    <AuthShell>
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">Sign in to Forge</h2>
        <p className="text-muted-foreground">Your gaming social network</p>
        <div className="h-10 bg-secondary rounded-lg" />
        <div className="h-10 bg-secondary rounded-lg" />
        <div className="h-10 bg-accent/20 rounded-lg" />
      </div>
    </AuthShell>
  ),
};

export const SignUp: Story = {
  render: () => (
    <AuthShell>
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">Create your account</h2>
        <p className="text-muted-foreground">Join thousands of gamers on Forge</p>
        <div className="h-10 bg-secondary rounded-lg" />
        <div className="h-10 bg-secondary rounded-lg" />
        <div className="h-10 bg-secondary rounded-lg" />
        <div className="h-10 bg-accent/20 rounded-lg" />
      </div>
    </AuthShell>
  ),
};
