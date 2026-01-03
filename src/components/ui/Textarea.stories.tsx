import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './Textarea';

const meta: Meta<typeof Textarea> = {
  title: 'UI/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
    },
    rows: {
      control: 'number',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  args: {
    placeholder: 'Enter your message...',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Description',
    placeholder: 'Describe your property...',
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Property Description',
    placeholder: 'Enter a detailed description of the property',
    helperText: 'Include key features, amenities, and nearby attractions',
  },
};

export const WithError: Story = {
  args: {
    label: 'Maintenance Request Details',
    placeholder: 'Describe the issue...',
    error: 'Please provide a detailed description of the maintenance issue',
  },
};

export const CustomRows: Story = {
  args: {
    label: 'Notes',
    placeholder: 'Add any additional notes...',
    rows: 6,
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Textarea',
    value: 'This content cannot be edited',
    disabled: true,
  },
};

export const MaintenanceRequest: Story = {
  args: {
    label: 'Issue Description',
    placeholder: 'Please describe the maintenance issue in detail...',
    helperText: 'Include location, severity, and any relevant details',
    rows: 5,
  },
};

export const PropertyNotes: Story = {
  args: {
    label: 'Property Notes',
    placeholder: 'Add notes about this property...',
    helperText: 'Internal notes visible only to property managers',
    rows: 4,
    defaultValue: 'Recent renovation completed in 2024. New appliances installed.',
  },
};

export const TenantMessage: Story = {
  args: {
    label: 'Message to Tenant',
    placeholder: 'Type your message here...',
    helperText: 'This message will be sent to the tenant via email',
    rows: 6,
  },
};
