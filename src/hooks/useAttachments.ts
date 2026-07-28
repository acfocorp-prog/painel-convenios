import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export type Attachment = {
  id: string;
  registro_tipo: 'CONVENIO' | 'SIMEC' | 'BIENIO' | 'MANDATO';
  registro_id: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  uploaded_at: string;
};

export type RegistroTipo =
  | 'CONVENIO'
  | 'SIMEC'
  | 'BIENIO'
  | 'MANDATO';

export function useAttachments(
  registroTipo: RegistroTipo,
  registroId: string | undefined,
) {
  return useQuery({
    queryKey: ['attachments', registroTipo, registroId],
    enabled: !!registroId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('registro_tipo', registroTipo)
        .eq('registro_id', registroId!)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Attachment[];
    },
  });
}

export function useUploadAttachment(
  registroTipo: RegistroTipo,
  registroId: string,
) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (file: File) => {
      // Storage path: <registroTipo>/<registroId>/<timestamp>-
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${registroTipo.toLowerCase()}/${registroId}/${Date.now()}-${safeName}`;

      const { error: storageError } = await supabase.storage
        .from('attachments')
        .upload(path, file, { upsert: false });
      if (storageError) throw storageError;

      const { data, error } = await supabase
        .from('attachments')
        .insert({
          registro_tipo: registroTipo,
          registro_id: registroId,
          file_name: file.name,
          storage_path: path,
          mime_type: file.type || null,
          size_bytes: file.size,
          uploaded_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) {
        // Rollback storage em caso de erro no DB
        await supabase.storage.from('attachments').remove([path]);
        throw error;
      }
      return data as Attachment;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['attachments', registroTipo, registroId],
      });
    },
  });
}

export function useDeleteAttachment(
  registroTipo: RegistroTipo,
  registroId: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: Attachment) => {
      // Remove do storage + tabela (em paralelo)
      const [{ error: storageError }, { error: dbError }] = await Promise.all([
        supabase.storage.from('attachments').remove([a.storage_path]),
        supabase.from('attachments').delete().eq('id', a.id),
      ]);
      if (storageError) throw storageError;
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['attachments', registroTipo, registroId],
      });
    },
  });
}

export async function getAttachmentUrl(path: string): Promise<string> {
  const { data } = await supabase.storage
    .from('attachments')
    .createSignedUrl(path, 60 * 60); // 1h
  return data?.signedUrl ?? '';
}