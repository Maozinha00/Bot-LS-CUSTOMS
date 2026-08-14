/**
 * ============================================================================
 * 🏁 LS CUSTOMS — SISTEMA COMPLETO DE EVENTOS AUTOMOTIVOS
 * ARQUIVO: eventos.js | CANAL: 1537925623979319297
 * ============================================================================
 */
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { db, configLS } = require('./database');

// Gera o Embed em tempo real do canal
function gerarEmbedPainelEvento() {
  const totalInscritos = db.inscritosEvento.size;
  let totalPagos = 0, arrecadado = 0;
  for (const item of db.inscritosEvento.values()) {
    if (item.pago) { totalPagos++; arrecadado += 10000; }
  }

  return new EmbedBuilder()
    .setColor('#2ECC71')
    .setTitle('🏁🔥 EVENTO AUTOMOTIVO — LS CUSTOMS 🔧')
    .setDescription(
      '🚗 **PREPARE SEU MELHOR PROJETO!** 💨\n\n' +
      '🎟️ **INSCRIÇÃO DO VEÍCULO:** `R$ 10.000`\n\n' +
      '🏆 **PREMIAÇÃO OFICIAL (R$ 100.000 em Prêmios):**\n' +
      '🥇 **1º Lugar:** 💰 `R$ 50.000`\n' +
      '🥈 **2º Lugar:** 💰 `R$ 30.000`\n' +
      '🥉 **3º Lugar:** 💰 `R$ 20.000`\n\n' +
      '📊 **STATUS EM TEMPO REAL:**\n' +
      `👥 **Inscritos:** \`${totalInscritos}\` | 🟢 **Pagos:** \`${totalPagos}/${totalInscritos}\`\n` +
      `💰 **Arrecadação:** \`R$ ${arrecadado.toLocaleString('pt-BR')}\``
    )
    .setImage(configLS.bannerUrl)
    .setFooter({ text: `Canal #${configLS.canalEventoId} • Atualização Automática` });
}

// Botões interativos do painel
function gerarBotoesPainelEvento() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_ev_inscrever').setLabel('🏎️ Inscrever Veículo (R$ 10k)').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('btn_ev_consultar').setLabel('🔎 Minha Inscrição').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('btn_ev_lista').setLabel('📋 Lista de Participantes').setStyle(ButtonStyle.Secondary)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_ev_confirmar_pagamento').setLabel('✅ Confirmar Pagamento (Staff)').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('btn_ev_podio').setLabel('🏆 Ver Pódio').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('btn_ev_arrecadado').setLabel('📊 Arrecadação').setStyle(ButtonStyle.Secondary)
  );
  return [row1, row2];
}

// Atualização automática da mensagem fixa no canal 1537925623979319297
async function atualizarPainelNoCanal(client) {
  const canal = client.channels.cache.get(configLS.canalEventoId);
  if (!canal) return;
  const embed = gerarEmbedPainelEvento();
  const rows = gerarBotoesPainelEvento();
  if (db.eventoConfig.painelMessageId) {
    try {
      const msg = await canal.messages.fetch(db.eventoConfig.painelMessageId);
      if (msg) return await msg.edit({ embeds: [embed], components: rows });
    } catch (e) {}
  }
  const novaMsg = await canal.send({ embeds: [embed], components: rows });
  db.eventoConfig.painelMessageId = novaMsg.id;
}

module.exports = {
  gerarEmbedPainelEvento,
  gerarBotoesPainelEvento,
  atualizarPainelNoCanal,
  tratarInteracaoEvento
};