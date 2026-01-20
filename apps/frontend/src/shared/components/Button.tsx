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

type ButtonBaseProps = {
  children?: ReactNode;
  tooltip?: string;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
} & VariantProps<typeof buttonVariants>;

type ButtonAsButtonProps = ButtonBaseProps &
  Omit<ComponentProps<'button'>, 'className' | 'children'> & { as?: 'button' };

type ButtonAsAnchorProps = ButtonBaseProps &
  Omit<ComponentProps<'a'>, 'className' | 'children'> & { as: 'a' };

type ButtonProps = ButtonAsButtonProps | ButtonAsAnchorProps;

export function Button(props: ButtonProps) {
  const { variant, children, tooltip, tooltipPosition = 'top', className } = props;
  const sharedClassName = cn(buttonVariants({ variant }), className);

  if (props.as === 'a') {
    const { as: _as, ...anchorProps } = props as ButtonAsAnchorProps;
    const button = (
      <a
        {...anchorProps}
        className={sharedClassName}
      >
        {children}
      </a>
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

  const { as: _as, type, ...buttonProps } = props as ButtonAsButtonProps;
  const button = (
    <button
      {...buttonProps}
      type={type ?? 'button'}
      className={sharedClassName}
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
