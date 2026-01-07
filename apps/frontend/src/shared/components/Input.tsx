import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';

const inputVariants = cva(
  'text-text placeholder:text-subtext-light w-full min-w-0 rounded-lg bg-gray-400 outline-none',
  {
    variants: {
      size: {
        lg: 'px-4 py-3 text-base',
        md: 'px-4 py-2 text-sm',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

interface InputProps
  extends Omit<React.ComponentProps<'input'>, 'size'>, VariantProps<typeof inputVariants> {}

function Input({ className, size, type = 'text', ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(inputVariants({ size }), className)}
      {...props}
    />
  );
}

export default Input;
