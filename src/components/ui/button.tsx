import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-colors focus-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900',
        secondary:
          'bg-slate-100 text-slate-900 hover:bg-slate-200',
        ghost:
          'text-slate-700 hover:bg-slate-100 active:bg-slate-200',
        outline:
          'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
        danger:
          'bg-status-danger text-white hover:bg-red-700',
        success:
          'bg-status-ok text-white hover:bg-green-700',
        link: 'text-brand-700 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-sm',
        lg: 'h-12 px-5 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
