/**
 * ============================================================================
 * ⚠️ LS CUSTOMS — SISTEMA DE ADVERTÊNCIAS DISCIPLINARES & CARGOS
 * ARQUIVO: advertencias.js
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
const { db, configLS } = require('./database');

function gerarPainelAdvertencia() {
  const embed = new EmbedBuilder()
    .setColor('#EF4444')
    .setTitle('⚖️ PAINEL DE DISCIPLINA & ADVERTÊNCIAS — LS CUSTOMS 🔧')
    .setDescription(
      'Painel de controle disciplinar restrito à Liderança e Recursos Humanos.\n\n' +
      '📋 **GRADUAÇÃO DE PENALIDADES:**\n' +
      '🟡 **1ª ADV:** Verbal / Leve (Orientação formal)\n' +
      '🟠 **2ª ADV:** Média (Perda de bonificação / Suspensão temporária)\n' +
      '🔴 **3ª ADV:** Grave — **EXONERAÇÃO / DEMISSÃO IMEDIATA** 🛑\n\n' +
      'Clique nos botões abaixo para emitir uma advertência ou consultar o histórico de um membro.'
    )
    .setImage(configLS.bannerUrl)
    .setFooter({ text: 'LS Customs • Corregedoria e Disciplina' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_adv_aplicar')
      .setLabel('⚠️ Aplicar Advertência')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('btn_adv_consultar')
      .setLabel('🔎 Consultar Histórico')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}

async function abrirModalAplicarAdv(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_adv_aplicar')
    .setTitle('Aplicação de Advertência Disciplinar');

  const inputMembro = new TextInputBuilder()
    .setCustomId('adv_membro')
    .setLabel('Mencione o Membro (@usuário) ou ID / RG')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: @Henrique ou 1234567890')
    .setRequired(true);

  const inputGravidade = new TextInputBuilder()
    .setCustomId('adv_gravidade')
    .setLabel('Tipo: 1 (Leve), 2 (Média) ou 3 (Grave)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Digite: 1, 2 ou 3')
    .setRequired(true);

  const inputMotivo = new TextInputBuilder()
    .setCustomId('adv_motivo')
    .setLabel('Motivo Detalhado & Provas/Regra Infringida')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Descreva o ocorrido de forma clara...')
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(inputMembro),
    new ActionRowBuilder().addComponents(inputGravidade),
    new ActionRowBuilder().addComponents(inputMotivo)
  );

  await interaction.showModal(modal);
}

async function abrirModalConsultarAdv(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_adv_consultar')
    .setTitle('Consultar Histórico Disciplinar');

  const inputMembro = new TextInputBuilder()
    .setCustomId('adv_cons_membro')
    .setLabel('Mencione o Membro ou ID / RG')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: @Henrique ou ID')
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(inputMembro));
  await interaction.showModal(modal);
}

async function processarAplicacaoAdv(interaction, client) {
  const rawMembro = interaction.fields.getTextInputValue('adv_membro').replace(/[<@!#>]/g, '').trim();
  const rawGravidade = interaction.fields.getTextInputValue('adv_gravidade').trim();
  const motivo = interaction.fields.getTextInputValue('adv_motivo').trim();

  const guild = interaction.guild;
  let targetMember = null;
  if (guild) {
    targetMember = await guild.members.fetch(rawMembro).catch(() => null);
  }

  const userId = targetMember ? targetMember.id : rawMembro;
  const userTag = targetMember ? targetMember.user.tag : rawMembro;

  let registro = db.advertencias.get(userId) || { count: 0, historico: [] };
  registro.count += 1;

  let gravidadeTxt = '1ª Advertência (Leve)';
  let cargoToAddId = configLS.cargoAdvVerbalLeveId;

  if (rawGravidade === '2' || registro.count === 2) {
    gravidadeTxt = '2ª Advertência (Média)';
    cargoToAddId = configLS.cargoAdvMediaId;
  } else if (rawGravidade === '3' || registro.count >= 3) {
    gravidadeTxt = '3ª Advertência (Grave - EXONERAÇÃO)';
    cargoToAddId = configLS.cargoAdvGraveId;
  }

  registro.historico.push({
    gravidade: gravidadeTxt,
    motivo,
    autor: interaction.user.tag,
    data: new Date()
  });

  db.advertencias.set(userId, registro);

  // Aplicação de Cargo no Discord se membro existir
  if (targetMember && cargoToAddId) {
    try {
      await targetMember.roles.add(cargoToAddId).catch(() => null);
    } catch (e) {}
  }

  const embedLog = new EmbedBuilder()
    .setColor('#EF4444')
    .setTitle('⚠️ ADVERTÊNCIA DISCIPLINAR APLICADA')
    .setDescription(
      `👤 **Membro Penalizado:** <@${userId}> (${userTag})\n` +
      `⚖️ **Grau:** **${gravidadeTxt}**\n` +
      `📊 **Total de Advertências:** \`${registro.count}/3\`\n\n` +
      `📝 **Motivo:**\n${motivo}\n\n` +
      `👮 **Aplicado por:** <@${interaction.user.id}>\n` +
      (registro.count >= 3 ? '\n🚨 **ATENÇÃO:** O membro atingiu 3 advertências e deve ser exonerado do quadro!' : '')
    )
    .setTimestamp();

  const canalLogs = client.channels.cache.get(configLS.canalLogsAdvId);
  if (canalLogs) await canalLogs.send({ embeds: [embedLog] }).catch(() => null);

  await interaction.reply({
    content: `✅ Advertência registrada para <@${userId}> com sucesso (${registro.count}/3)!\nGrau: **${gravidadeTxt}**.`,
    ephemeral: true
  });
}

async function processarConsultaAdv(interaction) {
  const rawMembro = interaction.fields.getTextInputValue('adv_cons_membro').replace(/[<@!#>]/g, '').trim();
  const registro = db.advertencias.get(rawMembro);

  if (!registro || registro.historico.length === 0) {
    return interaction.reply({
      content: `✅ O membro \`${rawMembro}\` possui ficha limpa na LS Customs (0 advertências).`,
      ephemeral: true
    });
  }

  let desc = `📊 **HISTÓRICO DISCIPLINAR:** \`${registro.count}/3 Advertências\`\n\n`;
  registro.historico.forEach((adv, i) => {
    desc += `**${i + 1}.** ${adv.gravidade} — Aplicado por: ${adv.autor}\n` +
            `📝 Motivo: ${adv.motivo}\n` +
            `📅 Data: ${adv.data.toLocaleDateString('pt-BR')}\n\n`;
  });

  const embed = new EmbedBuilder()
    .setColor('#EF4444')
    .setTitle(`⚖️ FICHA DISCIPLINAR — ${rawMembro}`)
    .setDescription(desc);

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function tratarInteracaoAdvertencia(interaction, client) {
  if (interaction.isButton()) {
    if (interaction.customId === 'btn_adv_aplicar') return await abrirModalAplicarAdv(interaction);
    if (interaction.customId === 'btn_adv_consultar') return await abrirModalConsultarAdv(interaction);
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'modal_adv_aplicar') return await processarAplicacaoAdv(interaction, client);
    if (interaction.customId === 'modal_adv_consultar') return await processarConsultaAdv(interaction);
  }
}

module.exports = {
  gerarPainelAdvertencia,
  tratarInteracaoAdvertencia
};