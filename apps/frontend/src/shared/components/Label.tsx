import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';

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
  extends Omit<React.ComponentProps<'label'>, 'size'>, VariantProps<typeof labelVariants> {
  required?: boolean;
}

function Label({ className, size, required, children, ...props }: LabelProps) {
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

export default Label;
