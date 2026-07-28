# Painel de Convênios

PWA da Secretaria de Educação para acompanhamento de Convênios, SIMEC, Biênio e Mandato Tampão das escolas.

> Status: **MVP em desenvolvimento**. Auth + Escolas + Convênios + Visão Geral + PWA. Módulos SIMEC/Biênio/Mandato, import de planilhas e realtime entram em iterações seguintes.

## Pré-requisitos

- Node.js **20 LTS** ou superior
- Uma conta em [Supabase](https://supabase.com) (free tier serve)
- (Opcional, no futuro) Conta GitHub + Vercel para deploy

## Setup

```bash
# 1. Instalar dependências
npm install

# 2. Copiar o template de variáveis de ambiente
cp .env.local.example .env.local
# Edite .env.local e preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
# (valores no painel do Supabase: Settings → API)

# 3. Subir o app em modo dev
npm run dev
```

## Supabase

1. Crie um projeto em https://supabase.com (free tier serve).
2. No painel SQL Editor, rode os arquivos em `supabase/migrations/` na ordem
   numérica do nome (eles já estão ordenados).
3. Em **Settings → API** copie `Project URL` e `anon public key` para o `.env.local`.
4. Ainda no SQL Editor, rode `supabase/seed.sql` (ou já está coberto na última
   migration) para popular `verba_tipos`, `status_catalog` e `config`.

## PWA — instalar no telemóvel

Após o deploy (ou em `npm run preview`/HTTPS local), abra o app no Chrome do
Android. Aparece um botão **"Instalar"** na Visão Geral, ou use o menu
`⋮ → Instalar app`. O ícone aparece na tela inicial e abre em tela cheia
(sem barra de URL). Funciona offline depois do primeiro carregamento — as
leituras anteriores ficam em cache; escritas exigem internet.

## Deploy (Vercel)

1. Suba o código para um repositório no GitHub.
2. Importe o projeto em https://vercel.com (login com GitHub).
3. Vercel detecta Vite automaticamente. Sem precisar de config.
4. Em **Settings → Environment Variables** adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. A URL pública já é HTTPS — suficiente para PWA.

## Estrutura

```
src/
├── components/        # UI primitives, layout, records
├── features/          # páginas, agrupadas por módulo
├── hooks/             # data hooks (TanStack Query)
├── lib/               # supabase client, utils, datas, status
├── types/             # tipos (incluindo database.ts gerado do Supabase)
└── main.tsx
supabase/
└── migrations/        # migrations SQL numeradas por timestamp
```

## Scripts

| Comando            | O que faz                                         |
| ------------------ | ------------------------------------------------- |
| `npm run dev`      | Sobe o Vite em http://localhost:5173               |
| `npm run build`    | Build de produção em `dist/`                      |
| `npm run preview`  | Serve o build localmente                          |
| `npm run typecheck`| Verifica TypeScript sem emitir                    |

## Roadmap

- [x] **MVP** — Auth, Escolas, Convênios, Visão Geral, PWA
- [ ] SIMEC, Biênio, Mandato Tampão
- [ ] Importação de Excel (escolas + biênios)
- [ ] Realtime entre usuários
- [ ] Templates de mensagem + botão de enviar
- [ ] Ranking de escolas atrasadas
- [ ] Anexos no Storage do Supabase
- [ ] Backup JSON
