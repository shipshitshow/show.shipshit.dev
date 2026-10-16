'use client';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from './cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors outline-none disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-accent-red/40',
  {
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
    variants: {
      size: {
        default: 'px-3 py-2',
        icon: 'size-9',
        lg: 'px-4 py-2.5',
        sm: 'px-2 py-1 text-[10px]',
      },
      variant: {
        accent: 'bg-accent-red text-on-accent hover:opacity-90',
        danger:
          'border border-accent-red/20 bg-accent-red/5 text-accent-red hover:bg-accent-red/10',
        default:
          'border border-surface-border bg-surface-card text-text-secondary hover:text-text-primary',
        ghost:
          'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/60',
      },
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ className, size, variant }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
