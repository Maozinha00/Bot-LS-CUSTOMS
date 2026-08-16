/**
 * ============================================================================
 * ⚠️ LS CUSTOMS — SISTEMA DE ADVERTÊNCIAS DISCIPLINARES
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
  TextInputStyle,
} = require('discord.js');

const { db, configLS } = require('./database');

/**
 * UTILIDADES
 */
function limparId(valor) {
  if (!valor) return null;
  return String(valor).replace(/[<@!#>]/g, '').trim();
}

function obterData(data) {
  if (!data) return new Date();
  const resultado = new Date(data);
  return isNaN(resultado.getTime()) ? new Date() : resultado;
}

function obterRegistro(userId) {
  if (!db || !db.advertencias) {
    throw new Error('db.advertencias não existe no database.js');
  }

  let registro = null;
  try {
    if (typeof db.advertencias.get === 'function') {
      registro = db.advertencias.get(userId);
    }
    if (!registro && typeof db.advertencias === 'object') {
      registro = db.advertencias[userId];
    }
  } catch (error) {
    console.error('[ADVERTENCIAS] Erro ao obter registro:', error);
  }

  if (!registro || typeof registro !== 'object') {
    registro = { count: 0, historico: [] };
  }
  if (!Array.isArray(registro.historico)) registro.historico = [];
  if (typeof registro.count !== 'number') registro.count = registro.historico.length;

  return registro;
}

function salvarRegistro(userId, registro) {
  try {
    if (typeof db.advertencias.set === 'function') {
      db.advertencias.set(userId, registro);
      return true;
    }
    if (typeof db.advertencias === 'object' && !Array.isArray(db.advertencias)) {
      db.advertencias[userId] = registro;
      return true;
    }
    return false;
  } catch (error) {
    console.error('[ADVERTENCIAS] Erro ao salvar registro:', error);
    return false;
  }
}

/**
 * PAINEL PRINCIPAL
 */
function gerarPainelAdvertencia() {
  const embed = new EmbedBuilder()
    .setColor('#EF4444')
    .setTitle('⚖️ PAINEL DE DISCIPLINA & ADVERTÊNCIAS — LS CUSTOMS 🔧')
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
    .setFooter({ text: 'LS Customs • Corregedoria e Disciplina' })
    .setTimestamp();

  if (configLS?.bannerUrl) embed.setImage(configLS.bannerUrl);

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

  return { embeds: [embed], components: [row] };
}

/**
 * MODAIS
 */
async function abrirModalAplicarAdv(interaction) {
  const modal = new ModalBuilder().setCustomId('modal_adv_aplicar').setTitle('Aplicar Advertência');

  const inputMembro = new TextInputBuilder()
    .setCustomId('adv_membro')
    .setLabel('ID ou menção do membro')
    .setPlaceholder('Ex: 123456789012345678')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const inputGravidade = new TextInputBuilder()
    .setCustomId('adv_gravidade')
    .setLabel('Número da advertência')
    .setPlaceholder('Digite 1, 2 ou 3')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const inputMotivo = new TextInputBuilder()
    .setCustomId('adv_motivo')
    .setLabel('Motivo da advertência')
    .setPlaceholder('Informe o ocorrido...')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(inputMembro),
    new ActionRowBuilder().addComponents(inputGravidade),
    new ActionRowBuilder().addComponents(inputMotivo)
  );
  await interaction.showModal(modal);
}

async function abrirModalConsultarAdv(interaction) {
  const modal = new ModalBuilder().setCustomId('modal_adv_consultar').setTitle('Consultar Histórico');
  const inputMembro = new TextInputBuilder()
    .setCustomId('adv_cons_membro')
    .setLabel('ID ou menção do membro')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(inputMembro));
  await interaction.showModal(modal);
}

/**
 * PROCESSAMENTO
 */
