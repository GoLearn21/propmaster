import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner, Loading } from './Loading';

describe('Spinner', () => {
  it('renders spinner', () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('animate-spin');
  });

  it('applies small size', () => {
    const { container } = render(<Spinner size="sm" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-4', 'w-4');
  });

  it('applies medium size by default', () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-6', 'w-6');
  });

  it('applies large size', () => {
    const { container } = render(<Spinner size="lg" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-8', 'w-8');
  });

  it('applies xl size', () => {
    const { container } = render(<Spinner size="xl" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-12', 'w-12');
  });

  it('applies custom className', () => {
    const { container } = render(<Spinner className="custom-class" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('custom-class');
  });
});

describe('Loading', () => {
  it('renders with default text', () => {
    render(<Loading />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom text', () => {
    render(<Loading text="Please wait" />);
    expect(screen.getByText('Please wait')).toBeInTheDocument();
  });

  it('renders without text', () => {
    render(<Loading text="" />);
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('renders in fullscreen mode', () => {
    const { container } = render(<Loading fullScreen />);
    const wrapper = container.querySelector('.fixed.inset-0');
    expect(wrapper).toBeInTheDocument();
  });

  it('renders inline by default', () => {
    const { container } = render(<Loading />);
    const wrapper = container.querySelector('.fixed.inset-0');
    expect(wrapper).not.toBeInTheDocument();
  });

  it('passes size to Spinner', () => {
    const { container } = render(<Loading size="sm" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-4', 'w-4');
  });
});
