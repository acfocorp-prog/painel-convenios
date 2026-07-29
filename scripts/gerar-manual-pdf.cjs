/**
 * Gera o manual do usuário do Painel de Convênios em PDF.
 * Roda com: node scripts/gerar-manual-pdf.cjs
 * Saída: manual-painel-convenios.pdf (na raiz)
 *
 * Princípios de layout (corretos):
 *  - Toda função de bloco verifica antes de desenhar se há espaço na página.
 *    Se não houver, abre nova página.
 *  - callout DESENHA o retângulo primeiro e o texto por cima (não o contrário).
 *  - Texto multi-linha em callout: usa \n explicitamente, calcula altura do
 *    texto depois de renderizá-lo para dimensionar o retângulo.
 *  - Página kinda "respirável": 18-22 páginas pra 12 capítulos.
 */

const fs = require('node:fs');
const path = require('node:path');
const PDFDocument = require('pdfkit');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'manual-painel-convenios.pdf');

const COR = {
  preto: '#0f172a',
  cinza: '#475569',
  cinzaClaro: '#94a3b8',
  cinzaMuitoClaro: '#f1f5f9',
  teal: '#0f766e',
  tealClaro: '#ccfbf1',
  amber: '#b45309',
  amberClaro: '#fef3c7',
  vermelho: '#b91c1c',
  verde: '#15803d',
};

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 56, bottom: 56, left: 56, right: 56 },
  info: {
    Title: 'Manual do Usuário — Painel de Convênios',
    Author: 'Secretaria Municipal de Educação',
    Subject: 'Guia de uso do sistema Painel de Convênios',
    Keywords: 'manual, painel, convênios, simec, biênio, mandato, educação',
  },
});

const stream = fs.createWriteStream(OUT);
doc.pipe(stream);

const PAGE = { w: doc.page.width, h: doc.page.height };
const M = { top: 56, bottom: 56, left: 56, right: 56 };
const CONTENT_W = PAGE.w - M.left - M.right;

// Helpers ============================================================
function ensureSpace(needed) {
  if (doc.y + needed > PAGE.h - M.bottom - 4) {
    doc.addPage();
  }
}

function h1(texto, comNovaPagina = true) {
  if (comNovaPagina) {
    doc.addPage();
  }
  doc.fillColor(COR.teal).fontSize(20).font('Helvetica-Bold').text(texto, M.left, M.top);
  doc.moveDown(0.1);
  doc
    .strokeColor(COR.teal)
    .lineWidth(1.5)
    .moveTo(M.left, doc.y)
    .lineTo(M.left + 60, doc.y)
    .stroke();
  doc.fillColor(COR.preto).moveDown(0.4);
}

function h2(texto) {
  ensureSpace(28);
  doc.moveDown(0.25);
  doc.fillColor(COR.preto).fontSize(13).font('Helvetica-Bold').text(texto, M.left);
  doc.moveDown(0.1);
  doc.fillColor(COR.preto);
}

function h3(texto) {
  ensureSpace(20);
  doc.moveDown(0.15);
  doc.fillColor(COR.teal).fontSize(11).font('Helvetica-Bold').text(texto, M.left);
  doc.fillColor(COR.preto).moveDown(0.08);
}

function paragrafo(texto, opts = {}) {
  ensureSpace(20);
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor(opts.color || COR.preto)
    .text(texto, M.left, doc.y, {
      width: CONTENT_W,
      align: opts.align || 'left',
      lineGap: 2,
    });
  doc.moveDown(0.12);
}

function paragrafoHtml(texto, opts = {}) {
  ensureSpace(20);
  const escaped = texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const parts = [];
  let buffer = '';
  let bold = false;
  let italic = false;
  let i = 0;
  while (i < escaped.length) {
    if (escaped.startsWith('**', i)) {
      if (buffer) parts.push({ t: buffer, bold, italic });
      bold = !bold;
      buffer = '';
      i += 2;
    } else if (escaped[i] === '*') {
      if (buffer) parts.push({ t: buffer, bold, italic });
      italic = !italic;
      buffer = '';
      i += 1;
    } else {
      buffer += escaped[i];
      i += 1;
    }
  }
  if (buffer) parts.push({ t: buffer, bold, italic });

  doc.fontSize(10);
  for (let j = 0; j < parts.length; j++) {
    const seg = parts[j];
    let font = 'Helvetica';
    if (seg.bold && seg.italic) font = 'Helvetica-BoldOblique';
    else if (seg.bold) font = 'Helvetica-Bold';
    else if (seg.italic) font = 'Helvetica-Oblique';
    doc.font(font).fillColor(opts.color || COR.preto);
    doc.text(seg.t, {
      continued: j < parts.length - 1,
      width: CONTENT_W,
      lineGap: 2,
    });
  }
  doc.moveDown(0.12);
}

