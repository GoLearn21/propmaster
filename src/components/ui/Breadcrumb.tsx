import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className }) => {
  return (
    <nav
      className={cn('flex items-center space-x-1 text-sm', className)}
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-neutral-medium" />
            )}
            {item.href && !isLast ? (
              <Link
                to={item.href}
                className="text-neutral-medium hover:text-primary transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  isLast ? 'text-neutral-black font-medium' : 'text-neutral-medium'
                )}
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

Breadcrumb.displayName = 'Breadcrumb';

export { Breadcrumb };
