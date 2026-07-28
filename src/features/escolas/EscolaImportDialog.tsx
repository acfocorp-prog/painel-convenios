import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileSpreadsheet, Upload, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useImportEscolas, type ImportResult } from '@/hooks/useExcelImport';
import { cn } from '@/lib/utils';

export function EscolaImportDialog() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const importEscolas = useImportEscolas();

  function reset() {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  async function onSubmit() {
    if (!file) return;
    try {
      const r = await importEscolas.mutateAsync(file);
      setResult(r);
      if (r.inserted > 0) {
        toast.success(
          `${r.inserted} escola${r.inserted === 1 ? '' : 's'} importada${r.inserted === 1 ? '' : 's'}`,
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao importar');
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4" />
          Importar planilha
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Importar escolas</DialogTitle>
          <DialogDescription>
            Planilha .xlsx com colunas <strong>INEP</strong>, <strong>Nome</strong> e{' '}
            <strong>Ativo</strong> (opcional). Linhas com INEP já existente são
            puladas, nunca sobrescritas.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-sm transition-colors',
                file
                  ? 'border-brand-700 bg-brand-50 text-brand-900'
                  : 'border-slate-300 text-slate-500 hover:bg-slate-50',
              )}
            >
              <FileSpreadsheet className="h-8 w-8" />
              {file ? (
                <span className="font-medium">{file.name}</span>
              ) : (
                <span>Toque para escolher o arquivo</span>
              )}
            </button>
            {file && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFile(null)}
                className="w-full"
              >
                <X className="h-4 w-4" />
                Remover
              </Button>
            )}
          </div>
        ) : (
          <ImportResultView result={result} />
        )}

        <DialogFooter>
          {result ? (
            <Button className="w-full" onClick={() => handleOpenChange(false)}>
              Fechar
            </Button>
          ) : (
            <Button
              className="w-full"
              disabled={!file || importEscolas.isPending}
              onClick={onSubmit}
            >
              <Upload className="h-4 w-4" />
              {importEscolas.isPending ? 'Importando…' : 'Importar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportResultView({ result }: { result: ImportResult }) {
  const totalSkipped = result.skipped.length + result.parseErrors.length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Tile label="Lidas" value={result.total} variant="default" />
        <Tile
          label="Importadas"
          value={result.inserted}
          variant={result.inserted > 0 ? 'ok' : 'default'}
        />
        <Tile
          label="Puladas"
          value={totalSkipped}
          variant={totalSkipped > 0 ? 'warn' : 'default'}
        />
      </div>

      {result.skipped.length > 0 && (
        <details className="rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs">
          <summary className="cursor-pointer font-medium text-amber-900">
            {result.skipped.length} linha(s) pulada(s) — INEP duplicado
          </summary>
          <ul className="mt-2 space-y-1 text-amber-800">
            {result.skipped.map((s) => (
              <li key={`${s.rowIndex}-${s.inep}`}>
                Linha {s.rowIndex}: INEP {s.inep} ({s.name})
              </li>
            ))}
          </ul>
        </details>
      )}

      {result.parseErrors.length > 0 && (
        <details className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs">
          <summary className="cursor-pointer font-medium text-rose-900">
            {result.parseErrors.length} linha(s) com erro de leitura
          </summary>
          <ul className="mt-2 space-y-1 text-rose-800">
            {result.parseErrors.map((e) => (
              <li key={e.rowIndex}>
                Linha {e.rowIndex}: {e.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: 'default' | 'ok' | 'warn';
}) {
  const bg =
    variant === 'ok'
      ? 'bg-emerald-50 border-emerald-200'
      : variant === 'warn'
        ? 'bg-amber-50 border-amber-200'
        : 'bg-slate-50 border-slate-200';
  const fg =
    variant === 'ok'
      ? 'text-emerald-900'
      : variant === 'warn'
        ? 'text-amber-900'
        : 'text-slate-900';
  return (
    <div className={cn('rounded-xl border p-2', bg)}>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn('mt-0.5 text-2xl font-semibold', fg)}>{value}</p>
    </div>
  );
}