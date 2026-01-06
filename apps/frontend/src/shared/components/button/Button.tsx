import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';
import { type IconName } from '@/shared/components/icon/iconMap';
import { Icon } from '@/shared/components/icon/Icon';
import Tooltip from '@/shared/components/Tooltip';

const buttonVariants = cva(
  'disable:cursor-not-allowed relative flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg font-bold transition-all duration-150 focus-visible:ring-2 focus-visible:outline-none',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-text px-4 py-3 before:absolute before:inset-0 before:bg-white before:opacity-0 before:transition-opacity before:duration-150 hover:before:opacity-5 active:before:opacity-10 disabled:cursor-not-allowed disabled:before:bg-black disabled:before:opacity-50',
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

const iconSizeMap = {
  xs: { size: 12, strokeWidth: 1.125 },
  sm: { size: 16, strokeWidth: 1.5 },
  md: { size: 20, strokeWidth: 1.875 },
  lg: { size: 24, strokeWidth: 2.25 },
} as const;

type IconSize = keyof typeof iconSizeMap;

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  icon?: IconName;
  iconSize?: IconSize;
  children?: ReactNode;
  tooltip?: string;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Button({
  variant,
  icon,
  iconSize = 'md',
  children,
  tooltip,
  tooltipPosition = 'top',
  className,
  'aria-label': ariaLabel,
  type = 'button',
  ...props
}: ButtonProps) {
  const iconConfig = iconSizeMap[iconSize];

  // 아이콘만 있고 children이 없으면 aria-label 필요
  const needsAriaLabel = icon && !children;
  const finalAriaLabel = ariaLabel || (needsAriaLabel ? tooltip : undefined);

  const button = (
    <button
      className={cn(buttonVariants({ variant }), className)}
      aria-label={finalAriaLabel}
      type={type}
      {...props}
    >
      {icon && (
        <Icon
          name={icon}
          size={iconConfig.size}
          strokeWidth={iconConfig.strokeWidth}
          decorative={!!children}
        />
      )}
      {children && <span>{children}</span>}
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
