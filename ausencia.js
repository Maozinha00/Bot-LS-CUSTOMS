/**
 * ============================================================================
 * 🌴 LS CUSTOMS — GESTÃO DE AUSÊNCIAS (MÁX 5 DIAS)
 * ARQUIVO: ausencia.js
 * ============================================================================
 */
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { db, configLS, parseDataBrasileira } = require('./database');

function gerarPainelAusencia() {
  const embed = new EmbedBuilder()
    .setColor('#E67E22')
    .setTitle('🌴 SOLICITAÇÃO DE AUSÊNCIA — LS CUSTOMS 🔧')
    .setDescription('⚠️ **Limite Máximo: 5 DIAS corridos.** Solicitou mais? Requer autorização da diretoria.');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_aus_solicitar').setLabel('🌴 Solicitar Ausência').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('btn_aus_retornar').setLabel('🏠 Registrar Retorno').setStyle(ButtonStyle.Success)
  );
  return { embeds: [embed], components: [row] };
}

module.exports = { gerarPainelAusencia, tratarInteracaoAusencia };