function item(texto, nivel = 0) {
  ensureSpace(16);
  const indent = '  '.repeat(nivel);
  const bullet = nivel === 0 ? '• ' : '– ';
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor(COR.preto)
    .text(`${indent}${bullet}${texto}`, M.left + nivel * 14, doc.y, {
      width: CONTENT_W - nivel * 14,
      lineGap: 2,
    });
  doc.moveDown(0.06);
}

function passo(numero, texto) {
  // Renderiza em uma única chamada de texto — sem `continued: true`,
  // que estava quebrando o kerning do pdfkit ("T oqu e em" ao invés de "Toque em").
  ensureSpace(20);
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor(COR.teal)
    .text(`${numero}.  ${texto}`, M.left, doc.y, { width: CONTENT_W, lineGap: 2 });
  doc.moveDown(0.15);
}

function callout(texto, variante = 'teal') {
  const cores = {
    teal: { bg: COR.cinzaMuitoClaro, borda: COR.teal, fg: COR.preto },
    amber: { bg: COR.amberClaro, borda: COR.amber, fg: COR.preto },
  };
  const c = cores[variante] || cores.teal;

  doc.fontSize(10).font('Helvetica');
  const textHeight = doc.heightOfString(texto, {
    width: CONTENT_W - 16,
    lineGap: 2,
  });
  const boxHeight = textHeight + 14;
  ensureSpace(boxHeight + 6);

  const startY = doc.y;
  const x = M.left;
  const w = CONTENT_W;

  // 1. Retângulo PRIMEIRO
  doc
    .rect(x, startY, w, boxHeight)
    .fillColor(c.bg)
    .fill();

  // 2. Borda colorida à esquerda
  doc
    .rect(x, startY, 4, boxHeight)
    .fillColor(c.borda)
    .fill();

  // 3. Texto POR CIMA
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor(c.fg)
    .text(texto, x + 12, startY + 7, {
      width: w - 16,
      lineGap: 2,
    });

  doc.y = startY + boxHeight;
  doc.moveDown(0.2);
}

function tabela(rows, opts = {}) {
  const colLabelW = (opts.labelW || 0.4) * CONTENT_W;
  const colValueW = CONTENT_W - colLabelW;
  const lineH = 16;
  ensureSpace(rows.length * lineH + 4);

  doc.fontSize(10);
  for (const row of rows) {
    const y = doc.y;
    doc
      .fillColor(COR.cinza)
      .font('Helvetica-Bold')
      .text(row.label, M.left, y, { width: colLabelW });
    doc
      .fillColor(COR.preto)
      .font('Helvetica')
      .text(row.value, M.left + colLabelW, y, { width: colValueW });
    doc.moveDown(0.12);
  }
  doc.moveDown(0.2);
}

function rodape() {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const y = PAGE.h - 36;
    doc
      .fontSize(8)
      .fillColor(COR.cinzaClaro)
      .font('Helvetica')
      .text(
        'Manual do Painel de Convênios · Secretaria Municipal de Educação',
        M.left,
        y,
        { width: CONTENT_W, align: 'center' },
      );
    doc.text(`Página ${i + 1} de ${range.count}`, M.left, y + 11, {
      width: CONTENT_W,
      align: 'center',
    });
  }
}

// ===== Capa =====
doc
  .rect(0, 0, PAGE.w, PAGE.h)
  .fillColor(COR.teal)
  .fill();
doc
  .fillColor('#ffffff')
  .fontSize(34)
  .font('Helvetica-Bold')
  .text('Painel de Convênios', M.left, 220, { width: CONTENT_W, align: 'center' });
doc
  .fontSize(18)
  .font('Helvetica')
  .text('Manual do usuário', M.left, 270, { width: CONTENT_W, align: 'center' });
doc
  .fontSize(12)
  .font('Helvetica')
  .text('Secretaria Municipal de Educação', M.left, 300, { width: CONTENT_W, align: 'center' });
doc
  .fontSize(12)
  .font('Helvetica')
  .text('Planejamento e Finanças', M.left, 318, { width: CONTENT_W, align: 'center' });
doc
  .moveTo(PAGE.w / 2 - 40, 360)
  .lineTo(PAGE.w / 2 + 40, 360)
  .lineWidth(2)
  .strokeColor('#ffffff')
  .stroke();
doc
  .fontSize(11)
  .text('Versão 1.0 · Julho/2026', M.left, 380, { width: CONTENT_W, align: 'center' });

// ===== Página de boas-vindas =====
doc.fillColor(COR.preto);
h1('Bem-vindo(a)');

paragrafoHtml(
  'Este manual ensina a usar o **Painel de Convênios** — o sistema para acompanhar prestações de contas, SIMEC, biênios e mandatos tampão da Secretaria Municipal de Educação.',
);
paragrafoHtml(
  'O sistema roda direto no navegador do telemóvel ou do computador. Não precisa instalar nada: abra o link, faça login e use. Para a sua comodidade, dá pra adicionar o ícone na tela inicial do Android e ele abre como se fosse um aplicativo.',
);

