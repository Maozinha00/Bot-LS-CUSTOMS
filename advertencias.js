```js
/**
 * ============================================================================
 * ⚠️ LS CUSTOMS — SISTEMA DE ADVERTÊNCIAS DISCIPLINARES
 * ARQUIVO: advertencias.js
 * ============================================================================
 *
 * FUNÇÕES:
 * • Painel de advertências
 * • Aplicar advertência
 * • Consultar histórico
 * • 1ª / 2ª / 3ª advertência
 * • Aplicação automática dos cargos
 * • Registro de logs
 * • Suporte para @menção ou ID do Discord
 * • Proteção contra erros
 *
 * REQUISITOS NO database.js:
 *
 * db.advertencias
 *
 * configLS:
 * • bannerUrl
 * • cargoAdvVerbalLeveId
 * • cargoAdvMediaId
 * • cargoAdvGraveId
 * • canalLogsAdvId
 *
 * ============================================================================
 */

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

const { db, configLS } = require('./database');

/**
 * ============================================================================
 * UTILIDADES
 * ============================================================================
 */

function limparId(valor) {
  if (!valor) return null;

  return String(valor)
    .replace(/[<@!#>]/g, '')
    .trim();
}

function obterData(data) {
  if (!data) return new Date();

  const resultado = new Date(data);

  if (isNaN(resultado.getTime())) {
    return new Date();
  }

  return resultado;
}

function obterRegistro(userId) {
  if (!db || !db.advertencias) {
    throw new Error(
      'db.advertencias não existe no database.js'
    );
  }

  let registro = null;

  try {
    // Map / QuickDB / estrutura com .get()
    if (typeof db.advertencias.get === 'function') {
      registro = db.advertencias.get(userId);
    }

    // Estrutura objeto comum
    if (!registro && typeof db.advertencias === 'object') {
      registro = db.advertencias[userId];
    }
  } catch (error) {
    console.error(
      '[ADVERTENCIAS] Erro ao obter registro:',
      error
    );
  }

  if (!registro || typeof registro !== 'object') {
    registro = {
      count: 0,
      historico: [],
    };
  }

  if (!Array.isArray(registro.historico)) {
    registro.historico = [];
  }

  if (typeof registro.count !== 'number') {
    registro.count = registro.historico.length;
  }

  return registro;
}

function salvarRegistro(userId, registro) {
  if (!db || !db.advertencias) {
    throw new Error(
      'db.advertencias não existe no database.js'
    );
  }

  try {
    // Map / QuickDB / estrutura com .set()
    if (typeof db.advertencias.set === 'function') {
      db.advertencias.set(userId, registro);
      return true;
    }

    // Estrutura objeto comum
    if (
      typeof db.advertencias === 'object' &&
      !Array.isArray(db.advertencias)
    ) {
      db.advertencias[userId] = registro;
      return true;
    }

    return false;
  } catch (error) {
    console.error(
      '[ADVERTENCIAS] Erro ao salvar registro:',
      error
    );

    return false;
  }
}

/**
 * ============================================================================
 * PAINEL
 * ============================================================================
 */

function gerarPainelAdvertencia() {
  const embed = new EmbedBuilder()
    .setColor('#EF4444')
    .setTitle(
      '⚖️ PAINEL DE DISCIPLINA & ADVERTÊNCIAS — LS CUSTOMS 🔧'
    )
    .setDescription(
      [
        'Painel de controle disciplinar da **LS Customs**.',
        '',
        '📋 **GRADUAÇÃO DE PENALIDADES:**',
        '',
        '🟡 **1ª ADVERTÊNCIA**',
        '└─ Advertência leve / orientação formal',
        '',
        '🟠 **2ª ADVERTÊNCIA**',
        '└─ Penalidade média / suspensão / perda de bonificação',
        '',
        '🔴 **3ª ADVERTÊNCIA**',
        '└─ Penalidade grave — **EXONERAÇÃO / DEMISSÃO**',
        '',
        'Clique em uma das opções abaixo.',
      ].join('\n')
    )
    .setFooter({
      text: 'LS Customs • Corregedoria e Disciplina',
    })
    .setTimestamp();

  if (configLS?.bannerUrl) {
    embed.setImage(configLS.bannerUrl);
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_adv_aplicar')
      .setLabel('Aplicar Advertência')
      .setEmoji('⚠️')
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId('btn_adv_consultar')
      .setLabel('Consultar Histórico')
      .setEmoji('🔎')
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [row],
  };
}

/**
 * ============================================================================
 * MODAL — APLICAR ADVERTÊNCIA
 * ============================================================================
 */

async function abrirModalAplicarAdv(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_adv_aplicar')
    .setTitle('Aplicar Advertência');

  const inputMembro = new TextInputBuilder()
    .setCustomId('adv_membro')
    .setLabel('ID ou menção do membro')
    .setPlaceholder('Ex: 123456789012345678')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const inputGravidade = new TextInputBuilder()
    .setCustomId('adv_gravidade')
    .setLabel('Número da advertência')
    .setPlaceholder('Digite 1, 2 ou 3')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(1);

  const inputMotivo = new TextInputBuilder()
    .setCustomId('adv_motivo')
    .setLabel('Motivo da advertência')
    .setPlaceholder(
      'Informe o ocorrido e, se possível, a regra infringida.'
    )
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);

  modal.addComponents(
    new ActionRowBuilder().addComponents(inputMembro),
    new ActionRowBuilder().addComponents(inputGravidade),
    new ActionRowBuilder().addComponents(inputMotivo)
  );

  await interaction.showModal(modal);
}

/**
 * ============================================================================
 * MODAL — CONSULTAR
 * ============================================================================
 */

async function abrirModalConsultarAdv(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_adv_consultar')
    .setTitle('Consultar Histórico');

  const inputMembro = new TextInputBuilder()
    .setCustomId('adv_cons_membro')
    .setLabel('ID ou menção do membro')
    .setPlaceholder('Ex: 123456789012345678')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  modal.addComponents(
    new ActionRowBuilder().addComponents(inputMembro)
  );

  await interaction.showModal(modal);
}

/**
 * ============================================================================
 * PROCESSAR ADVERTÊNCIA
 * ============================================================================
 */

async function processarAplicacaoAdv(interaction, client) {
  try {
    const rawMembro = limparId(
      interaction.fields.getTextInputValue('adv_membro')
    );

    const rawGravidade = interaction.fields
      .getTextInputValue('adv_gravidade')
      .trim();

    const motivo = interaction.fields
      .getTextInputValue('adv_motivo')
      .trim();

    if (!rawMembro) {
      return interaction.reply({
        content: '❌ Você precisa informar o ID ou mencionar o membro.',
        ephemeral: true,
      });
    }

    if (!['1', '2', '3'].includes(rawGravidade)) {
      return interaction.reply({
        content:
          '❌ Advertência inválida.\n\nDigite somente **1**, **2** ou **3**.',
        ephemeral: true,
      });
    }

    if (!motivo) {
      return interaction.reply({
        content: '❌ Informe o motivo da advertência.',
        ephemeral: true,
      });
    }

    /**
     * ------------------------------------------------------------------------
     * LOCALIZAR MEMBRO
     * ------------------------------------------------------------------------
     */

    let targetMember = null;

    if (interaction.guild) {
      targetMember = await interaction.guild.members
        .fetch(rawMembro)
        .catch(() => null);
    }

    const userId = targetMember
      ? targetMember.id
      : rawMembro;

    const userTag = targetMember
      ? targetMember.user.tag
      : `ID ${rawMembro}`;

    /**
     * ------------------------------------------------------------------------
     * PEGAR REGISTRO
     * ------------------------------------------------------------------------
     */

    let registro;

    try {
      registro = obterRegistro(userId);
    } catch (error) {
      console.error(error);

      return interaction.reply({
        content:
          '❌ O sistema de banco de dados de advertências não está configurado corretamente.\n\nVerifique o `database.js`.',
        ephemeral: true,
      });
    }

    /**
     * ------------------------------------------------------------------------
     * IMPORTANTE:
     *
     * A quantidade da advertência é definida pelo histórico.
     * A gravidade digitada serve como informação da ocorrência.
     *
     * A progressão oficial fica:
     *
     * 1ª = Leve
     * 2ª = Média
     * 3ª = Grave
     * ------------------------------------------------------------------------
     */

    const numeroAdvertencia = registro.count + 1;

    let gravidadeTxt;
    let cargoToAddId = null;

    if (numeroAdvertencia === 1) {
      gravidadeTxt = '1ª Advertência — LEVE';
      cargoToAddId = configLS?.cargoAdvVerbalLeveId;
    } else if (numeroAdvertencia === 2) {
      gravidadeTxt = '2ª Advertência — MÉDIA';
      cargoToAddId = configLS?.cargoAdvMediaId;
    } else {
      gravidadeTxt = '3ª Advertência — GRAVE / EXONERAÇÃO';
      cargoToAddId = configLS?.cargoAdvGraveId;
    }

    /**
     * ------------------------------------------------------------------------
     * SALVAR
     * ------------------------------------------------------------------------
     */

    registro.count = numeroAdvertencia;

    registro.historico.push({
      numero: numeroAdvertencia,
      gravidadeInformada: rawGravidade,
      gravidade: gravidadeTxt,
      motivo: motivo,
      autor: interaction.user.tag,
      autorId: interaction.user.id,
      data: new Date().toISOString(),
    });

    const salvo = salvarRegistro(userId, registro);

    if (!salvo) {
      return interaction.reply({
        content:
          '❌ Não foi possível salvar a advertência no banco de dados.',
        ephemeral: true,
      });
    }

    /**
     * ------------------------------------------------------------------------
     * ADICIONAR CARGO
     * ------------------------------------------------------------------------
     */

    let cargoAplicado = false;

    if (targetMember && cargoToAddId) {
      try {
        await targetMember.roles.add(cargoToAddId);
        cargoAplicado = true;
      } catch (error) {
        console.error(
          '[ADVERTENCIAS] Não foi possível adicionar o cargo:',
          error
        );
      }
    }

    /**
     * ------------------------------------------------------------------------
     * LOG
     * ------------------------------------------------------------------------
     */

    const embedLog = new EmbedBuilder()
      .setColor(
        numeroAdvertencia >= 3
          ? '#7F1D1D'
          : numeroAdvertencia === 2
          ? '#F97316'
          : '#FACC15'
      )
      .setTitle('⚠️ ADVERTÊNCIA DISCIPLINAR APLICADA')
      .addFields(
        {
          name: '👤 Membro',
          value: `<@${userId}>\n\`${userTag}\``,
          inline: true,
        },
        {
          name: '📊 Advertência',
          value: `**${numeroAdvertencia}/3**`,
          inline: true,
        },
        {
          name: '⚖️ Gravidade',
          value: `**${gravidadeTxt}**`,
          inline: true,
        },
        {
          name: '📝 Motivo',
          value: motivo.substring(0, 1024),
          inline: false,
        },
        {
          name: '👮 Aplicado por',
          value: `<@${interaction.user.id}>`,
          inline: true,
        },
        {
          name: '🎖️ Cargo',
          value: cargoAplicado
            ? '✅ Cargo aplicado'
            : '⚠️ Cargo não aplicado',
          inline: true,
        }
      )
      .setFooter({
        text: 'LS Customs • Sistema Disciplinar',
      })
      .setTimestamp();

    if (numeroAdvertencia >= 3) {
      embedLog.addFields({
        name: '🚨 EXONERAÇÃO',
        value:
          '**O membro atingiu 3 advertências e deve ser exonerado da LS Customs.**',
        inline: false,
      });
    }

    /**
     * ------------------------------------------------------------------------
     * ENVIAR LOG
     * ------------------------------------------------------------------------
     */

    if (client && configLS?.canalLogsAdvId) {
      const canalLogs = await client.channels
        .fetch(configLS.canalLogsAdvId)
        .catch(() => null);

      if (canalLogs && canalLogs.isTextBased()) {
        await canalLogs
          .send({
            embeds: [embedLog],
          })
          .catch((error) => {
            console.error(
              '[ADVERTENCIAS] Erro ao enviar log:',
              error
            );
          });
      }
    }

    /**
     * ------------------------------------------------------------------------
     * RESPOSTA
     * ------------------------------------------------------------------------
     */

    let resposta =
      `✅ **Advertência registrada com sucesso!**\n\n` +
      `👤 Membro: <@${userId}>\n` +
      `📊 Advertência: **${numeroAdvertencia}/3**\n` +
      `⚖️ Grau: **${gravidadeTxt}**`;

    if (numeroAdvertencia >= 3) {
      resposta +=
        '\n\n🚨 **ATENÇÃO:** O membro atingiu **3 advertências** e deve ser exonerado.';
    }

    if (!targetMember) {
      resposta +=
        '\n\n⚠️ O ID foi registrado, mas o membro não foi encontrado no servidor. O cargo não pôde ser aplicado.';
    }

    await interaction.reply({
      content: resposta,
      ephemeral: true,
    });
  } catch (error) {
    console.error(
      '[ADVERTENCIAS] ERRO AO APLICAR ADVERTÊNCIA:',
      error
    );

    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content:
            '❌ Ocorreu um erro ao aplicar a advertência. Verifique o console do bot.',
          ephemeral: true,
        })
        .catch(() => null);
    }
  }
}

