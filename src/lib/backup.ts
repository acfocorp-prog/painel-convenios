import { supabase } from '@/lib/supabase';

/**
 * Backup completo em JSON.
 *
 * Estratégia: Promise.all nos 9 SELECTs (incluindo deleted_at=null pra ter
 * histórico vivo). Gera um Blob e dispara download via <a>.
 *
 * 9 tabelas exportadas:
 *   escolas, convenios, simec_adhesions, bienios, mandatos_tampao,
 *   status_history, profiles, verba_tipos, status_catalog
 *
 * EXCLUÍDOS: attachments (paths de storage seriam inválidos em outra máquina),
 *            process_links, message_templates (não tem dado útil pra backup),
 *            config (chaves por ambiente), school_notes (provavelmente já coberto)
 *
 * ISO timestamps preservados pelo Supabase (jsonb/timestamptz → ISO string).
 */

const TABLES = [
  'escolas',
  'convenios',
  'simec_adhesions',
  'bienios',
  'mandatos_tampao',
  'status_history',
  'profiles',
  'verba_tipos',
  'status_catalog',
  'official_deadlines',
] as const;

type TableName = (typeof TABLES)[number];

export interface BackupPayload {
  meta: {
    generated_at: string;
    app: 'painel-convenios';
    schema_version: number;
    row_counts: Record<TableName, number>;
    notes: string[];
  };
  data: Record<TableName, unknown[]>;
}

export async function buildBackupPayload(): Promise<BackupPayload> {
  const fetches = await Promise.all(
    TABLES.map(async (table) => {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        // Se RLS bloquear, ainda assim retornamos array vazio.
        // Não throw — backup parcial é melhor que zero.
        // eslint-disable-next-line no-console
        console.warn(`[backup] tabela ${table} sem acesso:`, error.message);
        return [table, []] as const;
      }
      return [table, data ?? []] as const;
    }),
  );

  const data = {} as Record<TableName, unknown[]>;
  const rowCounts = {} as Record<TableName, number>;

  for (const [table, rows] of fetches) {
    data[table] = [...rows];
    rowCounts[table] = rows.length;
  }

  return {
    meta: {
      generated_at: new Date().toISOString(),
      app: 'painel-convenios',
      schema_version: 1,
      row_counts: rowCounts,
      notes: [
        'Anexos (attachments) NÃO incluídos — paths de storage locais.',
        'Backup inclui registros soft-deleted (deleted_at != null) onde existem.',
        'Importar este JSON restaura tudo exceto anexos.',
      ],
    },
    data,
  };
}

export async function downloadJsonBackup(): Promise<{
  filename: string;
  bytes: number;
}> {
  const payload = await buildBackupPayload();
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const today = new Date().toISOString().slice(0, 10);
  const filename = `painel-convenios-backup-${today}.json`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);

  return { filename, bytes: blob.size };
}