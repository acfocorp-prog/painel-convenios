import { Link } from 'react-router-dom';
import { AlertTriangle, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useRanking } from '@/hooks/useRanking';

const TOP_LIMIT = 5;

export function RankingCard() {
  const { entries, total, isLoading } = useRanking();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-600" />
          Ranking de atrasos
          {total > 0 && (
            <Badge variant="warn" className="ml-1">
              {total}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingSpinner />}
        {!isLoading && entries.length === 0 && (
          <EmptyState
            icon={Trophy}
            title="Nenhuma escola atrasada"
            description="Quando algo atrasar, a escola aparece aqui automaticamente."
          />
        )}
        {!isLoading && entries.length > 0 && (
          <ol className="space-y-2">
            {entries.slice(0, TOP_LIMIT).map((e, idx) => (
              <li key={e.escolaId}>
                <Link
                  to={`/escolas/${e.escolaId}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2 hover:bg-slate-50 active:scale-[0.99]"
                >
                  <span
                    className={[
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      idx === 0
                        ? 'bg-amber-100 text-amber-900'
                        : idx === 1
                          ? 'bg-slate-200 text-slate-700'
                          : idx === 2
                            ? 'bg-orange-100 text-orange-900'
                            : 'bg-slate-100 text-slate-500',
                    ].join(' ')}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {e.escolaNome}
                    </p>
                    <p className="text-xs text-slate-500">
                      INEP {e.escolaInep} · {e.breakdown.convenios}c /{' '}
                      {e.breakdown.simec}s / {e.breakdown.bienios}b /{' '}
                      {e.breakdown.mandatos}m
                    </p>
                  </div>
                  <Badge variant="danger">
                    <AlertTriangle className="mr-1 inline h-3 w-3" />
                    {e.totalAtrasos}
                  </Badge>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}