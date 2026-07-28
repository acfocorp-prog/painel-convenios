import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Cabeçalho padronizado das páginas internas: título grande, descrição curta
 * e slot à direita para ações (botões "Novo", "Exportar", etc.).
 */
export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex items-start justify-between gap-3 px-4 pt-4 pb-3',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-semibold text-slate-900 leading-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
