import React from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
  Textarea,
  Checkbox,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Breadcrumb,
  Loading,
  Avatar,
} from '../components/ui';
import { Search, Mail, ChevronDown } from 'lucide-react';

const ComponentShowcase: React.FC = () => {
  const [inputValue, setInputValue] = React.useState('');
  const [checkboxValue, setCheckboxValue] = React.useState(false);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
      {/* Header */}
      <div>
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/' },
            { label: 'Component Showcase' },
          ]}
        />
        <h1 className="text-h2 font-bold text-neutral-black mt-4">
          MasterKey UI Component Library
        </h1>
        <p className="text-neutral-medium mt-2">
          Production-ready components matching MasterKey's design system
        </p>
      </div>

      {/* Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
          <CardDescription>Various button styles and sizes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="destructive">Destructive Button</Button>
            <Button variant="link">Link Button</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="xl">Extra Large</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button leftIcon={<Search className="h-4 w-4" />}>With Icon</Button>
            <Button loading>Loading...</Button>
            <Button disabled>Disabled</Button>
          </div>
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Badges</CardTitle>
          <CardDescription>Status indicators and labels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge variant="success">Active</Badge>
            <Badge variant="warning">Pending</Badge>
            <Badge variant="error">Overdue</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="active" dot>
              Active with Dot
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Form Inputs */}
      <Card>
        <CardHeader>
          <CardTitle>Form Inputs</CardTitle>
          <CardDescription>Text inputs, selects, textareas, and checkboxes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="john@example.com"
              helperText="We'll never share your email"
            />
            <Input
              label="Search"
              type="text"
              placeholder="Search properties..."
              leftIcon={<Search className="h-4 w-4" />}
            />
            <Input
              label="With Error"
              type="text"
              placeholder="Invalid input"
              error="This field is required"
            />
            <Select
              label="Property Type"
              options={[
                { value: '', label: 'Select type...' },
                { value: 'residential', label: 'Residential' },
                { value: 'commercial', label: 'Commercial' },
                { value: 'mixed', label: 'Mixed Use' },
              ]}
            />
          </div>
          <Textarea
            label="Description"
            placeholder="Enter description..."
            rows={4}
            helperText="Maximum 500 characters"
          />
          <div className="space-y-2">
            <Checkbox label="I agree to the terms and conditions" />
            <Checkbox label="Send me email notifications" checked />
            <Checkbox label="Disabled option" disabled />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Data Table</CardTitle>
          <CardDescription>Display tabular data with actions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow hoverable>
                <TableCell className="font-medium">123 Main St, Apt 4B</TableCell>
                <TableCell>John Doe</TableCell>
                <TableCell>
                  <Badge variant="success">Active</Badge>
                </TableCell>
                <TableCell>$1,500/mo</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow hoverable>
                <TableCell className="font-medium">456 Oak Ave, Unit 2</TableCell>
                <TableCell>Jane Smith</TableCell>
                <TableCell>
                  <Badge variant="warning">Pending</Badge>
                </TableCell>
                <TableCell>$2,000/mo</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow hoverable>
                <TableCell className="font-medium">789 Pine Rd</TableCell>
                <TableCell>Bob Johnson</TableCell>
                <TableCell>
                  <Badge variant="error">Overdue</Badge>
                </TableCell>
                <TableCell>$1,800/mo</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Tabs Navigation</CardTitle>
          <CardDescription>Organize content into tabs</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <div className="p-4 bg-neutral-lighter rounded-md">
                <h3 className="font-semibold mb-2">Overview Content</h3>
                <p className="text-neutral-medium">This is the overview tab content.</p>
              </div>
            </TabsContent>
            <TabsContent value="details">
              <div className="p-4 bg-neutral-lighter rounded-md">
                <h3 className="font-semibold mb-2">Details Content</h3>
                <p className="text-neutral-medium">This is the details tab content.</p>
              </div>
            </TabsContent>
            <TabsContent value="documents">
              <div className="p-4 bg-neutral-lighter rounded-md">
                <h3 className="font-semibold mb-2">Documents Content</h3>
                <p className="text-neutral-medium">This is the documents tab content.</p>
              </div>
            </TabsContent>
            <TabsContent value="history">
              <div className="p-4 bg-neutral-lighter rounded-md">
                <h3 className="font-semibold mb-2">History Content</h3>
                <p className="text-neutral-medium">This is the history tab content.</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Card>
        <CardHeader>
          <CardTitle>Modal Dialog</CardTitle>
          <CardDescription>Modal windows for focused interactions</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Property</DialogTitle>
                <DialogDescription>
                  Enter the details of the new property you want to add.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input label="Property Address" placeholder="123 Main St" />
                <Select
                  label="Property Type"
                  options={[
                    { value: 'residential', label: 'Residential' },
                    { value: 'commercial', label: 'Commercial' },
                  ]}
                />
                <Input label="Rent Amount" type="number" placeholder="1500" />
              </div>
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button variant="primary">Add Property</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Avatars */}
      <Card>
        <CardHeader>
          <CardTitle>Avatars</CardTitle>
          <CardDescription>User profile pictures and initials</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar alt="John Doe" size="sm" />
            <Avatar alt="Jane Smith" size="md" />
            <Avatar alt="Bob Johnson" size="lg" />
            <Avatar alt="Alice Williams" size="xl" />
            <Avatar alt="Charlie Brown" size="2xl" />
          </div>
        </CardContent>
      </Card>

      {/* Loading States */}
      <Card>
        <CardHeader>
          <CardTitle>Loading States</CardTitle>
          <CardDescription>Spinners and loading indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <Loading text="Loading data..." size="sm" />
            <Loading text="Processing..." size="md" />
            <Loading text="Please wait..." size="lg" />
          </div>
        </CardContent>
      </Card>

      {/* Back to Dashboard */}
      <div className="flex justify-center pt-8">
        <Link to="/">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
};

export default ComponentShowcase;
