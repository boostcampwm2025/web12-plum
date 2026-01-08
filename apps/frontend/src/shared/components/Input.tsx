import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';
import { ComponentProps } from 'react';

const inputVariants = cva(
  'text-text placeholder:text-subtext-light w-full min-w-0 rounded-lg bg-gray-400 outline-none disabled:cursor-not-allowed disabled:bg-gray-400/30',
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
  extends Omit<ComponentProps<'input'>, 'size'>, VariantProps<typeof inputVariants> {}

export function Input({ className, size, type = 'text', ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(inputVariants({ size }), className)}
      {...props}
    />
  );
}