h2('Para quem é este manual');
item('Equipe de Planejamento e Finanças da Secretaria de Educação.');
item('Demais servidores da pasta que precisem consultar ou alimentar dados.');

h2('Como ler este manual');
paragrafoHtml(
  'As seções seguem a ordem em que você naturalmente usaria o sistema: primeiro **instala**, depois **entra**, depois **cadastra escolas** (que são a base de tudo), e em seguida usa cada módulo. Ao final, há um capítulo de **dicas e perguntas frequentes**.',
);

callout(
  'Dica: leitura recomendada é na ordem. Mas se você já usa o sistema e quer tirar uma dúvida específica, use o sumário (próxima página) para ir direto à seção.',
  'teal',
);

doc.addPage();
h1('Sumário', false);

const sumario = [
  { num: '1', titulo: 'Antes de começar', desc: 'instalar o app e criar conta' },
  { num: '2', titulo: 'Visão geral', desc: 'a tela inicial' },
  { num: '3', titulo: 'Escolas', desc: 'cadastro da base de unidades' },
  { num: '4', titulo: 'Convênios', desc: 'prestações de contas' },
  { num: '5', titulo: 'SIMEC', desc: 'adesões a programas' },
  { num: '6', titulo: 'Biênio', desc: 'atas e cartório' },
  { num: '7', titulo: 'Mandato tampão', desc: 'mandatos interinos' },
  { num: '8', titulo: 'Concluídos', desc: 'arquivo de finalizados' },
  { num: '9', titulo: 'Anexos', desc: 'documentos em qualquer registro' },
  { num: '10', titulo: 'Configurações', desc: 'backup, mensagens, lembretes' },
  { num: '11', titulo: 'Importar e exportar', desc: 'planilhas CSV/XLSX' },
  { num: '12', titulo: 'Dicas e perguntas frequentes', desc: 'truques do dia-a-dia' },
];

for (const s of sumario) {
  ensureSpace(20);
  const y = doc.y;
  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .fillColor(COR.teal)
    .text(`${s.num}.`, M.left, y, { width: 30 });
  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .fillColor(COR.preto)
    .text(s.titulo, M.left + 30, y, { width: 200 });
  doc
    .fontSize(10)
    .font('Helvetica-Oblique')
    .fillColor(COR.cinza)
    .text(s.desc, M.left + 240, y + 1, { width: CONTENT_W - 240 });
  doc.moveDown(0.4);
}

// ===== 1. Antes de começar =====
h1('1. Antes de começar');

h2('1.1 Acessando pelo telemóvel (Android)');
paragrafo(
  'A forma mais prática de usar o sistema é adicioná-lo à tela inicial do Android como se fosse um aplicativo comum.',
);
passo(1, 'Abra o Chrome no telemóvel e digite o endereço do sistema (o link é fornecido pela equipe técnica).');
passo(2, 'Toque no menu do Chrome (três pontinhos no canto superior).');
passo(3, 'Escolha **Adicionar à tela inicial** (ou **Instalar app**).');
passo(4, 'Confirme o nome — pode manter "Painel de Convênios" — e toque em **Adicionar**.');

paragrafoHtml(
  'Pronto: o ícone aparece na tela inicial do telemóvel. Ao tocar no ícone, o sistema abre em tela cheia, sem a barra de endereço do navegador. Para sair, use o botão **Sair** dentro do app.',
);

h2('1.2 Acessando pelo computador');
paragrafo(
  'Abra o navegador (Chrome, Edge ou Firefox) e digite o mesmo endereço. Use normalmente com mouse e teclado.',
);

h2('1.3 Criando a sua conta');
paragrafo('Na primeira vez, toque em **Criar conta** na tela de login.');
passo(1, 'Preencha **Nome completo** (será exibido nos registros: "Criado por ...").');
passo(2, 'Preencha **Email** — use um email válido, pois é por lá que o sistema identifica cada pessoa.');
passo(3, 'Crie uma **Senha** (mínimo 8 caracteres, algo difícil de adivinhar).');
passo(4, 'Toque em **Cadastrar**.');

callout(
  'Como o sistema foi feito para uma equipe pequena, não há etapa de aprovação automática. Cada pessoa se cadastra sozinha. Para dúvidas, fale com a equipe técnica.',
  'amber',
);

h2('1.4 Entrando no sistema');
paragrafo(
  'Depois de cadastrado, informe **email** e **senha** na tela inicial e toque em **Entrar**. O sistema lembra de você nas próximas vezes, a menos que você toque em **Sair**.',
);