/**
 * ============================================================================
 * CONSULTAR HISTÓRICO
 * ============================================================================
 */

async function processarConsultaAdv(interaction) {
  try {
    const rawMembro = limparId(
      interaction.fields.getTextInputValue('adv_cons_membro')
    );

    if (!rawMembro) {
      return interaction.reply({
        content: '❌ Informe o ID ou mencione o membro.',
        ephemeral: true,
      });
    }

    let registro;

    try {
      registro = obterRegistro(rawMembro);
    } catch (error) {
      console.error(error);

      return interaction.reply({
        content:
          '❌ O sistema de banco de dados de advertências não está configurado corretamente.',
        ephemeral: true,
      });
    }

    if (
      !registro ||
      !registro.historico ||
      registro.historico.length === 0
    ) {
      return interaction.reply({
        content:
          `✅ O membro \`${rawMembro}\` possui **ficha limpa** na LS Customs.\n\n` +
          '📊 Advertências: **0/3**',
        ephemeral: true,
      });
    }

    const guild = interaction.guild;

    let targetMember = null;

    if (guild) {
      targetMember = await guild.members
        .fetch(rawMembro)
        .catch(() => null);
    }

    const nomeMembro = targetMember
      ? targetMember.user.tag
      : `ID ${rawMembro}`;

    let desc =
      `👤 **Membro:** ${targetMember ? `<@${rawMembro}>` : `\`${nomeMembro}\``}\n` +
      `📊 **Total:** \`${registro.count}/3\`\n\n`;

    registro.historico.forEach((adv, index) => {
      const data = obterData(adv.data);

      desc +=
        `**${index + 1}. ${adv.gravidade || 'Advertência'}**\n` +
        `📝 **Motivo:** ${adv.motivo || 'Não informado'}\n` +
        `👮 **Aplicado por:** ${adv.autor || 'Desconhecido'}\n` +
        `📅 **Data:** ${data.toLocaleString('pt-BR')}\n\n`;
    });

    /**
     * Limite do Discord para descrição de embed.
     */

    if (desc.length > 4000) {
      desc =
        desc.substring(0, 3950) +
        '\n\n⚠️ Histórico muito grande para exibição completa.';
    }

    const embed = new EmbedBuilder()
      .setColor(
        registro.count >= 3
          ? '#7F1D1D'
          : registro.count === 2
          ? '#F97316'
          : '#FACC15'
      )
      .setTitle('⚖️ FICHA DISCIPLINAR — LS CUSTOMS')
      .setDescription(desc)
      .setFooter({
        text: 'LS Customs • Sistema Disciplinar',
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  } catch (error) {
    console.error(
      '[ADVERTENCIAS] ERRO AO CONSULTAR:',
      error
    );

    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content:
            '❌ Ocorreu um erro ao consultar o histórico.',
          ephemeral: true,
        })
        .catch(() => null);
    }
  }
}

