import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ExportButtonProps {
  onExport: () => void | Promise<void>;
  label?: string;
  disabled?: boolean;
}

/**
 * Botão simples "Exportar" — clica → função é chamada.
 * Fica no PageHeader das listas; recebe o callback do hook `use*Export`.
 */
export function ExportButton({
  onExport,
  label = 'Exportar XLSX',
  disabled,
}: ExportButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        void onExport();
      }}
      disabled={disabled}
    >
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}