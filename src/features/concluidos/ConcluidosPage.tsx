import { Construction } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';

export function ConcluidosPage() {
  return (
    <div className="space-y-3">
      <PageHeader
        title="Concluídos"
        description="Tudo o que já foi finalizado, em todas as categorias."
      />
      <div className="px-4">
        <Card className="p-1">
          <EmptyState
            icon={Construction}
            title="Em construção"
            description="Esta visão entra na próxima iteração, junto com a importação de planilhas."
          />
        </Card>
      </div>
    </div>
  );
}
