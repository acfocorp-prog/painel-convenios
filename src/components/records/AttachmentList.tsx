import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileText, Trash2, Upload } from 'lucide-react';
import {
  useAttachments,
  useDeleteAttachment,
  useUploadAttachment,
  getAttachmentUrl,
  type RegistroTipo,
} from '@/hooks/useAttachments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn, formatRelative } from '@/lib/utils';

const MAX_SIZE_MB = 10;

export function AttachmentList({
  registroTipo,
  registroId,
}: {
  registroTipo: RegistroTipo;
  registroId: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: items, isLoading } = useAttachments(registroTipo, registroId);
  const upload = useUploadAttachment(registroTipo, registroId);
  const del = useDeleteAttachment(registroTipo, registroId);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onUpload(file: File) {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Arquivo maior que ${MAX_SIZE_MB} MB`);
      return;
    }
    try {
      await upload.mutateAsync(file);
      toast.success('Anexo enviado');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar');
    }
  }

  async function onOpen(a: { storage_path: string; file_name: string }) {
    try {
      const url = await getAttachmentUrl(a.storage_path);
      if (!url) {
        toast.error('Não foi possível gerar o link');
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  }

  async function onDelete(a: { id: string; file_name: string }) {
    if (!confirm(`Excluir "${a.file_name}"?`)) return;
    setBusyId(a.id);
    try {
      await del.mutateAsync(a as Parameters<typeof del.mutateAsync>[0]);
      toast.success('Anexo excluído');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-400" />
          Anexos
          {items && items.length > 0 && (
            <span className="ml-1 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {items.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onUpload(f);
          }}
        />
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={upload.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          {upload.isPending ? 'Enviando…' : 'Anexar arquivo'}
        </Button>

        {isLoading && <LoadingSpinner />}

        {!isLoading && items && items.length === 0 && (
          <p className="py-2 text-center text-xs text-slate-500">
            Sem anexos ainda.
          </p>
        )}

        {items && items.length > 0 && (
          <ul className="space-y-1">
            {items.map((a) => (
              <li
                key={a.id}
                className={cn(
                  'flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 text-sm',
                )}
              >
                <button
                  type="button"
                  onClick={() => void onOpen(a)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {a.file_name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {a.size_bytes != null &&
                        `${(a.size_bytes / 1024).toFixed(1)} KB · `}
                      {formatRelative(a.uploaded_at)}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  className="text-status-danger hover:underline"
                  disabled={busyId === a.id}
                  onClick={() => void onDelete(a)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}