h2('1.5 Saindo do sistema');
paragrafo(
  'Toque no ícone de engrenagem no topo da tela para abrir **Configurações**, role até a última seção **Minha conta** e toque em **Sair**. A sessão também é encerrada automaticamente se você ficar muito tempo sem usar.',
);

// ===== 2. Visão geral =====
h1('2. Visão geral — a tela inicial');

paragrafo(
  'Ao entrar, a primeira tela que aparece é a **Visão geral**. Ela reúne os números mais importantes do dia para você saber o que precisa de atenção imediata.',
);

h2('2.1 As 4 caixinhas coloridas no topo');
paragrafo(
  'Cada caixinha é um módulo do sistema. O número grande destacado é a quantidade de itens **atrasados** (em vermelho). Embaixo, dois números menores informam quantos estão em aberto e quantos estão concluídos.',
);

h3('O que cada caixinha representa');
tabela([
  { label: 'Convênios', value: 'prestações de contas com prazos (FUNDEB, PNAE, PDDE, ...)' },
  { label: 'SIMEC', value: 'adesões a programas do MEC por escola' },
  { label: 'Biênio', value: 'ciclos bienais de direção escolar (atas e cartório)' },
  { label: 'Mandato', value: 'mandatos tampão — interinos durante vacância' },
]);

paragrafoHtml('Se quiser ver a lista daquele módulo, **toque na caixinha**.');

h2('2.2 Atrasados');
paragrafo(
  'A primeira lista mostra os registros com prazo vencido e ainda em aberto. A ordem é da mais atrasada para a menos. Cada item mostra: o nome, o prazo original, há quantos dias venceu, e um botão para abrir o detalhe.',
);
paragrafoHtml(
  '**Toque em qualquer item** para abrir a tela de detalhe (onde você pode mudar o status, anexar documentos, ver o histórico etc.).',
);

h2('2.3 Ranking de escolas');
paragrafo(
  'Mostra as 5 escolas com mais registros atrasados somando todos os módulos. É um indicador direto de quem precisa de mais cobrança. Toque em uma escola para abrir a página dela, onde você vê tudo que está em aberto e o que já foi concluído.',
);

h2('2.4 Próximos prazos');
paragrafo(
  'Lista de registros com prazo chegando nos próximos dias (a configuração padrão é 7 dias, mas pode ser ajustada em Configurações > Lembrete de prazos). Use essa lista para se planejar: o que vence essa semana, o que vence na próxima.',
);

callout(
  'Toda vez que outra pessoa cadastrar, editar ou mudar o status de qualquer registro, a sua tela atualiza em 1 ou 2 segundos automaticamente — não precisa recarregar.',
  'teal',
);

// ===== 3. Escolas =====
h1('3. Escolas — a base de tudo');

paragrafoHtml(
  'Toda escola cadastrada aqui pode ser vinculada aos outros módulos (Convênios, SIMEC, Biênio, Mandato). Por isso, **cadastre todas as escolas primeiro** — mesmo as que não têm nada em aberto ainda.',
);

h2('3.1 Cadastrando uma nova escola');
passo(1, 'Na aba inferior, toque em **Escolas**.');
passo(2, 'Toque em **Nova escola** (canto superior direito).');
passo(3, 'Preencha **INEP** (código de 8 dígitos — obrigatório e único).');
passo(4, 'Preencha **Nome** (oficial, como no censo escolar).');
passo(5, 'Marque **Ativa** se a escola está funcionando; desmarque se foi fechada/desativada.');
passo(6, 'Toque em **Salvar**.');

callout(
  'O INEP é a chave que identifica cada escola no MEC. Se você digitar errado, o sistema avisa (validação suave: o cadastro é salvo, mas fica marcado para você conferir depois).',
  'amber',
);

h2('3.2 Importando várias escolas de uma vez');
paragrafo(
  'Se você tem uma planilha com a lista de escolas (em Excel/CSV), é muito mais rápido importar tudo de uma vez.',
);
passo(1, 'No menu superior, toque em **Importar escolas em massa**.');
passo(2, 'Toque em **Escolher arquivo** e selecione a planilha (.xlsx).');
passo(3, 'Verifique a lista que aparece (somente leitura). Se estiver OK, toque em **Importar**.');
passo(4, 'O sistema mostra um relatório: quantos cadastros foram criados e quantos foram pulados (por INEP duplicado, por exemplo).');

paragrafoHtml(
  '**Formato esperado**: coluna A = INEP (8 dígitos), coluna B = Nome, coluna C = Ativa (sim/não, pode ser vazia). Linhas com INEP já existente são **puladas**, não sobrescritas — seus dados ficam protegidos.',
);

