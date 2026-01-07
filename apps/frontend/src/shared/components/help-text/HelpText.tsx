import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';

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
  extends Omit<React.ComponentProps<'p'>, 'children'>, VariantProps<typeof helpTextVariants> {
  children: string;
}

function HelpText({ className, variant, children, ...props }: HelpTextProps) {
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

export default HelpText;
