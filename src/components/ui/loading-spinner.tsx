import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center p-8 text-slate-400',
        className,
      )}
      role="status"
      aria-label="Carregando"
    >
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}
