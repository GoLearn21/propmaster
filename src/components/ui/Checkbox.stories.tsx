import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from './Checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'UI/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  argTypes: {
    checked: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  args: {
    label: 'Accept terms and conditions',
  },
};

export const Checked: Story = {
  args: {
    label: 'I agree to the terms',
    checked: true,
  },
};

export const Unchecked: Story = {
  args: {
    label: 'Subscribe to newsletter',
    checked: false,
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled checkbox',
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    label: 'Disabled checked',
    disabled: true,
    checked: true,
  },
};

export const WithError: Story = {
  args: {
    label: 'Accept terms and conditions',
    error: 'You must accept the terms to continue',
  },
};

export const WithoutLabel: Story = {
  args: {},
};

export const PropertyAmenities: Story = {
  render: () => (
    <div className="space-y-3">
      <div className="text-sm font-medium text-neutral-dark mb-2">Property Amenities</div>
      <Checkbox label="Air Conditioning" />
      <Checkbox label="Washer/Dryer" />
      <Checkbox label="Dishwasher" />
      <Checkbox label="Parking Available" />
      <Checkbox label="Pet Friendly" />
      <Checkbox label="Pool Access" />
    </div>
  ),
};

export const LeaseOptions: Story = {
  render: () => (
    <div className="space-y-3">
      <div className="text-sm font-medium text-neutral-dark mb-2">Lease Options</div>
      <Checkbox label="Month-to-month available" checked />
      <Checkbox label="Long-term lease preferred" checked />
      <Checkbox label="Allow subletting" />
      <Checkbox label="Require renter's insurance" checked />
    </div>
  ),
};
