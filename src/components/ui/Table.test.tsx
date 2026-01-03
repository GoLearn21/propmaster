import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from './Table';

describe('Table', () => {
  const renderBasicTable = () => {
    return render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>John Doe</TableCell>
            <TableCell>Active</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Jane Smith</TableCell>
            <TableCell>Pending</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  };

  it('renders table structure', () => {
    renderBasicTable();
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
  });

  it('renders table headers', () => {
    renderBasicTable();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders table cells', () => {
    renderBasicTable();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders rows with hoverable style', () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow hoverable>
            <TableCell>Test</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    
    const row = container.querySelector('tr');
    expect(row).toHaveClass('hover:bg-neutral-lighter', 'cursor-pointer');
  });
});
