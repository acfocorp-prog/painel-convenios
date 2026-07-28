import { formatRelative } from '@/lib/utils';
import { useProfileById } from '@/hooks/useProfileById';

interface AuditTrailProps {
  createdBy: string | null;
  createdAt: string;
  updatedBy?: string | null;
  updatedAt?: string;
}

export function AuditTrail({
  createdBy,
  createdAt,
  updatedBy,
  updatedAt,
}: AuditTrailProps) {
  const created = useProfileById(createdBy);
  const updated = useProfileById(updatedBy ?? null);

  return (
    <div className="space-y-1 text-xs text-slate-500">
      <p>
        Criado por{' '}
        <span className="font-medium text-slate-700">
          {created.data?.full_name ?? 'usuário'}
        </span>{' '}
        {formatRelative(createdAt)}
      </p>
      {updatedAt && updatedAt !== createdAt && (
        <p>
          Última edição por{' '}
          <span className="font-medium text-slate-700">
            {updated.data?.full_name ?? 'usuário'}
          </span>{' '}
          {formatRelative(updatedAt)}
        </p>
      )}
    </div>
  );
}
