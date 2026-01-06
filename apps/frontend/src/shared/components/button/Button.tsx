import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';
import { iconMap, type IconName } from '@/shared/components/icon/iconMap';

const buttonVariants = cva('flex items-center justify-center gap-2 rounded-lg font-bold', {
  variants: {
    variant: {
      default: 'bg-primary text-text px-4 py-3',
      ghost: 'text-primary bg-transparent px-4 py-2',
      icon: 'text-text p-1',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const iconSizeMap = {
  xs: { className: 'h-3 w-3', strokeWidth: 1.125 },
  sm: { className: 'h-4 w-4', strokeWidth: 1.5 },
  md: { className: 'h-5 w-5', strokeWidth: 1.875 },
  lg: { className: 'h-6 w-6', strokeWidth: 2.25 },
} as const;

type IconSize = keyof typeof iconSizeMap;

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  icon?: IconName;
  iconSize?: IconSize;
  children?: ReactNode;
}

export default function Button({
  variant,
  icon,
  iconSize = 'md',
  children,
  className,
  ...props
}: ButtonProps) {
  const Icon = icon ? iconMap[icon] : null;
  const iconConfig = iconSizeMap[iconSize];

  return (
    <button
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    >
      {Icon && (
        <Icon
          className={iconConfig.className}
          strokeWidth={iconConfig.strokeWidth}
        />
      )}
      {children && <span>{children}</span>}
    </button>
  );
}
