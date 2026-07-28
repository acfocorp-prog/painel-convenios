import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center',
        className,
      )}
    >
      {Icon && (
        <div className="rounded-full bg-brand-50 p-3 text-brand-700">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <div className="space-y-1">
        <p className="text-base font-medium text-slate-900">{title}</p>
        {description && (
          <p className="text-sm text-slate-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
