/**
 * ============================================================================
 * 🗄️ LS CUSTOMS — DATABASE CENTRAL & CONFIGURAÇÕES
 * ARQUIVO: database.js
 * ============================================================================
 */
const configLS = {
  canalEventoId: process.env.CANAL_EVENTO_ID || '1537925623979319297',
  canalAdvId: process.env.CANAL_ADV_ID || '1536304172952191049',
  canalLogsAdvId: process.env.CANAL_LOGS_ADV_ID || '1536333810629607514',
  cargoAdvVerbalLeveId: '1536526429897097246',
  cargoAdvMediaId: '1536304134746275861',
  cargoAdvGraveId: '1536304135517773834',
  canalPainelAusenciaId: '1537852669853438032',
  canalLogsAusenciaId: '1537852751726510181',
  canalPontoId: '1536309622699466772',
  radioFreq: '633',
  taxaInscricaoEvento: 10000,
  bannerUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80'
};

const db = {
  eventoConfig: { painelMessageId: null, local: 'LS Customs', horario: '20:30h' },
  inscritosEvento: new Map(),
  podioEvento: { primeiro: null, segundo: null, terceiro: null },
  advertencias: new Map(),
  ausencias: new Map(),
  pontos: new Map(),
  candidatos: new Map()
};

module.exports = { db, configLS };