import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from './Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'UI/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', '2xl'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {
  args: {
    alt: 'User Name',
  },
};

export const WithImage: Story = {
  args: {
    src: 'https://i.pravatar.cc/150?img=1',
    alt: 'John Doe',
  },
};

export const WithInitials: Story = {
  args: {
    alt: 'John Doe',
  },
};

export const CustomFallback: Story = {
  args: {
    alt: 'John Doe',
    fallback: 'JD',
  },
};

export const Small: Story = {
  args: {
    src: 'https://i.pravatar.cc/150?img=2',
    alt: 'Jane Smith',
    size: 'sm',
  },
};

export const Medium: Story = {
  args: {
    src: 'https://i.pravatar.cc/150?img=3',
    alt: 'Mike Johnson',
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    src: 'https://i.pravatar.cc/150?img=4',
    alt: 'Sarah Williams',
    size: 'lg',
  },
};

export const ExtraLarge: Story = {
  args: {
    src: 'https://i.pravatar.cc/150?img=5',
    alt: 'David Brown',
    size: 'xl',
  },
};

export const ExtraExtraLarge: Story = {
  args: {
    src: 'https://i.pravatar.cc/150?img=6',
    alt: 'Emma Davis',
    size: '2xl',
  },
};

export const BrokenImage: Story = {
  args: {
    src: 'https://broken-image-url.com/invalid.jpg',
    alt: 'Broken Image',
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar src="https://i.pravatar.cc/150?img=7" alt="User 1" size="sm" />
      <Avatar src="https://i.pravatar.cc/150?img=8" alt="User 2" size="md" />
      <Avatar src="https://i.pravatar.cc/150?img=9" alt="User 3" size="lg" />
      <Avatar src="https://i.pravatar.cc/150?img=10" alt="User 4" size="xl" />
      <Avatar src="https://i.pravatar.cc/150?img=11" alt="User 5" size="2xl" />
    </div>
  ),
};

export const InitialsVariations: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar alt="John Doe" size="lg" />
      <Avatar alt="Jane Smith" size="lg" />
      <Avatar alt="Mike Johnson" size="lg" />
      <Avatar alt="Sarah Williams" size="lg" />
      <Avatar alt="David Brown" size="lg" />
    </div>
  ),
};

export const TenantAvatars: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar src="https://i.pravatar.cc/150?img=12" alt="John Doe" size="md" />
        <div>
          <div className="font-medium">John Doe</div>
          <div className="text-sm text-neutral-medium">Unit 101</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Avatar src="https://i.pravatar.cc/150?img=13" alt="Jane Smith" size="md" />
        <div>
          <div className="font-medium">Jane Smith</div>
          <div className="text-sm text-neutral-medium">Unit 202</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Avatar alt="Mike Johnson" size="md" />
        <div>
          <div className="font-medium">Mike Johnson</div>
          <div className="text-sm text-neutral-medium">Unit 303</div>
        </div>
      </div>
    </div>
  ),
};
