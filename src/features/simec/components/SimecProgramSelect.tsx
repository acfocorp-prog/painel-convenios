import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PRESET = ['PNATE', 'PDDE'] as const;
type PresetProgram = (typeof PRESET)[number] | 'OUTRO';

const ALL = '__all__';

/**
 * Select de programa do SIMEC: opções pré-definidas (PNATE, PDDE) ou
 * "Outro (especificar)" — quando o usuário escolhe Outro, aparece um
 * Input texto para digitar o nome do programa.
 *
 * Padrão: o campo controlado de cima (`value`) é sempre o programa
 * final (string). O Select interno é independente e usa uma chave
 * de "modo" pra decidir se mostra o Input.
 */
export function SimecProgramSelect({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
}) {
  const isPreset = (PRESET as readonly string[]).includes(value);
  const [mode, setMode] = useState<PresetProgram>(
    isPreset ? (value as PresetProgram) : value ? 'OUTRO' : 'PNATE',
  );
  const [otherText, setOtherText] = useState<string>(
    !isPreset && value ? value : '',
  );

  function handleModeChange(next: string) {
    if (next === 'OUTRO') {
      setMode('OUTRO');
      onChange(otherText);
    } else {
      setMode(next as PresetProgram);
      setOtherText('');
      onChange(next);
    }
  }

  function handleOtherTextChange(text: string) {
    setOtherText(text);
    onChange(text);
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Programa *</Label>
      <Select value={mode} onValueChange={handleModeChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          {PRESET.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
          <SelectItem value="OUTRO">Outro (especificar)</SelectItem>
        </SelectContent>
      </Select>
      {mode === 'OUTRO' && (
        <Input
          value={otherText}
          onChange={(e) => handleOtherTextChange(e.target.value)}
          placeholder="ex.: PDE Escola, Novo Mais Educação…"
          aria-label="Nome do programa"
        />
      )}
    </div>
  );
}

/** Sentinela usada quando o Select for obrigado a ter um valor. */
export const SIMEC_PROGRAM_SENTINEL = ALL;