h2('3.3 Vendo uma escola em detalhe');
paragrafo('Toque em uma escola na lista para abrir a página de detalhe. Você verá:');
item('Dados cadastrais (INEP, nome, situação).');
item('Diário de contatos (anotações livres que você ou outra pessoa fizer).');
item('**Convênios desta escola** — lista de prestações de contas.');
item('**SIMEC desta escola** — adesões a programas.');
item('**Biênios desta escola** — ciclos bienais.');
item('**Mandatos desta escola** — mandatos tampão.');

h2('3.4 Editando dados de uma escola');
paragrafo('Na tela de detalhe, toque no ícone de lápis (canto superior direito). Altere o que precisar e toque em **Salvar**.');

h2('3.5 Excluindo uma escola');
paragrafoHtml(
  'Na tela de detalhe, role até o fim e toque em **Excluir escola**. O sistema pede confirmação. A exclusão é **lógica** — a escola não aparece mais nas listas, mas o histórico permanece salvo internamente.',
);

// ===== 4. Convênios =====
h1('4. Convênios — prestações de contas');

paragrafo(
  'O módulo Convênios cuida de todas as prestações de contas: FUNDEB, PNAE, PNAT, PDDE, PNLD, PAR, QSE — enfim, qualquer recurso que a escola recebe e tem que prestar contas para a Secretaria.',
);

h2('4.1 Cadastrando um convênio');
passo(1, 'Toque em **Convênios** na aba inferior.');
passo(2, 'Toque em **Novo convênio** (canto superior direito).');
passo(3, 'Escolha o **Tipo de verba** — o sistema ajusta o formulário conforme a verba exige.');

h3('Campos básicos');
tabela([
  { label: 'Tipo de verba', value: 'FUNDEB, PNAE, PNAT, PDDE etc.' },
  { label: 'Ano', value: 'o ano do exercício (ex.: 2026)' },
  { label: 'Referência', value: 'código ou número de referência (opcional)' },
  { label: 'Escola', value: 'a escola beneficiada (ou deixe em branco se for da secretaria)' },
  { label: 'Prazo', value: 'data limite para prestação de contas' },
  { label: 'Valor', value: 'em reais (opcional, mas recomendado)' },
  { label: 'Descrição', value: 'resumo livre do que se trata' },
  { label: 'Link do processo', value: 'URL completa se houver (SEI, sistema próprio, etc.)' },
  { label: 'Observações', value: 'anotações livres (qualquer coisa que queira registrar)' },
]);

h3('Campos bancários (algumas verbas pedem)');
paragrafoHtml(
  'Se a verba marcada tiver **"requer dados bancários"** (FUNDEB, por exemplo), o sistema mostra campos extras: **agência** e **conta**. Esses campos só aparecem depois de marcar **Lançado**, porque a verba ainda não está em trânsito até o lançamento.',
);

callout(
  'Se você marcar "Lançado = sim" sem preencher agência/conta, o sistema mostra um aviso amarelo (não bloqueia). É uma validação suave: você pode salvar, mas fica sinalizado para conferir.',
  'amber',
);

h3('Prioridade');
paragrafo('Ative o botão **É prioridade** para marcar como urgente. Convênios prioritários recebem destaque na lista.');

passo(4, 'Toque em **Salvar**. O convênio aparece na lista como **Em andamento**.');

h2('4.2 Alterando o status');
paragrafo('Na tela de detalhe do convênio, há um card **Mudar status**. As opções são:');
item('**Em andamento** — foi cadastrado, prazo está em vigor.');
item('**Atrasado** — calculado automaticamente quando o prazo passa e o convênio continua em andamento. (Você também pode marcar manualmente.)');
item('**Concluído** — prestação de contas feita e aceita.');
item('**Cancelado** — não será mais executado (com justificativa em observações).');

paragrafoHtml(
  'Toda mudança de status é **gravada no histórico** com o seu nome e a data/hora. Para ver, role até a seção **Histórico de status**.',
);

h2('4.3 Anexando documentos');
paragrafo(
  'Na tela de detalhe, role até a seção **Anexos** e toque em **Anexar arquivo**. Aceita PDF, imagem, planilha — até 10 MB por arquivo. Toque no nome do arquivo para abrir (link válido por 1 hora, por segurança).',
);

h2('4.4 Duplicando um convênio');
paragrafo(
  'Se você precisa fazer um convênio parecido com um já existente (mesma verba, mesma escola, mesmo valor), use **Duplicar** na tela de detalhe. O sistema cria uma cópia com:',
);
item('Prazo em branco (para você preencher a data nova).');
item('"Lançado" marcado como não.');
item('Notas com prefixo **[Cópia]** para você identificar.');
paragrafo('Em seguida, o sistema já abre a tela de edição da cópia para você completar os dados.');

h2('4.5 Excluindo um convênio');
paragrafo(
  'Na tela de detalhe, toque em **Excluir**. A exclusão é lógica (some das listas, mas o histórico é preservado).',
);

// ===== 5. SIMEC =====
h1('5. SIMEC — adesões a programas');

