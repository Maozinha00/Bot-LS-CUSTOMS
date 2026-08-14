/**
 * ============================================================================
 * 🌴 LS CUSTOMS — SISTEMA DE GESTÃO DE AUSÊNCIAS (MÁX 5 DIAS)
 * ARQUIVO: ausencia.js
 * ============================================================================
 */

const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle 
} = require('discord.js');
const { db, configLS, parseDataBrasileira } = require('./database');

function gerarPainelAusencia() {
  const embed = new EmbedBuilder()
    .setColor('#E67E22')
    .setTitle('🌴 SOLICITAÇÃO DE AUSÊNCIA — LS CUSTOMS 🔧')
    .setDescription(
      'Precisa se ausentar da cidade por motivos pessoais ou de viagem?\n\n' +
      '⚠️ **REGRAS E LIMITES:**\n' +
      '• O período máximo permitido por solicitação é de **5 DIAS**.\n' +
      '• Solicitações com mais de 5 dias requerem autorização especial da Diretoria.\n' +
      '• Não retornar na data limite estipulada acarretará em **Advertência Disciplinar** e possível exoneração.\n\n' +
      'Clique no botão abaixo para abrir seu formulário de ausência.'
    )
    .setImage(configLS.bannerUrl)
    .setFooter({ text: 'LS Customs • Gestão de Ausências' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_aus_solicitar')
      .setLabel('🌴 Solicitar Ausência (Máx: 5 Dias)')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('btn_aus_retornar')
      .setLabel('🏠 Registrar Retorno Antecipado')
      .setStyle(ButtonStyle.Success)
  );

  return { embeds: [embed], components: [row] };
}

async function abrirModalAusencia(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_aus_solicitar')
    .setTitle('Solicitação de Ausência - LS Customs');

  const inputInicio = new TextInputBuilder()
    .setCustomId('aus_inicio')
    .setLabel('Data de Início (DD/MM/AAAA)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: 15/08/2026')
    .setRequired(true);

  const inputRetorno = new TextInputBuilder()
    .setCustomId('aus_retorno')
    .setLabel('Data de Retorno Previsto (DD/MM/AAAA)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: 19/08/2026 (Máx 5 dias)')
    .setRequired(true);

  const inputMotivo = new TextInputBuilder()
    .setCustomId('aus_motivo')
    .setLabel('Motivo da Ausência')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Explique brevemente o motivo...')
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(inputInicio),
    new ActionRowBuilder().addComponents(inputRetorno),
    new ActionRowBuilder().addComponents(inputMotivo)
  );

  await interaction.showModal(modal);
}

async function processarSolicitacaoAusencia(interaction, client) {
  const strInicio = interaction.fields.getTextInputValue('aus_inicio').trim();
  const strRetorno = interaction.fields.getTextInputValue('aus_retorno').trim();
  const motivo = interaction.fields.getTextInputValue('aus_motivo').trim();

  const dInicio = parseDataBrasileira(strInicio) || new Date();
  const dRetorno = parseDataBrasileira(strRetorno);

  if (!dRetorno) {
    return interaction.reply({
      content: '❌ Formato de data de retorno inválido. Utilize o padrão **DD/MM/AAAA** (Ex: 18/08/2026).',
      ephemeral: true
    });
  }

  const diffTime = dRetorno.getTime() - dInicio.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return interaction.reply({
      content: '❌ A data de retorno deve ser posterior à data de início.',
      ephemeral: true
    });
  }

  if (diffDays > 5) {
    return interaction.reply({
      content: `❌ **Limite Excedido!** O prazo máximo de ausência é de **5 dias**. Sua solicitação foi de **${diffDays} dias**. Fale com a gerência se precisar de mais tempo.`,
      ephemeral: true
    });
  }

  db.ausencias.set(interaction.user.id, {
    userId: interaction.user.id,
    userTag: interaction.user.tag,
    inicioStr: strInicio,
    retornoStr: strRetorno,
    dias: diffDays,
    motivo,
    dataEnvio: new Date(),
    status: 'ativa'
  });

  const canalLogs = client.channels.cache.get(configLS.canalLogsAusenciaId);
  if (canalLogs) {
    const logEmbed = new EmbedBuilder()
      .setColor('#E67E22')
      .setTitle('🌴 REGISTRO OFICIAL DE AUSÊNCIA')
      .setDescription(
        `👤 **Mecânico:** <@${interaction.user.id}>\n` +
        `📅 **Período:** \`${strInicio}\` até \`${strRetorno}\` (**${diffDays} dias**)\n` +
        `📝 **Motivo:** ${motivo}\n\n` +
        `⏰ **Data Limite de Retorno:** ${dRetorno.toLocaleDateString('pt-BR')}`
      )
      .setTimestamp();

    await canalLogs.send({ embeds: [logEmbed] }).catch(() => null);
  }

  await interaction.reply({
    content: `✅ **Ausência de ${diffDays} dias registrada com sucesso!** Retorno previsto para **${strRetorno}**. Tenha um bom descanso!`,
    ephemeral: true
  });
}

async function tratarInteracaoAusencia(interaction, client) {
  if (interaction.isButton()) {
    if (interaction.customId === 'btn_aus_solicitar') {
      return await abrirModalAusencia(interaction);
    }
    if (interaction.customId === 'btn_aus_retornar') {
      const registro = db.ausencias.get(interaction.user.id);
      if (!registro || registro.status !== 'ativa') {
        return interaction.reply({ content: 'ℹ️ Você não possui nenhuma ausência ativa no sistema.', ephemeral: true });
      }
      registro.status = 'finalizada';
      return interaction.reply({ content: '🏠 **Retorno registrado com sucesso!** Bem-vindo de volta à LS Customs.', ephemeral: true });
    }
  }

  if (interaction.isModalSubmit() && interaction.customId === 'modal_aus_solicitar') {
    return await processarSolicitacaoAusencia(interaction, client);
  }
}

module.exports = {
  gerarPainelAusencia,
  tratarInteracaoAusencia
};