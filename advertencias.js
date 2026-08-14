/**
 * ============================================================================
 * ⚠️ LS CUSTOMS — ADVERTÊNCIAS DISCIPLINARES & CARGOS
 * ARQUIVO: advertencias.js
 * ============================================================================
 */
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { db, configLS } = require('./database');

function gerarPainelAdvertencia() {
  const embed = new EmbedBuilder()
    .setColor('#EF4444')
    .setTitle('⚖️ PAINEL DE DISCIPLINA — LS CUSTOMS 🔧')
    .setDescription('🟡 **1ª ADV:** Verbal/Leve\n🟠 **2ª ADV:** Média\n🔴 **3ª ADV:** Grave — **EXONERAÇÃO IMEDIATA**');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_adv_aplicar').setLabel('⚠️ Aplicar ADV').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('btn_adv_consultar').setLabel('🔎 Consultar Histórico').setStyle(ButtonStyle.Secondary)
  );
  return { embeds: [embed], components: [row] };
}

module.exports = { gerarPainelAdvertencia, tratarInteracaoAdvertencia };