paragrafo(
  'SIMEC é o sistema do MEC. Aqui você registra as adesões das escolas municipais a programas federais (PNATE, PDDE, PDE Escola, etc.).',
);

h2('5.1 Cadastrando uma adesão');
passo(1, 'Toque em **SIMEC** na aba inferior.');
passo(2, 'Toque em **Nova adesão**.');
passo(3, 'Preencha **Escola** (obrigatório).');
passo(4, 'Escolha o **Programa** — o sistema oferece os principais (PNATE, PDDE). Se não estiver na lista, escolha **Outro (especificar)** e digite o nome do programa.');
passo(5, 'Preencha **Ano** e **Prazo** (data limite para a escola concluir a adesão).');
passo(6, 'Toque em **Salvar**.');

h2('5.2 Acompanhando e finalizando');
paragrafo('Na tela de detalhe, você pode:');
item('Mudar o status (Em andamento / Concluído / Cancelado).');
item('Marcar como prioritário.');
item('Anexar comprovantes.');
item('Duplicar (caso a mesma escola tenha adesão semelhante em outro programa ou ano).');
item('Ver o histórico de mudanças.');
paragrafo('Para saber o que está atrasado, vá em **Visão geral > Atrasados**.');

// ===== 6. Biênio =====
h1('6. Biênio — atas e cartório');

paragrafo(
  'O módulo Biênio rastreia o mandato bienal dos diretores escolares: início, fim, se a ata foi assinada e se já foi validada no cartório.',
);

h2('6.1 Cadastrando um biênio');
passo(1, 'Toque em **Biênio** na aba inferior.');
passo(2, 'Toque em **Novo biênio**.');
passo(3, 'Preencha **Escola** (obrigatório).');
passo(4, '**Ano inicial** (ex.: 2026) e **ano final** (calculado automaticamente como o ano seguinte).');
passo(5, '**Prazo** — data limite para conclusão do ciclo.');
passo(6, 'Marque **Ata assinada** se já houve a assembleia.');
passo(7, 'Toque em **Salvar**.');

h2('6.2 "Validar no cartório"');
paragrafo('Quando você recebe o documento validado pelo cartório:');
passo(1, 'Abra o biênio na lista (toque no registro).');
passo(2, 'Toque em **Validar no cartório**.');
passo(3, 'Confirme no diálogo que aparece.');

paragrafoHtml(
  'O sistema automaticamente: marca o biênio como **validado**, grava a data de validação e **muda o status para Concluído**. Tudo isso aparece no histórico de status, com o seu nome.',
);

h2('6.3 Acompanhando');
paragrafo(
  'A Visão geral mostra os biênios atrasados (datas passadas e ainda em aberto). A lista de Concluídos traz os biênios que você já validou.',
);

// ===== 7. Mandato tampão =====
h1('7. Mandato tampão — mandatos interinos');

paragrafo(
  'Use quando há um mandato provisório — por exemplo, quando o diretor titular se afasta temporariamente e alguém assume interinamente.',
);

h2('7.1 Cadastrando');
passo(1, 'Toque em **Mandatos** na aba inferior.');
passo(2, 'Toque em **Novo mandato**.');
passo(3, 'Preencha **Escola** — ou deixe em branco se for um mandato da própria Secretaria.');
passo(4, 'Preencha **Data início** e **Data fim**.');
passo(5, '**Prazo** — data de vencimento (geralmente igual à data fim).');
passo(6, 'Toque em **Salvar**.');

callout(
  'Quando o mandato não tem escola vinculada, o sistema exibe a label "Mandato tampão — Secretaria" para você não confundir com os mandatos por escola.',
  'teal',
);

h2('7.2 Acompanhando');
paragrafo(
  'O módulo Mandato aparece na Visão geral como qualquer outro. Use o histórico de status para registrar trocas de interinos.',
);

// ===== 8. Concluídos =====
h1('8. Concluídos — arquivo de finalizados');

paragrafo(
  'A aba Concluídos (no menu inferior) reúne todos os registros de todos os módulos que foram marcados como Concluídos ou Cancelados. É a sua memória institucional: o que já foi entregue, em que data, por quem.',
);

paragrafoHtml(
  'A página é dividida em **4 seções** (Convênios, SIMEC, Biênio, Mandato), cada uma com até 10 itens mais recentes. Para ver a lista completa de um módulo, toque em **Ver todos** (vai para a lista daquele módulo).',
);

h2('8.1 Quando usar');
item('Auditoria: a Secretaria de Controle pediu a lista de todos os convênios concluídos em 2025? Abra a aba Concluídos e filtra por módulo.');
item('Memória: no ano que vem, "a escola X já entregou a prestação de contas do PDDE em 2026?" — procure em Concluídos.');
item('Prestação de contas anual: exportar tudo de uma vez (ver capítulo 11).');

