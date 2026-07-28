import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export type MessageTemplate = {
  id: string;
  title: string;
  body: string;
  created_by: string | null;
  created_at: string;
};

export type MessageTemplateInsert = {
  title: string;
  body: string;
};

export function useMessageTemplates() {
  return useQuery({
    queryKey: ['message_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MessageTemplate[];
    },
  });
}

export function useCreateMessageTemplate() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: MessageTemplateInsert) => {
      const { data, error } = await supabase
        .from('message_templates')
        .insert({
          title: input.title.trim(),
          body: input.body,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as MessageTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['message_templates'] }),
  });
}

export function useDeleteMessageTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('message_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['message_templates'] }),
  });
}

/**
 * Substitui placeholders no template. Suportados:
 *   {{escola_nome}}    → nome da escola
 *   {{escola_inep}}    → INEP
 *   {{prazo}}          → dd/MM/yyyy (due_date)
 *   {{data_hoje}}      → dd/MM/yyyy
 *   {{secretaria}}     → "Secretaria Municipal de Educação"
 *
 * Placeholders desconhecidos ficam como string literal (não throw),
 * pra usuário ver o que não foi substituído.
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string | null | undefined>,
) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => {
    const v = vars[key];
    return v && v.length > 0 ? v : `{{${key}}}`;
  });
}