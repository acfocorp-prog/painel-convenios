import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

interface BankInfoFieldsProps {
  bankBranch: string;
  bankAccount: string;
  onBankBranchChange: (v: string) => void;
  onBankAccountChange: (v: string) => void;
  /** Quando true, está marcado como "lançado" — daí exibe alerta se estiver vazio. */
  launched: boolean;
}

/**
 * Campos de agência e conta. Renderizado apenas quando a verba selecionada
 * exige (requires_bank_info). Mostra alerta amarelo quando lançado=true e
 * algum dos campos está vazio (avisa, não bloqueia).
 */
export function BankInfoFields({
  bankBranch,
  bankAccount,
  onBankBranchChange,
  onBankAccountChange,
  launched,
}: BankInfoFieldsProps) {
  const missing = launched && (!bankBranch.trim() || !bankAccount.trim());

  return (
    <div className="space-y-3 rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Dados bancários
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="bankBranch">Agência</Label>
          <Input
            id="bankBranch"
            value={bankBranch}
            onChange={(e) => onBankBranchChange(e.target.value)}
            placeholder="0000"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bankAccount">Conta</Label>
          <Input
            id="bankAccount"
            value={bankAccount}
            onChange={(e) => onBankAccountChange(e.target.value)}
            placeholder="00000-0"
          />
        </div>
      </div>

      {missing && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Você marcou como lançado sem preencher agência/conta. A aplicação
            pode bloquear o envio do relatório depois.
          </span>
        </div>
      )}
    </div>
  );
}
