import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta = {
  title: 'UI/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['success', 'warning', 'error', 'info', 'default', 'primary', 'active'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: {
    children: 'Active',
    variant: 'success',
  },
};

export const Warning: Story = {
  args: {
    children: 'Pending',
    variant: 'warning',
  },
};

export const Error: Story = {
  args: {
    children: 'Overdue',
    variant: 'error',
  },
};

export const Info: Story = {
  args: {
    children: 'Information',
    variant: 'info',
  },
};

export const Primary: Story = {
  args: {
    children: 'Primary',
    variant: 'primary',
  },
};

export const Active: Story = {
  args: {
    children: 'Active State',
    variant: 'active',
  },
};

export const WithDot: Story = {
  args: {
    children: 'Live',
    variant: 'success',
    dot: true,
  },
};

export const Small: Story = {
  args: {
    children: 'Small',
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    children: 'Large',
    size: 'lg',
  },
};
