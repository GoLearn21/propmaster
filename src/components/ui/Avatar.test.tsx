import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renders avatar with image', () => {
    render(<Avatar src="https://example.com/avatar.jpg" alt="John Doe" />);
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('renders initials fallback when no image', () => {
    render(<Avatar alt="John Doe" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders initials from name', () => {
    render(<Avatar alt="Jane Smith" />);
    expect(screen.getByText('JS')).toBeInTheDocument();
  });

  it('renders custom fallback', () => {
    render(<Avatar fallback="AB" />);
    expect(screen.getByText('AB')).toBeInTheDocument();
  });

  it('shows fallback when image fails to load', async () => {
    const { container } = render(<Avatar src="invalid-url.jpg" alt="Test User" />);
    const img = container.querySelector('img');
    
    // Simulate image load error
    if (img) {
      const errorEvent = new Event('error', { bubbles: true });
      img.dispatchEvent(errorEvent);
    }
    
    // Wait for state update
    await screen.findByText('TU');
    expect(screen.getByText('TU')).toBeInTheDocument();
  });

  it('applies small size', () => {
    const { container } = render(<Avatar size="sm" alt="Test" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar).toHaveClass('h-8', 'w-8');
  });

  it('applies medium size by default', () => {
    const { container } = render(<Avatar alt="Test" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar).toHaveClass('h-10', 'w-10');
  });

  it('applies large size', () => {
    const { container } = render(<Avatar size="lg" alt="Test" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar).toHaveClass('h-12', 'w-12');
  });

  it('applies xl size', () => {
    const { container } = render(<Avatar size="xl" alt="Test" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar).toHaveClass('h-16', 'w-16');
  });

  it('applies 2xl size', () => {
    const { container } = render(<Avatar size="2xl" alt="Test" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar).toHaveClass('h-20', 'w-20');
  });
});
