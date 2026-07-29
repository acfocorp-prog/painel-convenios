# Painel de Convênios

PWA da Secretaria de Educação para acompanhamento de Convênios, SIMEC, Biênio e Mandato Tampão das escolas.

> Status: **MVP em desenvolvimento**. Auth + Escolas + Convênios + Visão Geral + PWA. Módulos SIMEC/Biênio/Mandato, import de planilhas e realtime entram em iterações seguintes.

## Avisos oficiais (sino no header)

Um sino no topo mostra prazos publicados em fontes oficiais (FNDE, MEC, Diário
Oficial da União, Diário Oficial do município, Querido Diário, etc.). Cada
aviso tem severidade (`INFO` / `ATENCAO` / `URGENTE`), categoria
(`CONVENIO` / `SIMEC` / `BIENIO` / `MANDATO` / `GERAL`) e link para a fonte.

- **Sino + popover** com os 10 últimos não-lidos e botão "marcar todos".
- **Página `/avisos-oficiais`** com lista completa, filtros (fonte, categoria,
  urgentes, arquivados) e ações (marcar lido / arquivar).
- **Realtime**: novo aviso aparece no sino de todos em 1-2s; marcar como lido
  em uma aba reflete na outra.
- O cadastro é responsabilidade de uma rotina externa (cron). O workflow
  `.github/workflows/fetch-official-deadlines.yml` já está estruturado mas
  **desabilitado por padrão** até a fonte ser confirmada. O `seed.sql` insere
  8 avisos de exemplo pra UI já ter conteúdo no primeiro deploy.

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
- [x] SIMEC, Biênio, Mandato Tampão
- [x] Importação de Excel (escolas)
- [x] Realtime entre usuários
- [x] Ranking de escolas atrasadas
- [x] Anexos no Storage do Supabase
- [x] Backup JSON
- [x] Templates de mensagem (placeholders + preview)
- [x] Avisos oficiais (sino + mural no header, seed inicial, cron stub via GitHub Action)
- [ ] Botão de enviar modelos de mensagem (WhatsApp / e-mail)
- [ ] Importação de Excel para outros módulos (convênios/SIMEC/biênios/mandatos)
- [ ] Cron ativo de avisos (escolher fonte e ligar `.github/workflows/fetch-official-deadlines.yml`)
