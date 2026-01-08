import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';
import { ComponentProps } from 'react';

const labelVariants = cva('text-text mb-2 block font-bold', {
  variants: {
    size: {
      lg: 'text-xl',
      md: 'text-sm',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

interface LabelProps
  extends Omit<ComponentProps<'label'>, 'size'>, VariantProps<typeof labelVariants> {
  required?: boolean;
}

export function Label({ className, size, required, children, ...props }: LabelProps) {
  return (
    <label
      className={cn(labelVariants({ size, className }))}
      {...props}
    >
      {children}
      {required && <span className="text-primary ml-1">*</span>}
    </label>
  );
}
