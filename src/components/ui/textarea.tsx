import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[88px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm transition-colors',
        'placeholder:text-slate-400 focus-ring resize-y',
        'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
