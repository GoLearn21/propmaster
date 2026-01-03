import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';

describe('Card', () => {
  it('renders card with children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies default variant styles', () => {
    const { container } = render(<Card variant="default">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('bg-white', 'border');
  });

  it('applies elevated variant styles', () => {
    const { container } = render(<Card variant="elevated">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('shadow-md');
  });

  it('applies outline variant styles', () => {
    const { container } = render(<Card variant="outline">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('border');
  });

  it('applies ghost variant styles', () => {
    const { container } = render(<Card variant="ghost">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('bg-neutral-lighter');
  });

  it('applies small padding', () => {
    const { container } = render(<Card padding="sm">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('p-4');
  });

  it('applies medium padding by default', () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('p-6');
  });

  it('applies large padding', () => {
    const { container } = render(<Card padding="lg">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('p-8');
  });

  it('applies no padding', () => {
    const { container } = render(<Card padding="none">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('p-0');
  });

  it('applies hoverable styles', () => {
    const { container } = render(<Card hoverable>Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('cursor-pointer');
  });
});

describe('CardHeader', () => {
  it('renders header with children', () => {
    render(<CardHeader>Header</CardHeader>);
    expect(screen.getByText('Header')).toBeInTheDocument();
  });
});

describe('CardTitle', () => {
  it('renders title with children', () => {
    render(<CardTitle>Title</CardTitle>);
    expect(screen.getByText('Title')).toBeInTheDocument();
  });

  it('renders as h3 element', () => {
    render(<CardTitle>Title</CardTitle>);
    const title = screen.getByText('Title');
    expect(title.tagName).toBe('H3');
  });
});

describe('CardDescription', () => {
  it('renders description with children', () => {
    render(<CardDescription>Description</CardDescription>);
    expect(screen.getByText('Description')).toBeInTheDocument();
  });
});

describe('CardContent', () => {
  it('renders content with children', () => {
    render(<CardContent>Content</CardContent>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});

describe('CardFooter', () => {
  it('renders footer with children', () => {
    render(<CardFooter>Footer</CardFooter>);
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });
});

describe('Card composition', () => {
  it('renders complete card with all parts', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent>Test Content</CardContent>
        <CardFooter>Test Footer</CardFooter>
      </Card>
    );
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(screen.getByText('Test Footer')).toBeInTheDocument();
  });
});
