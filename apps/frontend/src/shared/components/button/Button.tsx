import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';
import { iconMap, type IconName } from '@/shared/components/icon/iconMap';

const buttonVariants = cva('flex items-center justify-center gap-2 rounded-lg font-bold', {
  variants: {
    variant: {
      default: 'bg-primary px-4 py-3',
      ghost: 'text-primary bg-transparent px-4 py-2',
      icon: 'bg-primary p-1',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  icon?: IconName;
  children?: ReactNode;
}

export default function Button({ variant, icon, children, className, ...props }: ButtonProps) {
  const Icon = icon ? iconMap[icon] : null;

  return (
    <button
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    >
      {Icon && <Icon className="h-5 w-5" />}
      {children && <span>{children}</span>}
    </button>
  );
}
