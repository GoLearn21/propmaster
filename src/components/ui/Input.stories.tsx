import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';
import { Mail, Search, Eye, Lock } from 'lucide-react';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search'],
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'john@example.com',
    type: 'email',
  },
};

export const WithLeftIcon: Story = {
  args: {
    label: 'Email',
    placeholder: 'john@example.com',
    type: 'email',
    leftIcon: <Mail className="h-4 w-4" />,
  },
};

export const WithRightIcon: Story = {
  args: {
    label: 'Password',
    placeholder: 'Enter password',
    type: 'password',
    rightIcon: <Eye className="h-4 w-4" />,
  },
};

export const WithBothIcons: Story = {
  args: {
    label: 'Search',
    placeholder: 'Search properties...',
    type: 'search',
    leftIcon: <Search className="h-4 w-4" />,
    rightIcon: <Eye className="h-4 w-4" />,
  },
};

export const WithError: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'john@example.com',
    type: 'email',
    error: 'Please enter a valid email address',
    leftIcon: <Mail className="h-4 w-4" />,
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Username',
    placeholder: 'johndoe',
    helperText: 'Choose a unique username between 3-20 characters',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Input',
    placeholder: 'Cannot edit this',
    disabled: true,
    value: 'Disabled value',
  },
};

export const Password: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    leftIcon: <Lock className="h-4 w-4" />,
  },
};

export const Search: Story = {
  args: {
    type: 'search',
    placeholder: 'Search tenants, properties...',
    leftIcon: <Search className="h-4 w-4" />,
  },
};

export const Number: Story = {
  args: {
    label: 'Rent Amount',
    type: 'number',
    placeholder: '1500',
    helperText: 'Monthly rent in USD',
  },
};
