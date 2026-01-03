import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';

describe('Select', () => {
  const options = [
    { value: '', label: 'Select option' },
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  it('renders select with options', () => {
    render(<Select options={options} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Select label="Choose option" options={options} />);
    expect(screen.getByLabelText('Choose option')).toBeInTheDocument();
  });

  it('displays all options', () => {
    render(<Select options={options} />);
    const select = screen.getByRole('combobox');
    const optionElements = select.querySelectorAll('option');
    expect(optionElements).toHaveLength(4);
  });

  it('handles selection change', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<Select options={options} onChange={handleChange} />);
    
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'option1');
    
    expect(handleChange).toHaveBeenCalled();
    expect(select).toHaveValue('option1');
  });

  it('displays error message', () => {
    render(<Select options={options} error="Please select an option" />);
    expect(screen.getByText('Please select an option')).toBeInTheDocument();
  });

  it('displays helper text', () => {
    render(<Select options={options} helperText="Choose wisely" />);
    expect(screen.getByText('Choose wisely')).toBeInTheDocument();
  });

  it('can be disabled', () => {
    render(<Select options={options} disabled />);
    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Select options={options} className="custom-class" />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('custom-class');
  });
});
