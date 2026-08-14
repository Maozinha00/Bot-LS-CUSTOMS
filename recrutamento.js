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

/**
 * ============================================================================
 * ⚙️ CONFIGURAÇÕES DO RECRUTAMENTO
 * ============================================================================
 */

const CARGOS_RECRUTAMENTO = [
  '1536304132980473896',
  '1537151042888671365'
];

/**
 * ============================================================================
 * 📋 PAINEL DE RECRUTAMENTO
 * ============================================================================
 */

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
    .setFooter({
      text: 'LS Customs • Recrutamento'
    });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_rec_abrir_ficha')
      .setLabel('📝 Preencher Ficha de Candidatura')
      .setStyle(ButtonStyle.Success)
  );

  return {
    embeds: [embed],
    components: [row]
  };
}

/**
 * ============================================================================
 * 📝 ABRIR MODAL DE RECRUTAMENTO
 * ============================================================================
 */

async function abrirModalRecrutamento(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_rec_ficha')
    .setTitle('Ficha de Candidatura - LS Customs');

  const inputNome = new TextInputBuilder()
    .setCustomId('rec_nome')
    .setLabel('Nome no Personagem (RP)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: Henrique Souza')
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

/**
 * ============================================================================
 * 📥 PROCESSAR FICHA
 * ============================================================================
 */

async function processarFichaRecrutamento(interaction, client) {
  const nome = interaction.fields
    .getTextInputValue('rec_nome')
    .trim();

  const passaporte = interaction.fields
    .getTextInputValue('rec_passaporte')
    .replace('#', '')
    .trim();

  const idadeDisp = interaction.fields
    .getTextInputValue('rec_idade_disp')
    .trim();

  const exp = interaction.fields
    .getTextInputValue('rec_exp')
    .trim();

  const motivo = interaction.fields
    .getTextInputValue('rec_motivo')
    .trim();

  /**
   * ==========================================================================
   * 💾 SALVAR CANDIDATO
   * ==========================================================================
   */

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

  /**
   * ==========================================================================
   * 📢 ENVIAR PARA CANAL DE LOGS
   * ==========================================================================
   */

  const canalLogs = client.channels.cache.get(
    configLS.canalLogsRecrutamentoId
  );

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
      .setFooter({
        text: 'LS Customs • Avaliação de Staff'
      })
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

    await canalLogs.send({
      embeds: [embedLog],
      components: [rowAcao]
    });
  }

  /**
   * ==========================================================================
   * ✅ RESPOSTA AO CANDIDATO
   * ==========================================================================
   */

  await interaction.reply({
    content:
      `✅ **Ficha enviada com sucesso, ${nome}!**\n\n` +
      `A liderança da LS Customs analisará seu formulário.\n` +
      `Fique atento às suas notificações.`,
    ephemeral: true
  });
}

/**
 * ============================================================================
 * 🎯 TRATAR INTERAÇÕES
 * ============================================================================
 */

async function tratarInteracaoRecrutamento(interaction, client) {

  /**
   * ==========================================================================
   * 🔘 BOTÕES
   * ==========================================================================
   */

  if (interaction.isButton()) {

    /**
     * ------------------------------------------------------------------------
     * 📝 ABRIR FICHA
     * ------------------------------------------------------------------------
     */

    if (interaction.customId === 'btn_rec_abrir_ficha') {
      return await abrirModalRecrutamento(interaction);
    }

    /**
     * ------------------------------------------------------------------------
     * ✅ APROVAR CANDIDATO
     * ------------------------------------------------------------------------
     */

    if (interaction.customId.startsWith('btn_rec_aprovar_')) {

      const targetId = interaction.customId.replace(
        'btn_rec_aprovar_',
        ''
      );

      const cand = db.candidatos.get(targetId);

      const apelido = cand
        ? `|R| ${cand.nome} | ${cand.passaporte}`
        : '|R| Recruta';

      try {

        const guild = interaction.guild;

        const member = await guild.members
          .fetch(targetId)
          .catch(() => null);

        if (!member) {

          return await interaction.reply({
            content:
              `❌ Não consegui encontrar o candidato <@${targetId}> no servidor.`,
            ephemeral: true
          });

        }

        /**
         * --------------------------------------------------------------------
         * 🏷️ ALTERAR APELIDO
         * --------------------------------------------------------------------
         */

        try {

          await member.setNickname(apelido);

        } catch (erroNickname) {

          console.error(
            '❌ Erro ao alterar apelido:',
            erroNickname
          );

        }

        /**
         * --------------------------------------------------------------------
         * 🎖️ ADICIONAR CARGOS
         * --------------------------------------------------------------------
         */

        try {

          await member.roles.add(CARGOS_RECRUTAMENTO);

          console.log(
            `✅ Cargos adicionados para ${member.user.tag}`
          );

        } catch (erroCargo) {

          console.error(
            '❌ Erro ao adicionar cargos:',
            erroCargo
          );

          return await interaction.reply({
            content:
              `⚠️ Candidato <@${targetId}> foi aprovado, ` +
              `mas **não consegui adicionar os cargos**.\n\n` +
              `Verifique se o cargo do bot está acima dos cargos de recrutamento ` +
              `e se ele possui a permissão **Gerenciar Cargos**.\n\n` +
              `🎖️ Cargos configurados:\n` +
              `<@&1536304132980473896>\n` +
              `<@&1537151042888671365>`,
            ephemeral: true
          });

        }

        /**
         * --------------------------------------------------------------------
         * 📢 CONFIRMAÇÃO
         * --------------------------------------------------------------------
         */

        await interaction.reply({
          content:
            `✅ Candidato <@${targetId}> foi **APROVADO** por <@${interaction.user.id}>!\n\n` +
            `🏷️ **Apelido:** \`${apelido}\`\n` +
            `🎖️ **Cargos adicionados:**\n` +
            `<@&1536304132980473896>\n` +
            `<@&1537151042888671365>`
        });

      } catch (erro) {

        console.error(
          '❌ Erro geral ao aprovar candidato:',
          erro
        );

        if (!interaction.replied) {

          await interaction.reply({
            content:
              '❌ Ocorreu um erro ao aprovar o candidato. ' +
              'Verifique o console do bot.',
            ephemeral: true
          });

        }
      }

      return;
    }

    /**
     * ------------------------------------------------------------------------
     * ❌ RECUSAR CANDIDATO
     * ------------------------------------------------------------------------
     */

    if (interaction.customId.startsWith('btn_rec_recusar_')) {

      const targetId = interaction.customId.replace(
        'btn_rec_recusar_',
        ''
      );

      await interaction.reply({
        content:
          `❌ Candidato <@${targetId}> foi **RECUSADO** por <@${interaction.user.id}>.`
      });

      return;
    }
  }

  /**
   * ==========================================================================
   * 📝 MODAL DE CANDIDATURA
   * ==========================================================================
   */

  if (
    interaction.isModalSubmit() &&
    interaction.customId === 'modal_rec_ficha'
  ) {

    return await processarFichaRecrutamento(
      interaction,
      client
    );

  }
}

/**
 * ============================================================================
 * 📤 EXPORTAR FUNÇÕES
 * ============================================================================
 */

module.exports = {
  gerarPainelRecrutamento,
  tratarInteracaoRecrutamento
};
