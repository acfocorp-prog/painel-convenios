import * as LabelPrimitive from '@radix-ui/react-label';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils';

export const Label = forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      'text-sm font-medium text-slate-700 inline-flex items-center gap-1',
      className,
    )}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;