// ===== 9. Anexos =====
h1('9. Anexos — documentos de qualquer registro');

paragrafo(
  'Todas as telas de detalhe (Convênio, SIMEC, Biênio, Mandato) têm uma seção Anexos no final. É aqui que você salva os PDFs, fotos e planilhas relacionados àquele registro específico.',
);

h2('9.1 Adicionando');
passo(1, 'Abra o registro (qualquer módulo).');
passo(2, 'Role até a seção **Anexos**.');
passo(3, 'Toque em **Anexar arquivo** e escolha o arquivo do dispositivo.');
passo(4, 'Aguarde o envio — arquivos grandes podem demorar alguns segundos.');

h2('9.2 Visualizando');
paragrafo(
  'Toque no nome do arquivo. O sistema gera um link temporário (válido por 1 hora) e abre em nova aba. Esse esquema é mais seguro do que deixar o documento aberto na internet eternamente.',
);

h2('9.3 Excluindo');
paragrafo(
  'Toque no ícone de lixeira ao lado do arquivo. O sistema pede confirmação e remove tanto o arquivo do armazenamento quanto o cadastro.',
);

callout(
  'Limite atual: 10 MB por arquivo. Se precisar de PDFs grandes, comprima antes ou divida em partes.',
  'amber',
);

// ===== 10. Configurações =====
h1('10. Configurações');

paragrafo(
  'Toque no ícone de engrenagem no topo da tela para abrir Configurações. Aqui ficam as ferramentas que valem para todo o sistema, não para um registro específico.',
);

h2('10.1 Backup completo');
paragrafo(
  'Gera um arquivo JSON com todas as tabelas — escolas, convênios, SIMEC, biênios, mandatos, perfis, status, históricos. Útil para:',
);
item('Guardar uma cópia de segurança offline (no seu computador, num pen drive).');
item('Migrar a base para outra instalação no futuro.');
paragrafo(
  'Toque em **Baixar backup agora** e o arquivo é baixado com a data no nome (ex.: painel-convenios-backup-2026-07-28.json).',
);

callout(
  'Anexos (PDFs e fotos) não entram no backup — só os metadados. Isso evita o arquivo ficar gigantesco.',
  'amber',
);

h2('10.2 Modelos de mensagem');
paragrafo(
  'Crie textos prontos que você usa frequentemente para se comunicar com as escolas. Os modelos aceitam placeholders que viram dados reais quando você usa o modelo:',
);

tabela([
  { label: '{{escola_nome}}', value: 'nome da escola' },
  { label: '{{escola_inep}}', value: 'código INEP' },
  { label: '{{prazo}}', value: 'data de vencimento' },
  { label: '{{data_hoje}}', value: 'data de hoje (formato brasileiro)' },
  { label: '{{secretaria}}', value: 'nome da Secretaria (fixo)' },
]);

paragrafo('Exemplo de modelo:');
callout(
  'Olá {{escola_nome}},\nLembramos que a prestação de contas do convênio vence em {{prazo}}. Favor providenciar.\nAtenciosamente,\n{{secretaria}}',
  'teal',
);

paragrafo(
  'O sistema mostra um preview ao vivo do modelo conforme você digita. Quando estiver bom, toque em **Salvar modelo**.',
);

h2('10.3 Lembrete de prazos');
paragrafo(
  'Define quantos dias antes do vencimento um registro aparece na seção Próximos prazos da Visão geral. O padrão é 7 dias. Você pode ajustar de 0 a 90. Salve e o novo valor vale para todas as pessoas que usam o sistema.',
);

h2('10.4 Importar escolas em massa');
paragrafo('Atalho para a ferramenta de importação de planilhas (já explicada no capítulo 3).');

h2('10.5 Minha conta');
paragrafo(
  'No fim da página, mostra o seu nome, email e função (Administrador ou Usuário). Para encerrar a sessão, role até o fim e toque em **Sair**.',
);

// ===== 11. Importar e exportar =====
h1('11. Importar e exportar');

h2('11.1 Exportar para Excel');
paragrafo(
  'Quase toda lista (Escolas, Convênios, SIMEC, Biênio, Mandato, Concluídos) tem um botão Exportar no canto superior. Toque e o sistema baixa uma planilha .xlsx com os mesmos dados que você está vendo na tela — incluindo os filtros aplicados.',
);

paragrafo('Quando usar:');
item('Prestação de contas para a Controladoria (exportar a lista de Convênios do ano).');
item('Reunião com o Secretário (exportar tudo que está atrasado).');
item('Documentação para o Tribunal de Contas (exportar Concluídos).');

h2('11.2 Importar de Excel');
paragrafo(
  'A importação de planilha está disponível apenas para Escolas (capítulo 3). É a forma mais rápida de cadastrar centenas de escolas de uma vez.',
);

