/**
 * ============================================================================
 * ⏱️ LS CUSTOMS — BATE-PONTO ELETRÔNICO
 * ARQUIVO: ponto.js
 * ============================================================================
 */
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { db, configLS } = require('./database');

function gerarPainelPonto() {
  const embed = new EmbedBuilder()
    .setColor('#3B82F6')
    .setTitle('⏱️ BATE-PONTO ELETRÔNICO — LS CUSTOMS 🔧')
    .setDescription(`Mantenha seu turno registrado.\n\n📻 **Rádio Oficial:** \`${configLS.radioFreq}\` MHz`);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_ponto_entrar').setLabel('🟢 Entrar em Serviço').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('btn_ponto_sair').setLabel('🔴 Sair de Serviço').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('btn_ponto_status').setLabel('📋 Meu Status').setStyle(ButtonStyle.Secondary)
  );
  return { embeds: [embed], components: [row] };
}

module.exports = { gerarPainelPonto, tratarInteracaoPonto };