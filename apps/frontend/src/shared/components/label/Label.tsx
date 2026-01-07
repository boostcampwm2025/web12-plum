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
  extends Omit<React.ComponentProps<'label'>, 'size'>, VariantProps<typeof labelVariants> {}

function Label({ className, size, ...props }: LabelProps) {
  return (
    <label
      className={cn(labelVariants({ size, className }))}
      {...props}
    />
  );
}

export default Label;