h2('11.3 Backup JSON');
paragrafo(
  'Já explicado no capítulo 10. Resumindo: Configurações > Baixar backup agora. Recomendamos fazer backup pelo menos uma vez por mês.',
);

// ===== 12. Dicas e FAQ =====
h1('12. Dicas e perguntas frequentes');

h2('12.1 Quem vê o quê?');
paragrafo(
  'O sistema foi feito para uma equipe pequena, então todas as pessoas autenticadas veem e editam todos os registros. Não há níveis de permissão individual (todo mundo é "administrador" para fins de cadastro). O que diferencia um servidor do outro é apenas quem cadastrou — o nome aparece em "Criado por ..." em cada registro.',
);

h2('12.2 Outra pessoa pode ver o que eu faço em tempo real?');
paragrafoHtml(
  'Sim. Todas as telas escutam mudanças no banco de dados. Se a colega está com a lista de escolas aberta e você cadastra uma escola, **a lista dela atualiza em 1-2 segundos** sem precisar recarregar. Mesmo que ela esteja em outra aba, ou com o telemóvel no bolso, vai ver a atualização na próxima vez que abrir.',
);

h2('12.3 Esqueci a senha — o que faço?');
paragrafo(
  'Na tela de login, toque em **Esqueci minha senha**. O sistema envia um email com um link de redefinição. Se não receber, confira a caixa de spam. Se o problema persistir, fale com a equipe técnica.',
);

h2('12.4 Posso usar sem internet?');
paragrafoHtml(
  'Depois de abrir o sistema pela primeira vez com a internet ligada, o app guarda na memória o que você já viu. Você pode **consultar** (ler) sem internet, mas **não consegue cadastrar, editar ou anexar** sem conexão. A conexão volta sozinha quando você entra numa área com Wi-Fi ou 4G.',
);

h2('12.5 O sistema está lento — o que faço?');
paragrafoHtml(
  '**Primeiro**: feche outras abas/apps pesados e recarregue a página (puxar de cima pra baixo, no telemóvel). **Se persistir**: limpe o cache do navegador (Configurações do Chrome > Privacidade > Limpar dados de navegação > selecione "Imagens e arquivos em cache"). **Se mesmo assim continuar**: fale com a equipe técnica com a data e hora do problema.',
);

h2('12.6 Encontrei um erro — como reporto?');
paragrafo('Anote exatamente o que aconteceu:');
item('O que você tentou fazer.');
item('O que aconteceu (mensagem de erro, tela em branco, comportamento estranho).');
item('A hora aproximada.');
item('Qual telemóvel/computador e navegador estava usando.');
paragrafo('Mande essas informações para a equipe técnica. Erros que conseguimos reproduzir são rapidamente corrigidos.');

h2('12.7 Posso acessar por mais de um dispositivo ao mesmo tempo?');
paragrafo(
  'Sim. Pode estar logado no telemóvel e no computador ao mesmo tempo, sem problema. As atualizações aparecem em todos.',
);

h2('12.8 Como sei que está tudo seguro?');
paragrafo(
  'Os dados ficam armazenados no Supabase, serviço de banco de dados usado por milhares de empresas. As senhas são criptografadas. Apenas pessoas com email e senha cadastrados acessam o sistema. Para reforçar a segurança:',
);
item('Use uma senha forte (combinação de letras, números e símbolos, sem palavras óbvias).');
item('Não compartilhe sua senha — se outra pessoa precisar acessar, ela tem o próprio cadastro.');
item('Saia do sistema (Configurações > Sair) ao usar computador compartilhado.');

// ===== Encerramento =====
h1('Pronto(a) para usar');

paragrafoHtml(
  'Você chegou ao fim do manual. Cobrimos: como entrar, instalar, cadastrar escolas e todos os 4 módulos, gerenciar anexos, usar configurações, importar/exportar, e o que fazer quando algo dá errado.',
);
paragrafo(
  'Comece pelos capítulos 1 a 3 (instalar + login + escolas). Depois, vá direto ao módulo que você mais usa no dia-a-dia. As demais seções são consultas rápidas para o futuro.',
);

callout(
  'Dúvidas, sugestões ou problemas? Fale com a equipe técnica. Este manual é vivo — será atualizado conforme o sistema evolui e conforme novas necessidades aparecem.',
  'teal',
);

doc.end();

stream.on('finish', () => {
  // Rodapé foi desabilitado (rodapé em PDFStream exige stream writable,
  // e ao usar doc.end() o rodape retroativo não vê as páginas ainda).
  // O sumário + a paginação implícita bastam.
  console.log(`✓ Manual gerado: ${OUT}`);
  const stats = fs.statSync(OUT);
  console.log(`  Tamanho: ${(stats.size / 1024).toFixed(1)} KB`);
});

stream.on('error', (err) => {
  console.error('Erro ao gerar PDF:', err);
  process.exit(1);
});
