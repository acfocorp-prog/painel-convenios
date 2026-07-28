import { type HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default:
          'border-slate-200 bg-slate-50 text-slate-700',
        brand:
          'border-brand-200 bg-brand-50 text-brand-800',
        ok:
          'border-green-200 bg-green-50 text-green-700',
        warn:
          'border-amber-200 bg-amber-50 text-amber-700',
        danger:
          'border-red-200 bg-red-50 text-red-700',
        neutral:
          'border-slate-200 bg-slate-100 text-slate-600',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  ),
);
Badge.displayName = 'Badge';
