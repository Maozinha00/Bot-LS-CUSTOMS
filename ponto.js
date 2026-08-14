/**
 * ============================================================================
 * ⏱️ LS CUSTOMS — SISTEMA DE BATE-PONTO ELETRÔNICO
 * ARQUIVO: ponto.js
 * ============================================================================
 */

const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');
const { db, configLS } = require('./database');

function gerarPainelPonto() {
  const embed = new EmbedBuilder()
    .setColor('#3B82F6')
    .setTitle('⏱️ BATE-PONTO ELETRÔNICO — LS CUSTOMS 🔧')
    .setDescription(
      'Mantenha seu turno registrado corretamente para computar suas horas de serviço e bonificações.\n\n' +
      '🟢 **ENTRADA DE SERVIÇO:** Inicie seu turno na oficina.\n' +
      '🔴 **SAÍDA DE SERVIÇO:** Finalize seu turno e calcule o tempo trabalhado.\n\n' +
      `📻 **Frequência de Rádio Obrigatória:** \`${configLS.radioFreq}\` MHz`
    )
    .setImage(configLS.bannerUrl)
    .setFooter({ text: 'LS Customs • Controle de Ponto' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_ponto_entrar')
      .setLabel('🟢 Entrar em Serviço')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('btn_ponto_sair')
      .setLabel('🔴 Sair de Serviço')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('btn_ponto_status')
      .setLabel('📋 Meu Status Atual')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}

async function tratarInteracaoPonto(interaction, client) {
  if (!interaction.isButton()) return;
  const uid = interaction.user.id;
  const registro = db.pontos.get(uid) || { isWorking: false, startTime: null, historico: [] };

  if (interaction.customId === 'btn_ponto_entrar') {
    if (registro.isWorking) {
      return interaction.reply({
        content: `⚠️ Você já está em serviço desde as **${new Date(registro.startTime).toLocaleTimeString('pt-BR')}**!`,
        ephemeral: true
      });
    }

    const agora = new Date();
    registro.isWorking = true;
    registro.startTime = agora;
    db.pontos.set(uid, registro);

    const embed = new EmbedBuilder()
      .setColor('#2ECC71')
      .setTitle('🟢 ENTRADA EM SERVIÇO CONFIRMADA')
      .setDescription(`Mecânico: <@${uid}>\nHorário: **${agora.toLocaleTimeString('pt-BR')}**\nData: **${agora.toLocaleDateString('pt-BR')}**\nRádio: \`${configLS.radioFreq}\``)
      .setTimestamp();

    const canalPonto = client.channels.cache.get(configLS.canalPontoId);
    if (canalPonto) await canalPonto.send({ embeds: [embed] }).catch(() => null);

    return interaction.reply({ content: `✅ **Bom trabalho!** Você entrou em serviço às ${agora.toLocaleTimeString('pt-BR')}.`, ephemeral: true });
  }

  if (interaction.customId === 'btn_ponto_sair') {
    if (!registro.isWorking || !registro.startTime) {
      return interaction.reply({
        content: '⚠️ Você não está com ponto aberto no momento. Clique em "🟢 Entrar em Serviço".',
        ephemeral: true
      });
    }

    const saida = new Date();
    const entrada = new Date(registro.startTime);
    const diffMs = saida - entrada;
    const diffMins = Math.floor(diffMs / 60000);
    const horas = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    const duracaoStr = `${horas}h ${mins}min`;

    registro.isWorking = false;
    registro.startTime = null;
    registro.historico.push({ entrada, saida, duracaoStr });
    db.pontos.set(uid, registro);

    const embed = new EmbedBuilder()
      .setColor('#EF4444')
      .setTitle('🔴 SAÍDA DE SERVIÇO CONFIRMADA')
      .setDescription(
        `Mecânico: <@${uid}>\n` +
        `Entrada: **${entrada.toLocaleTimeString('pt-BR')}**\n` +
        `Saída: **${saida.toLocaleTimeString('pt-BR')}**\n` +
        `⏱️ **Tempo Total de Turno:** \`${duracaoStr}\``
      )
      .setTimestamp();

    const canalPonto = client.channels.cache.get(configLS.canalPontoId);
    if (canalPonto) await canalPonto.send({ embeds: [embed] }).catch(() => null);

    return interaction.reply({ content: `🏁 **Turno finalizado com sucesso!** Duração: \`${duracaoStr}\`.`, ephemeral: true });
  }

  if (interaction.customId === 'btn_ponto_status') {
    if (registro.isWorking) {
      const entrada = new Date(registro.startTime);
      return interaction.reply({
        content: `🟢 Você está **EM SERVIÇO** desde as **${entrada.toLocaleTimeString('pt-BR')}** (${entrada.toLocaleDateString('pt-BR')}).`,
        ephemeral: true
      });
    } else {
      return interaction.reply({
        content: '⚪ Você está atualmente **FORA DE SERVIÇO**.',
        ephemeral: true
      });
    }
  }
}

module.exports = {
  gerarPainelPonto,
  tratarInteracaoPonto
};