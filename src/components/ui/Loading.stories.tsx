import type { Meta, StoryObj } from '@storybook/react';
import { Loading, Spinner } from './Loading';

const meta: Meta<typeof Loading> = {
  title: 'UI/Loading',
  component: Loading,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
    fullScreen: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Loading>;

export const Default: Story = {
  args: {
    text: 'Loading...',
  },
};

export const WithoutText: Story = {
  args: {
    text: '',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    text: 'Loading...',
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
    text: 'Loading data...',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    text: 'Please wait...',
  },
};

export const ExtraLarge: Story = {
  args: {
    size: 'xl',
    text: 'Loading properties...',
  },
};

export const CustomText: Story = {
  args: {
    text: 'Fetching tenants...',
    size: 'lg',
  },
};

export const LoadingProperties: Story = {
  args: {
    text: 'Loading properties...',
    size: 'lg',
  },
};

export const LoadingPayments: Story = {
  args: {
    text: 'Processing payment...',
    size: 'md',
  },
};

export const LoadingReports: Story = {
  args: {
    text: 'Generating financial reports...',
    size: 'lg',
  },
};

// Spinner component stories
export const SpinnerSmall: Story = {
  render: () => <Spinner size="sm" />,
};

export const SpinnerMedium: Story = {
  render: () => <Spinner size="md" />,
};

export const SpinnerLarge: Story = {
  render: () => <Spinner size="lg" />,
};

export const SpinnerExtraLarge: Story = {
  render: () => <Spinner size="xl" />,
};

export const SpinnerSizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <Spinner size="sm" />
        <span className="text-xs text-neutral-medium">Small</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Spinner size="md" />
        <span className="text-xs text-neutral-medium">Medium</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Spinner size="lg" />
        <span className="text-xs text-neutral-medium">Large</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Spinner size="xl" />
        <span className="text-xs text-neutral-medium">Extra Large</span>
      </div>
    </div>
  ),
};

export const InlineSpinner: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Spinner size="sm" />
      <span>Loading content...</span>
    </div>
  ),
};