/**
 * ============================================================================
 * TRATAMENTO DAS INTERAÇÕES
 * ============================================================================
 */

async function tratarInteracaoAdvertencia(interaction, client) {
  try {
    /**
     * BOTÕES
     */

    if (interaction.isButton()) {
      if (interaction.customId === 'btn_adv_aplicar') {
        return await abrirModalAplicarAdv(interaction);
      }

      if (interaction.customId === 'btn_adv_consultar') {
        return await abrirModalConsultarAdv(interaction);
      }

      return;
    }

    /**
     * MODAIS
     */

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'modal_adv_aplicar') {
        return await processarAplicacaoAdv(
          interaction,
          client
        );
      }

      if (interaction.customId === 'modal_adv_consultar') {
        return await processarConsultaAdv(interaction);
      }

      return;
    }
  } catch (error) {
    console.error(
      '[ADVERTENCIAS] ERRO NA INTERAÇÃO:',
      error
    );

    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content:
            '❌ Ocorreu um erro ao processar esta ação.',
          ephemeral: true,
        })
        .catch(() => null);
    }
  }
}

/**
 * ============================================================================
 * EXPORTAÇÃO
 * ============================================================================
 */

module.exports = {
  gerarPainelAdvertencia,
  tratarInteracaoAdvertencia,
};
```
