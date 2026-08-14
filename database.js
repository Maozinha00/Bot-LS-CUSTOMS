/**
 * ============================================================================
 * 🗄️ LS CUSTOMS — DATABASE CENTRAL & ESTADOS EM MEMÓRIA
 * ARQUIVO: database.js
 * ============================================================================
 */

// 1. Configurações Globais dos Canais e Cargos da LS Customs
const configLS = {
  // 🏁 Canal do Evento Automotivo
  canalEventoId: process.env.CANAL_EVENTO_ID || '1537925623979319297',

  // ⚠️ Canais e Cargos Disciplinares (ADVs)
  canalAdvId: process.env.CANAL_ADV_ID || '1536304172952191049',
  canalLogsAdvId: process.env.CANAL_LOGS_ADV_ID || '1536333810629607514',
  cargoAdvVerbalLeveId: process.env.CARGO_ADV_VERBAL_LEVE_ID || '1536526429897097246',
  cargoAdvMediaId: process.env.CARGO_ADV_MEDIA_ID || '1536304134746275861',
  cargoAdvGraveId: process.env.CARGO_ADV_GRAVE_ID || '1536304135517773834',

  // 🌴 Canais de Ausência
  canalPainelAusenciaId: process.env.CANAL_PAINEL_AUSENCIA_ID || '1537852669853438032',
  canalLogsAusenciaId: process.env.CANAL_LOGS_AUSENCIA_ID || '1537852751726510181',

  // 🛠️ Recrutamento, Ponto e Demissão
  canalLogsEntradaSaidaId: process.env.JOIN_LOGS_CHANNEL_ID || '1536304188105949244',
  canalLogsRecrutamentoId: process.env.LOGS_CHANNEL_ID || '1536308230936993792',
  canalPontoId: process.env.PONTO_CHANNEL_ID || '1536309622699466772',
  canalDemissaoId: process.env.DEMISSAO_CHANNEL_ID || '1536304188609400955',

  // 📻 Geral
  radioFreq: process.env.RADIO_FREQ || '633',
  taxaInscricaoEvento: 10000,
  premios: {
    primeiro: 50000,
    segundo: 30000,
    terceiro: 20000,
    total: 100000
  },
  bannerUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
  rodape: 'LS CUSTOMS • Sistema Modular Oficial • 2026'
};

// 2. Bancos de Dados em Memória
const db = {
  // 🏁 Eventos
  eventoConfig: {
    titulo: 'EVENTO AUTOMOTIVO — LS CUSTOMS',
    subtitulo: 'PREPARE SEU MELHOR PROJETO!',
    local: 'LS Customs',
    data: 'A Definir',
    horario: '20:30h',
    canalId: '1537925623979319297',
    painelMessageId: null,
    status: 'aberto' // 'aberto' | 'em_andamento' | 'finalizado'
  },
  inscritosEvento: new Map(), // userId -> { userId, nome, passaporte, veiculo, categoria, placa, custom, pago, valorPago, dataInscricao, dataPagamento, notas: { c, p, o, pres }, media: 0 }
  podioEvento: {
    primeiro: null,
    segundo: null,
    terceiro: null
  },

  // ⚠️ Advertências
  advertencias: new Map(), // userId ou RG -> { count, historico: [] }

  // 🌴 Ausências
  ausencias: new Map(), // userId -> { memberTag, startDate, returnDate, dias, reason, status, advAplicada }

  // ⏱️ Ponto
  pontos: new Map(), // userId -> { lastPontoTime, startTime, isWorking, historico: [] }

  // ⚙️ Recrutamento
  candidatos: new Map() // userId -> { nome, passaporte, idadeDisp, experiencia, motivoRegras, dataEnvio }
};

// 3. Funções Utilitárias de Banco de Dados
function getDatabase() {
  return db;
}

function getConfig() {
  return configLS;
}

function parseDataBrasileira(str) {
  if (!str) return null;
  const parts = str.trim().split(/[/ -]/);
  if (parts.length >= 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    let y = parseInt(parts[2], 10);
    if (y < 100) y += 2000;
    if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
    return new Date(y, m, d, 23, 59, 59);
  }
  return null;
}

module.exports = {
  db,
  configLS,
  getDatabase,
  getConfig,
  parseDataBrasileira
};