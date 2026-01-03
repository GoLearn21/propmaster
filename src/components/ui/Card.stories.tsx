import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
import { Button } from './Button';

const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'elevated', 'outline', 'ghost'],
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-neutral-dark">
          This is the card content area. You can put any content here.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="primary">Action</Button>
      </CardFooter>
    </Card>
  ),
};

export const Elevated: Story = {
  render: () => (
    <Card variant="elevated" className="w-96">
      <CardHeader>
        <CardTitle>Elevated Card</CardTitle>
        <CardDescription>This card has elevated styling</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-neutral-dark">Content with elevated shadow</p>
      </CardContent>
    </Card>
  ),
};

export const Outline: Story = {
  render: () => (
    <Card variant="outline" className="w-96">
      <CardHeader>
        <CardTitle>Outline Card</CardTitle>
        <CardDescription>This card has outline styling</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-neutral-dark">Content with border only</p>
      </CardContent>
    </Card>
  ),
};

export const WithoutPadding: Story = {
  render: () => (
    <Card padding="none" className="w-96">
      <CardContent className="p-4">
        <p className="text-neutral-dark">Custom padding control</p>
      </CardContent>
    </Card>
  ),
};

export const Hoverable: Story = {
  render: () => (
    <Card hoverable className="w-96">
      <CardHeader>
        <CardTitle>Hoverable Card</CardTitle>
        <CardDescription>Hover over this card</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-neutral-dark">This card responds to hover</p>
      </CardContent>
    </Card>
  ),
};
