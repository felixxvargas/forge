import type { Meta, StoryObj } from '@storybook/react';
import { GroupIcon, GAMING_ICONS } from './GroupIcon';

const meta: Meta<typeof GroupIcon> = {
  title: 'Components/GroupIcon',
  component: GroupIcon,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    iconKey: {
      control: 'select',
      options: GAMING_ICONS.map(i => i.key),
    },
  },
};

export default meta;
type Story = StoryObj<typeof GroupIcon>;

export const Default: Story = {
  args: { iconKey: 'gamepad', className: 'w-8 h-8' },
};

export const Trophy: Story = {
  args: { iconKey: 'trophy', className: 'w-8 h-8' },
};

export const Large: Story = {
  args: { iconKey: 'crown', className: 'w-16 h-16' },
};

export const AllIcons: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {GAMING_ICONS.map(({ key, label, Icon }) => (
        <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 56 }}>
          <GroupIcon iconKey={key} className="w-8 h-8" />
          <span style={{ fontSize: 10, color: '#aaa' }}>{label}</span>
        </div>
      ))}
    </div>
  ),
};
