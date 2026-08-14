/**
 * ============================================================================
 * 📝 LS CUSTOMS — SISTEMA DE RECRUTAMENTO & REGISTRO
 * ARQUIVO: recrutamento.js
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

function gerarPainelRecrutamento() {
  const embed = new EmbedBuilder()
    .setColor('#2ECC71')
    .setTitle('📋 RECRUTAMENTO OFICIAL — LS CUSTOMS 🔧')
    .setDescription(
      'Bem-vindo ao canal de recrutamento da **LS Customs**!\n\n' +
      'Procuramos mecânicos dedicados, responsáveis e com boa conduta na cidade.\n\n' +
      '📌 **REQUISITOS:**\n' +
      '• Ter microfone e Discord ativo.\n' +
      '• Conhecer as diretrizes e regras da mecânica.\n' +
      '• Cumprir metas semanais e pontualidade.\n\n' +
      'Clique no botão abaixo para preencher sua ficha de inscrição oficial.'
    )
.setImage('https://i.imgur.com/Vv2juos.jpeg')
    .setFooter({ text: 'LS Customs • Recrutamento' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_rec_abrir_ficha')
      .setLabel('📝 Preencher Ficha de Candidatura')
      .setStyle(ButtonStyle.Success)
  );

  return { embeds: [embed], components: [row] };
}

async function abrirModalRecrutamento(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_rec_ficha')
    .setTitle('Ficha de Candidatura - LS Customs');

  const inputNome = new TextInputBuilder()
    .setCustomId('rec_nome')
    .setLabel('Nome no Personagem (RP)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex:Henrique Souza')
    .setRequired(true);

  const inputId = new TextInputBuilder()
    .setCustomId('rec_passaporte')
    .setLabel('Passaporte / ID na Cidade')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: 793')
    .setRequired(true);

  const inputIdadeDisp = new TextInputBuilder()
    .setCustomId('rec_idade_disp')
    .setLabel('Idade Real & Disponibilidade de Horário')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: 21 anos, Noite/Madrugada (4h diárias)')
    .setRequired(true);

  const inputExp = new TextInputBuilder()
    .setCustomId('rec_exp')
    .setLabel('Experiência Anterior em Mecânicas')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Já atuou como mecânico em outras oficinas?')
    .setRequired(true);

  const inputMotivo = new TextInputBuilder()
    .setCustomId('rec_motivo')
    .setLabel('Por que você deseja entrar na LS Customs?')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Fale sobre sua motivação e compromisso...')
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(inputNome),
    new ActionRowBuilder().addComponents(inputId),
    new ActionRowBuilder().addComponents(inputIdadeDisp),
    new ActionRowBuilder().addComponents(inputExp),
    new ActionRowBuilder().addComponents(inputMotivo)
  );

  await interaction.showModal(modal);
}

async function processarFichaRecrutamento(interaction, client) {
  const nome = interaction.fields.getTextInputValue('rec_nome').trim();
  const passaporte = interaction.fields.getTextInputValue('rec_passaporte').replace('#', '').trim();
  const idadeDisp = interaction.fields.getTextInputValue('rec_idade_disp').trim();
  const exp = interaction.fields.getTextInputValue('rec_exp').trim();
  const motivo = interaction.fields.getTextInputValue('rec_motivo').trim();

  db.candidatos.set(interaction.user.id, {
    userId: interaction.user.id,
    userTag: interaction.user.tag,
    nome,
    passaporte,
    idadeDisp,
    exp,
    motivo,
    dataEnvio: new Date()
  });

  const canalLogs = client.channels.cache.get(configLS.canalLogsRecrutamentoId);
  if (canalLogs) {
    const embedLog = new EmbedBuilder()
      .setColor('#3B82F6')
      .setTitle('📥 NOVA FICHA DE CANDIDATURA RECEBIDA')
      .setDescription(
        `👤 **Candidato:** <@${interaction.user.id}> (${interaction.user.tag})\n` +
        `🆔 **Passaporte:** #${passaporte}\n` +
        `📛 **Nome no RP:** **${nome}**\n` +
        `⏰ **Idade / Turno:** ${idadeDisp}\n\n` +
        `🛠️ **Experiência Prévia:**\n${exp}\n\n` +
        `💡 **Motivação:**\n${motivo}`
      )
      .setFooter({ text: 'LS Customs • Avaliação de Staff' })
      .setTimestamp();

    const rowAcao = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`btn_rec_aprovar_${interaction.user.id}`)
        .setLabel('✅ Aprovar Candidato')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`btn_rec_recusar_${interaction.user.id}`)
        .setLabel('❌ Recusar Candidato')
        .setStyle(ButtonStyle.Danger)
    );

    await canalLogs.send({ embeds: [embedLog], components: [rowAcao] });
  }

  await interaction.reply({
    content: `✅ **Ficha enviada com sucesso, ${nome}!** A liderança da LS Customs analisará seu formulário. Fique atento às suas notificações.`,
    ephemeral: true
  });
}

async function tratarInteracaoRecrutamento(interaction, client) {
  if (interaction.isButton()) {
    if (interaction.customId === 'btn_rec_abrir_ficha') {
      return await abrirModalRecrutamento(interaction);
    }

    if (interaction.customId.startsWith('btn_rec_aprovar_')) {
      const targetId = interaction.customId.replace('btn_rec_aprovar_', '');
      const cand = db.candidatos.get(targetId);
      const apelido = cand ? `|R| ${cand.nome} | ${cand.passaporte}` : null;

      try {
        const guild = interaction.guild;
        const member = await guild.members.fetch(targetId).catch(() => null);
        if (member && apelido) {
          await member.setNickname(apelido).catch(() => null);
        }
      } catch (e) {}

      await interaction.reply({
        content: `✅ Candidato <@${targetId}> foi **APROVADO** por <@${interaction.user.id}>! Apelido formatado: \`${apelido || '|R| Recruta'}\`.`,
      });
      return;
    }

    if (interaction.customId.startsWith('btn_rec_recusar_')) {
      const targetId = interaction.customId.replace('btn_rec_recusar_', '');
      await interaction.reply({
        content: `❌ Candidato <@${targetId}> foi **RECUSADO** por <@${interaction.user.id}>.`,
      });
      return;
    }
  }

  if (interaction.isModalSubmit() && interaction.customId === 'modal_rec_ficha') {
    return await processarFichaRecrutamento(interaction, client);
  }
}

module.exports = {
  gerarPainelRecrutamento,
  tratarInteracaoRecrutamento
};
