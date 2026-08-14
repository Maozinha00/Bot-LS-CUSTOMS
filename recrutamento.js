/**
 * ============================================================================
 * 📝 LS CUSTOMS — RECRUTAMENTO & REGISTRO
 * ARQUIVO: recrutamento.js
 * ============================================================================
 */
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { db, configLS } = require('./database');

function gerarPainelRecrutamento() {
  const embed = new EmbedBuilder()
    .setColor('#2ECC71')
    .setTitle('📋 RECRUTAMENTO OFICIAL — LS CUSTOMS 🔧')
    .setDescription('Clique abaixo para preencher sua ficha de candidatura para a oficina.')
    .setImage(configLS.bannerUrl);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_rec_abrir_ficha').setLabel('📝 Preencher Ficha').setStyle(ButtonStyle.Success)
  );
  return { embeds: [embed], components: [row] };
}

module.exports = { gerarPainelRecrutamento, tratarInteracaoRecrutamento };