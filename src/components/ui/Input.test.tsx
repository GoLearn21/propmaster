import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';
import { Search } from 'lucide-react';

describe('Input', () => {
  it('renders input field', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Input label="Email" placeholder="Enter email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(<Input label="Email" error="Email is required" />);
    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });

  it('displays helper text', () => {
    render(<Input label="Email" helperText="We'll never share your email" />);
    expect(screen.getByText("We'll never share your email")).toBeInTheDocument();
  });

  it('does not show helper text when error is present', () => {
    render(
      <Input 
        label="Email" 
        error="Email is required"
        helperText="We'll never share your email"
      />
    );
    expect(screen.queryByText("We'll never share your email")).not.toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });

  it('renders with left icon', () => {
    render(<Input leftIcon={<Search data-testid="search-icon" />} />);
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });

  it('renders with right icon', () => {
    render(<Input rightIcon={<Search data-testid="search-icon" />} />);
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });

  it('handles input changes', async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText('Enter text');
    
    await user.type(input, 'Hello');
    expect(input).toHaveValue('Hello');
  });

  it('can be disabled', () => {
    render(<Input disabled placeholder="Disabled" />);
    const input = screen.getByPlaceholderText('Disabled');
    expect(input).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Input className="custom-class" placeholder="Test" />);
    const input = screen.getByPlaceholderText('Test');
    expect(input).toHaveClass('custom-class');
  });

  it('generates unique id if not provided', () => {
    const { container } = render(<Input label="Test" />);
    const input = container.querySelector('input');
    const label = screen.getByText('Test');
    
    expect(input?.id).toBeTruthy();
    expect(label.getAttribute('for')).toBe(input?.id);
  });

  it('uses provided id', () => {
    render(<Input id="custom-id" label="Test" />);
    const input = screen.getByLabelText('Test');
    expect(input).toHaveAttribute('id', 'custom-id');
  });
});
