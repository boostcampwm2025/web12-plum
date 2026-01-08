import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';
import { ComponentProps } from 'react';

const helpTextVariants = cva('mt-1 text-sm', {
  variants: {
    variant: {
      default: 'text-subtext-light',
      error: 'text-error',
      success: 'text-success',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

interface HelpTextProps
  extends Omit<ComponentProps<'p'>, 'children'>, VariantProps<typeof helpTextVariants> {
  children: string;
}

export function HelpText({ className, variant, children, ...props }: HelpTextProps) {
  if (!children) return null;

  return (
    <p
      className={cn(helpTextVariants({ variant }), className)}
      {...props}
    >
      {children}
    </p>
  );
}
