import type { Meta, StoryObj } from '@storybook/react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from './Table';
import { Badge } from './Badge';

const meta: Meta<typeof Table> = {
  title: 'UI/Table',
  component: Table,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Table>;

export const Default: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Property</TableHead>
          <TableHead>Address</TableHead>
          <TableHead>Units</TableHead>
          <TableHead>Occupancy</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Sunset Apartments</TableCell>
          <TableCell>123 Main St, Austin, TX</TableCell>
          <TableCell>24</TableCell>
          <TableCell>95%</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Downtown Tower</TableCell>
          <TableCell>456 Oak Ave, Austin, TX</TableCell>
          <TableCell>48</TableCell>
          <TableCell>88%</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Garden View Complex</TableCell>
          <TableCell>789 Pine Rd, Austin, TX</TableCell>
          <TableCell>12</TableCell>
          <TableCell>100%</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

export const WithCaption: Story = {
  render: () => (
    <Table>
      <TableCaption>A list of your managed properties</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Property</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Sunset Apartments</TableCell>
          <TableCell>Multi-Family</TableCell>
          <TableCell>$2,400,000</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Downtown Tower</TableCell>
          <TableCell>Commercial</TableCell>
          <TableCell>$5,800,000</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

export const HoverableRows: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tenant</TableHead>
          <TableHead>Unit</TableHead>
          <TableHead>Rent</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow hoverable>
          <TableCell>John Doe</TableCell>
          <TableCell>Unit 101</TableCell>
          <TableCell>$1,500</TableCell>
          <TableCell>
            <Badge variant="success">Active</Badge>
          </TableCell>
        </TableRow>
        <TableRow hoverable>
          <TableCell>Jane Smith</TableCell>
          <TableCell>Unit 202</TableCell>
          <TableCell>$1,800</TableCell>
          <TableCell>
            <Badge variant="success">Active</Badge>
          </TableCell>
        </TableRow>
        <TableRow hoverable>
          <TableCell>Mike Johnson</TableCell>
          <TableCell>Unit 303</TableCell>
          <TableCell>$1,650</TableCell>
          <TableCell>
            <Badge variant="warning">Late</Badge>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

export const PaymentsTable: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Tenant</TableHead>
          <TableHead>Unit</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow hoverable>
          <TableCell>2025-11-01</TableCell>
          <TableCell>John Doe</TableCell>
          <TableCell>Unit 101</TableCell>
          <TableCell>$1,500.00</TableCell>
          <TableCell>
            <Badge variant="success">Paid</Badge>
          </TableCell>
        </TableRow>
        <TableRow hoverable>
          <TableCell>2025-11-01</TableCell>
          <TableCell>Jane Smith</TableCell>
          <TableCell>Unit 202</TableCell>
          <TableCell>$1,800.00</TableCell>
          <TableCell>
            <Badge variant="success">Paid</Badge>
          </TableCell>
        </TableRow>
        <TableRow hoverable>
          <TableCell>2025-11-01</TableCell>
          <TableCell>Mike Johnson</TableCell>
          <TableCell>Unit 303</TableCell>
          <TableCell>$1,650.00</TableCell>
          <TableCell>
            <Badge variant="warning">Pending</Badge>
          </TableCell>
        </TableRow>
        <TableRow hoverable>
          <TableCell>2025-10-28</TableCell>
          <TableCell>Sarah Williams</TableCell>
          <TableCell>Unit 404</TableCell>
          <TableCell>$2,000.00</TableCell>
          <TableCell>
            <Badge variant="error">Overdue</Badge>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

export const MaintenanceRequests: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Request ID</TableHead>
          <TableHead>Unit</TableHead>
          <TableHead>Issue</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow hoverable>
          <TableCell>#MR-1001</TableCell>
          <TableCell>Unit 101</TableCell>
          <TableCell>Leaking faucet</TableCell>
          <TableCell>
            <Badge variant="warning">Medium</Badge>
          </TableCell>
          <TableCell>
            <Badge variant="info">In Progress</Badge>
          </TableCell>
        </TableRow>
        <TableRow hoverable>
          <TableCell>#MR-1002</TableCell>
          <TableCell>Unit 202</TableCell>
          <TableCell>AC not cooling</TableCell>
          <TableCell>
            <Badge variant="error">High</Badge>
          </TableCell>
          <TableCell>
            <Badge variant="warning">Pending</Badge>
          </TableCell>
        </TableRow>
        <TableRow hoverable>
          <TableCell>#MR-1003</TableCell>
          <TableCell>Unit 303</TableCell>
          <TableCell>Light bulb replacement</TableCell>
          <TableCell>
            <Badge variant="default">Low</Badge>
          </TableCell>
          <TableCell>
            <Badge variant="success">Completed</Badge>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
