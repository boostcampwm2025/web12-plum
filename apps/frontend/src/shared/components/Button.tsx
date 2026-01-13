import { ComponentProps, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';
import { Tooltip } from '@/shared/components/Tooltip';

const buttonVariants = cva(
  'disable:cursor-not-allowed relative flex shrink-0 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg font-bold transition-all duration-150 focus-visible:ring-2 focus-visible:outline-none',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-text px-4 py-3 before:absolute before:inset-0 before:bg-white before:opacity-0 before:transition-opacity before:duration-150 hover:before:opacity-5 active:before:opacity-10 disabled:cursor-not-allowed disabled:opacity-30 disabled:before:hidden',
        ghost:
          'text-primary disabled:text-primary/50 bg-transparent px-4 py-2 hover:bg-gray-200/20 active:bg-gray-200/30 disabled:cursor-not-allowed',
        icon: 'text-text disabled:text-text/50 p-2 hover:bg-gray-200/20 active:bg-gray-200/30 disabled:cursor-not-allowed',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

interface ButtonProps extends ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  children?: ReactNode;
  tooltip?: string;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}

export function Button({
  variant,
  children,
  tooltip,
  tooltipPosition = 'top',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  const button = (
    <button
      className={cn(buttonVariants({ variant }), className)}
      type={type}
      {...props}
    >
      {children}
    </button>
  );

  if (tooltip) {
    return (
      <Tooltip
        content={tooltip}
        position={tooltipPosition}
      >
        {button}
      </Tooltip>
    );
  }

  return button;
}
