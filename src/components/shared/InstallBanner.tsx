import { Download, X } from 'lucide-react';
import { useState } from 'react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Banner discreto que aparece no rodapé da Visão Geral quando o navegador
 * suporta instalação como PWA. Some sozinho depois de instalado.
 */
export function InstallBanner({ className }: { className?: string }) {
  const { canInstall, installed, prompt } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (installed || dismissed || !canInstall) return null;

  return (
    <div
      className={cn(
        'mx-4 flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-3',
        className,
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-700 text-white">
        <Download className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-brand-900">
          Instalar no celular
        </p>
        <p className="text-xs text-brand-800">
          Abre mais rápido e funciona offline.
        </p>
      </div>
      <Button size="sm" onClick={() => prompt()}>
        Instalar
      </Button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dispensar"
        className="rounded-lg p-1 text-brand-800 hover:bg-brand-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
