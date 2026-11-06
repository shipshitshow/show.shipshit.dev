import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from './cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums',
  {
    defaultVariants: { variant: 'default' },
    variants: {
      variant: {
        default: 'bg-surface-elevated text-text-secondary',
        outline: 'border border-surface-border text-text-secondary',
        overlay: 'bg-black/80 text-text-primary',
      },
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
