import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders badge with text', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies success variant styles', () => {
    const { container } = render(<Badge variant="success">Success</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('bg-status-success/10', 'text-status-success');
  });

  it('applies warning variant styles', () => {
    const { container } = render(<Badge variant="warning">Warning</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('bg-status-warning/10', 'text-status-warning');
  });

  it('applies error variant styles', () => {
    const { container } = render(<Badge variant="error">Error</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('bg-status-error/10', 'text-status-error');
  });

  it('applies info variant styles', () => {
    const { container } = render(<Badge variant="info">Info</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('bg-status-info/10', 'text-primary');
  });

  it('applies primary variant styles', () => {
    const { container } = render(<Badge variant="primary">Primary</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('bg-primary/10', 'text-primary');
  });

  it('applies active variant styles', () => {
    const { container } = render(<Badge variant="active">Active</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('bg-accent-pink/10', 'text-accent-pink');
  });

  it('applies default variant by default', () => {
    const { container } = render(<Badge>Default</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('bg-neutral-lighter', 'text-neutral-dark');
  });

  it('applies small size', () => {
    const { container } = render(<Badge size="sm">Small</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('px-2', 'py-0.5', 'text-tiny');
  });

  it('applies medium size by default', () => {
    const { container } = render(<Badge>Medium</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('px-3', 'py-1', 'text-xs');
  });

  it('applies large size', () => {
    const { container } = render(<Badge size="lg">Large</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('px-4', 'py-1.5', 'text-sm');
  });

  it('renders dot when dot prop is true', () => {
    const { container } = render(<Badge dot>With Dot</Badge>);
    const badge = container.firstChild as HTMLElement;
    const dot = badge.querySelector('span');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass('h-1.5', 'w-1.5', 'rounded-full');
  });

  it('does not render dot by default', () => {
    const { container } = render(<Badge>Without Dot</Badge>);
    const badge = container.firstChild as HTMLElement;
    const dot = badge.querySelector('span');
    expect(dot).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Badge className="custom-class">Badge</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('custom-class');
  });
});
