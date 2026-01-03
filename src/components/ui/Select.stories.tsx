import type { Meta, StoryObj } from '@storybook/react';
import { Select } from './Select';

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  args: {
    options: [
      { value: '', label: 'Select an option' },
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' },
    ],
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Property Type',
    options: [
      { value: '', label: 'Select property type' },
      { value: 'apartment', label: 'Apartment' },
      { value: 'house', label: 'House' },
      { value: 'condo', label: 'Condo' },
      { value: 'townhouse', label: 'Townhouse' },
    ],
  },
};

export const WithError: Story = {
  args: {
    label: 'Property Type',
    error: 'Please select a property type',
    options: [
      { value: '', label: 'Select property type' },
      { value: 'apartment', label: 'Apartment' },
      { value: 'house', label: 'House' },
      { value: 'condo', label: 'Condo' },
    ],
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Lease Term',
    helperText: 'Select the duration of the lease agreement',
    options: [
      { value: '', label: 'Select lease term' },
      { value: '6', label: '6 Months' },
      { value: '12', label: '12 Months' },
      { value: '24', label: '24 Months' },
    ],
  },
};

export const WithDisabledOptions: Story = {
  args: {
    label: 'Unit Status',
    options: [
      { value: '', label: 'Select status' },
      { value: 'available', label: 'Available' },
      { value: 'occupied', label: 'Occupied', disabled: true },
      { value: 'maintenance', label: 'Under Maintenance', disabled: true },
      { value: 'vacant', label: 'Vacant' },
    ],
  },
};

export const Disabled: Story = {
  args: {
    label: 'Property Type',
    disabled: true,
    options: [
      { value: 'apartment', label: 'Apartment' },
      { value: 'house', label: 'House' },
    ],
  },
};

export const PaymentMethod: Story = {
  args: {
    label: 'Payment Method',
    helperText: 'Choose how you want to receive rent payments',
    options: [
      { value: '', label: 'Select payment method' },
      { value: 'ach', label: 'ACH Bank Transfer' },
      { value: 'credit_card', label: 'Credit Card' },
      { value: 'debit_card', label: 'Debit Card' },
      { value: 'check', label: 'Check' },
    ],
  },
};