async function processarAplicacaoAdv(interaction, client) {
  try {
    const rawMembro = limparId(interaction.fields.getTextInputValue('adv_membro'));
    const rawGravidade = interaction.fields.getTextInputValue('adv_gravidade').trim();
    const motivo = interaction.fields.getTextInputValue('adv_motivo').trim();

    if (!rawMembro) return interaction.reply({ content: '❌ ID inválido.', ephemeral: true });
    if (!['1', '2', '3'].includes(rawGravidade)) {
      return interaction.reply({ content: '❌ Digite 1, 2 ou 3.', ephemeral: true });
    }

    let targetMember = null;
    if (interaction.guild) {
      targetMember = await interaction.guild.members.fetch(rawMembro).catch(() => null);
    }

    const userId = targetMember ? targetMember.id : rawMembro;
    const userTag = targetMember ? targetMember.user.tag : "ID: " + rawMembro; // Alterado para evitar erro de crase

    let registro = obterRegistro(userId);
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

    registro.count = numeroAdvertencia;
    registro.historico.push({
      numero: numeroAdvertencia,
      gravidade: gravidadeTxt,
      motivo: motivo,
      autor: interaction.user.tag,
      data: new Date().toISOString(),
    });

    if (!salvarRegistro(userId, registro)) {
      return interaction.reply({ content: '❌ Erro ao salvar no banco de dados.', ephemeral: true });
    }

    let cargoAplicado = false;
    if (targetMember && cargoToAddId) {
      try {
        await targetMember.roles.add(cargoToAddId);
        cargoAplicado = true;
      } catch (e) { console.error(e); }
    }

    const embedLog = new EmbedBuilder()
      .setColor(numeroAdvertencia >= 3 ? '#7F1D1D' : (numeroAdvertencia === 2 ? '#F97316' : '#FACC15'))
      .setTitle('⚠️ ADVERTÊNCIA DISCIPLINAR APLICADA')
      .addFields(
        { name: '👤 Membro', value: `<@${userId}>\n\`${userTag}\``, inline: true },
        { name: '📊 Advertência', value: `**${numeroAdvertencia}/3**`, inline: true },
        { name: '⚖️ Gravidade', value: `**${gravidadeTxt}**`, inline: true },
        { name: '📝 Motivo', value: motivo.substring(0, 1024) },
        { name: '👮 Aplicado por', value: `<@${interaction.user.id}>`, inline: true },
        { name: '🎖️ Cargo', value: cargoAplicado ? '✅ Aplicado' : '⚠️ Não aplicado', inline: true }
      )
      .setTimestamp();

    if (client && configLS?.canalLogsAdvId) {
      const canal = await client.channels.fetch(configLS.canalLogsAdvId).catch(() => null);
      if (canal) await canal.send({ embeds: [embedLog] });
    }

    await interaction.reply({
      content: `✅ Advertência registrada! Membro: <@${userId}> (${numeroAdvertencia}/3)`,
      ephemeral: true,
    });
  } catch (error) {
    console.error(error);
    if (!interaction.replied) await interaction.reply({ content: '❌ Erro interno.', ephemeral: true });
  }
}

async function processarConsultaAdv(interaction) {
  try {
    const rawMembro = limparId(interaction.fields.getTextInputValue('adv_cons_membro'));
    let registro = obterRegistro(rawMembro);

    if (!registro.historico.length) {
      return interaction.reply({ content: `✅ O membro \`${rawMembro}\` possui ficha limpa.`, ephemeral: true });
    }

    let targetMember = await interaction.guild.members.fetch(rawMembro).catch(() => null);
    const nomeMembro = targetMember ? targetMember.user.tag : "ID: " + rawMembro;

    let desc = `👤 **Membro:** ${targetMember ? `<@${rawMembro}>` : nomeMembro}\n` +
               `📊 **Total:** \`${registro.count}/3\`\n\n`;

    registro.historico.forEach((adv, i) => {
      const data = obterData(adv.data);
      desc += `**${i + 1}. ${adv.gravidade}**\n` +
              `📝 Motivo: ${adv.motivo}\n` +
              `👮 Por: ${adv.autor}\n` +
              `📅 Data: ${data.toLocaleDateString('pt-BR')}\n\n`;
    });

    const embed = new EmbedBuilder()
      .setColor('#FACC15')
      .setTitle('⚖️ FICHA DISCIPLINAR')
      .setDescription(desc.substring(0, 4000))
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: '❌ Erro ao consultar.', ephemeral: true });
  }
}

async function tratarInteracaoAdvertencia(interaction, client) {
  if (interaction.isButton()) {
    if (interaction.customId === 'btn_adv_aplicar') return abrirModalAplicarAdv(interaction);
    if (interaction.customId === 'btn_adv_consultar') return abrirModalConsultarAdv(interaction);
  }
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'modal_adv_aplicar') return processarAplicacaoAdv(interaction, client);
    if (interaction.customId === 'modal_adv_consultar') return processarConsultaAdv(interaction);
  }
}

module.exports = { gerarPainelAdvertencia, tratarInteracaoAdvertencia };
