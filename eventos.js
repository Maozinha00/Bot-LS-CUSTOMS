/**
 * ============================================================================
 * 🏁 LS CUSTOMS — SISTEMA COMPLETO DE EVENTOS AUTOMOTIVOS
 * ARQUIVO: eventos.js
 * CANAL DO EVENTO: 1537925623979319297
 * DISCORD.JS V14
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

// ============================================================================
// ⚙️ CONFIGURAÇÕES
// ============================================================================

const VALOR_INSCRICAO = 10000;

const CARGO_STAFF = configLS.cargoStaffEventoId || null;

// ============================================================================
// 🧰 GARANTIR ESTRUTURA DO BANCO
// ============================================================================

if (!db.inscritosEvento) {
  db.inscritosEvento = new Map();
}

if (!db.eventoConfig) {
  db.eventoConfig = {
    painelMessageId: null,
    aberto: true,
    primeiroLugar: null,
    segundoLugar: null,
    terceiroLugar: null
  };
}

// ============================================================================
// 🔐 VERIFICAR STAFF
// ============================================================================

function usuarioEhStaff(interaction) {
  if (!interaction.member) return false;

  // Se não configurou cargo específico,
  // permite quem tiver ManageGuild.
  if (!CARGO_STAFF) {
    return interaction.member.permissions?.has('ManageGuild');
  }

  return interaction.member.roles?.cache?.has(CARGO_STAFF);
}

// ============================================================================
// 🏁 GERAR EMBED PRINCIPAL
// ============================================================================

function gerarEmbedPainelEvento() {
  const totalInscritos = db.inscritosEvento.size;

  let totalPagos = 0;
  let arrecadado = 0;

  for (const item of db.inscritosEvento.values()) {
    if (item.pago) {
      totalPagos++;
      arrecadado += VALOR_INSCRICAO;
    }
  }

  const pendentes = totalInscritos - totalPagos;

  const statusEvento = db.eventoConfig.aberto
    ? '🟢 INSCRIÇÕES ABERTAS'
    : '🔴 INSCRIÇÕES ENCERRADAS';

  return new EmbedBuilder()
    .setColor(db.eventoConfig.aberto ? '#2ECC71' : '#E74C3C')
    .setTitle('🏁🔥 EVENTO AUTOMOTIVO — LS CUSTOMS 🔧')
    .setDescription(
      '🚗 **PREPARE SEU MELHOR PROJETO!** 💨\n\n' +

      'A **LS Customs** está reunindo os melhores projetos automotivos da cidade!\n\n' +

      '━━━━━━━━━━━━━━━━━━━━━━\n\n' +

      `🎟️ **INSCRIÇÃO:** \`R$ ${VALOR_INSCRICAO.toLocaleString('pt-BR')}\`\n\n` +

      '🏆 **PREMIAÇÃO OFICIAL**\n' +
      '🥇 **1º Lugar:** 💰 `R$ 50.000`\n' +
      '🥈 **2º Lugar:** 💰 `R$ 30.000`\n' +
      '🥉 **3º Lugar:** 💰 `R$ 20.000`\n\n' +

      '━━━━━━━━━━━━━━━━━━━━━━\n\n' +

      `📢 **STATUS:** ${statusEvento}\n\n` +

      '📊 **DADOS DO EVENTO**\n' +
      `👥 **Participantes:** \`${totalInscritos}\`\n` +
      `🟢 **Pagamentos Confirmados:** \`${totalPagos}\`\n` +
      `🟡 **Pagamentos Pendentes:** \`${pendentes}\`\n` +
      `💰 **Arrecadado:** \`R$ ${arrecadado.toLocaleString('pt-BR')}\`\n\n` +

      '━━━━━━━━━━━━━━━━━━━━━━\n\n' +

      '🎨 **CRITÉRIOS DE AVALIAÇÃO**\n' +
      '• Customização & Estética\n' +
      '• Performance\n' +
      '• Originalidade\n' +
      '• Presença & Acabamento\n\n' +

      '🔥 **Prepare seu projeto e venha disputar o pódio!**'
    )
    .setImage(configLS.bannerUrl)
    .setFooter({
      text: 'LS CUSTOMS • Evento Automotivo • Sistema Oficial'
    })
    .setTimestamp();
}

// ============================================================================
// 🔘 BOTÕES DO PAINEL
// ============================================================================

function gerarBotoesPainelEvento() {

  const row1 = new ActionRowBuilder().addComponents(

    new ButtonBuilder()
      .setCustomId('btn_ev_inscrever')
      .setLabel('🏎️ Inscrever Veículo')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!db.eventoConfig.aberto),

    new ButtonBuilder()
      .setCustomId('btn_ev_consultar')
      .setLabel('🔎 Minha Inscrição')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('btn_ev_lista')
      .setLabel('📋 Participantes')
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(

    new ButtonBuilder()
      .setCustomId('btn_ev_confirmar_pagamento')
      .setLabel('💰 Confirmar Pagamento')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('btn_ev_podio')
      .setLabel('🏆 Ver Pódio')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('btn_ev_arrecadado')
      .setLabel('📊 Arrecadação')
      .setStyle(ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(

    new ButtonBuilder()
      .setCustomId('btn_ev_admin')
      .setLabel('👑 Painel da Liderança')
      .setStyle(ButtonStyle.Danger)
  );

  return [row1, row2, row3];
}

// ============================================================================
// 🔄 ATUALIZAR PAINEL FIXO
// ============================================================================

async function atualizarPainelNoCanal(client) {

  const canal = client.channels.cache.get(configLS.canalEventoId);

  if (!canal) {
    console.warn(
      `⚠️ [EVENTO] Canal ${configLS.canalEventoId} não encontrado.`
    );
    return;
  }

  const embed = gerarEmbedPainelEvento();
  const rows = gerarBotoesPainelEvento();

  if (db.eventoConfig.painelMessageId) {

    try {

      const msg = await canal.messages.fetch(
        db.eventoConfig.painelMessageId
      );

      if (msg) {

        await msg.edit({
          embeds: [embed],
          components: rows
        });

        return;
      }

    } catch (error) {

      console.warn(
        '⚠️ [EVENTO] Painel antigo não encontrado. Criando novo.'
      );

    }
  }

  const novaMsg = await canal.send({
    embeds: [embed],
    components: rows
  });

  db.eventoConfig.painelMessageId = novaMsg.id;

  console.log(
    `🏁 [EVENTO] Painel criado: ${novaMsg.id}`
  );
}

// ============================================================================
// 📝 MODAL DE INSCRIÇÃO
// ============================================================================

function criarModalInscricao() {

  const modal = new ModalBuilder()
    .setCustomId('modal_ev_inscricao')
    .setTitle('🏁 Inscrição — Evento LS Customs');

  const nome = new TextInputBuilder()
    .setCustomId('ev_nome')
    .setLabel('👤 Nome do participante')
    .setPlaceholder('Ex: Henrique Souza')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(50);

  const passaporte = new TextInputBuilder()
    .setCustomId('ev_passaporte')
    .setLabel('🆔 Passaporte / ID')
    .setPlaceholder('Ex: 123')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(20);

  const veiculo = new TextInputBuilder()
    .setCustomId('ev_veiculo')
    .setLabel('🚗 Nome do veículo')
    .setPlaceholder('Ex: Nissan Skyline R34')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(50);

  const cor = new TextInputBuilder()
    .setCustomId('ev_cor')
    .setLabel('🎨 Cor do veículo')
    .setPlaceholder('Ex: Preto')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(30);

  const observacao = new TextInputBuilder()
    .setCustomId('ev_observacao')
    .setLabel('🔥 Descrição do projeto')
    .setPlaceholder('Ex: Projeto esportivo com visual exclusivo...')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(500);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nome),
    new ActionRowBuilder().addComponents(passaporte),
    new ActionRowBuilder().addComponents(veiculo),
    new ActionRowBuilder().addComponents(cor),
    new ActionRowBuilder().addComponents(observacao)
  );

  return modal;
}

// ============================================================================
// 💰 MODAL DE CONFIRMAÇÃO DE PAGAMENTO
// ============================================================================

function criarModalPagamento() {

  const modal = new ModalBuilder()
    .setCustomId('modal_ev_pagamento')
    .setTitle('💰 Confirmar Pagamento');

  const usuario = new TextInputBuilder()
    .setCustomId('ev_pagamento_usuario')
    .setLabel('🆔 ID do participante')
    .setPlaceholder('Digite o ID Discord do participante')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const comprovante = new TextInputBuilder()
    .setCustomId('ev_pagamento_comprovante')
    .setLabel('🧾 Comprovante / Referência')
    .setPlaceholder('Ex: Pagamento recebido')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(usuario),
    new ActionRowBuilder().addComponents(comprovante)
  );

  return modal;
}

// ============================================================================
// 📋 LISTA DE PARTICIPANTES
// ============================================================================

function gerarListaParticipantes() {

  if (db.inscritosEvento.size === 0) {

    return new EmbedBuilder()
      .setColor('#F39C12')
      .setTitle('📋 LISTA DE PARTICIPANTES')
      .setDescription(
        'Ainda não existem participantes inscritos no evento.'
      )
      .setFooter({
        text: 'LS CUSTOMS • Evento Automotivo'
      });
  }

  let texto = '';

  let contador = 0;

  for (const item of db.inscritosEvento.values()) {

    contador++;

    const pagamento = item.pago
      ? '🟢 Pago'
      : '🟡 Pendente';

    texto +=
      `**${String(contador).padStart(2, '0')}.** ` +
      `<@${item.userId}>\n` +
      `🚗 **Veículo:** ${item.veiculo}\n` +
      `🆔 **Passaporte:** #${item.passaporte}\n` +
      `🎨 **Cor:** ${item.cor}\n` +
      `💰 **Pagamento:** ${pagamento}\n\n`;
  }

  return new EmbedBuilder()
    .setColor('#3498DB')
    .setTitle('📋 PARTICIPANTES — EVENTO LS CUSTOMS')
    .setDescription(texto.slice(0, 4096))
    .setFooter({
      text: `Total de participantes: ${contador}`
    })
    .setTimestamp();
}

// ============================================================================
// 🔎 MINHA INSCRIÇÃO
// ============================================================================

function gerarMinhaInscricao(userId) {

  const item = db.inscritosEvento.get(userId);

  if (!item) {

    return new EmbedBuilder()
      .setColor('#F39C12')
      .setTitle('🔎 MINHA INSCRIÇÃO')
      .setDescription(
        '❌ Você ainda não possui uma inscrição registrada neste evento.\n\n' +
        'Clique em **🏎️ Inscrever Veículo** para participar.'
      );
  }

  return new EmbedBuilder()
    .setColor(item.pago ? '#2ECC71' : '#F39C12')
    .setTitle('🏁 MINHA INSCRIÇÃO — LS CUSTOMS')
    .setDescription(
      `👤 **Participante:** <@${item.userId}>\n` +
      `🆔 **Passaporte:** #${item.passaporte}\n` +
      `🚗 **Veículo:** ${item.veiculo}\n` +
      `🎨 **Cor:** ${item.cor}\n` +
      `💰 **Pagamento:** ${item.pago ? '🟢 CONFIRMADO' : '🟡 PENDENTE'}\n` +
      `📅 **Inscrição:** ${new Date(item.dataInscricao).toLocaleString('pt-BR')}\n\n` +
      `🔥 **Projeto:** ${item.observacao || 'Nenhuma descrição informada.'}`
    )
    .setFooter({
      text: 'LS CUSTOMS • Sistema de Eventos'
    })
    .setTimestamp();
}

// ============================================================================
// 🏆 PÓDIO
// ============================================================================

function gerarEmbedPodio() {

  const primeiro = db.eventoConfig.primeiroLugar;
  const segundo = db.eventoConfig.segundoLugar;
  const terceiro = db.eventoConfig.terceiroLugar;

  return new EmbedBuilder()
    .setColor('#F1C40F')
    .setTitle('🏆🔥 PÓDIO — EVENTO AUTOMOTIVO LS CUSTOMS')
    .setDescription(
      `🥇 **1º LUGAR — R$ 50.000**\n` +
      `${primeiro ? `<@${primeiro.userId}> — 🚗 ${primeiro.veiculo}` : '⏳ Ainda não definido'}\n\n` +

      `🥈 **2º LUGAR — R$ 30.000**\n` +
      `${segundo ? `<@${segundo.userId}> — 🚗 ${segundo.veiculo}` : '⏳ Ainda não definido'}\n\n` +

      `🥉 **3º LUGAR — R$ 20.000**\n` +
      `${terceiro ? `<@${terceiro.userId}> — 🚗 ${terceiro.veiculo}` : '⏳ Ainda não definido'}`
    )
    .setImage(configLS.bannerUrl)
    .setFooter({
      text: 'LS CUSTOMS • Pódio Oficial'
    })
    .setTimestamp();
}

// ============================================================================
// 📊 ARRECADAÇÃO
// ============================================================================

function gerarEmbedArrecadacao() {

  let pagos = 0;
  let pendentes = 0;

  for (const item of db.inscritosEvento.values()) {

    if (item.pago) {
      pagos++;
    } else {
      pendentes++;
    }
  }

  const arrecadado = pagos * VALOR_INSCRICAO;
  const previsto = db.inscritosEvento.size * VALOR_INSCRICAO;

  return new EmbedBuilder()
    .setColor('#2ECC71')
    .setTitle('📊 ARRECADAÇÃO — EVENTO LS CUSTOMS')
    .setDescription(
      `👥 **Total de inscritos:** ${db.inscritosEvento.size}\n` +
      `🟢 **Pagamentos confirmados:** ${pagos}\n` +
      `🟡 **Pagamentos pendentes:** ${pendentes}\n\n` +

      `💰 **Valor por inscrição:** R$ ${VALOR_INSCRICAO.toLocaleString('pt-BR')}\n` +
      `💵 **Total arrecadado:** R$ ${arrecadado.toLocaleString('pt-BR')}\n` +
      `📈 **Total previsto:** R$ ${previsto.toLocaleString('pt-BR')}\n\n` +

      `🏆 **Premiação:** R$ 100.000`
    )
    .setFooter({
      text: 'LS CUSTOMS • Financeiro do Evento'
    })
    .setTimestamp();
}

// ============================================================================
// 👑 PAINEL DA LIDERANÇA
// ============================================================================

function gerarPainelAdmin() {

  return new EmbedBuilder()
    .setColor('#E74C3C')
    .setTitle('👑 PAINEL DA LIDERANÇA — EVENTO')
    .setDescription(
      'Área exclusiva da liderança da LS Customs.\n\n' +
      'Use os botões abaixo para administrar o evento.\n\n' +
      `📊 Participantes: **${db.inscritosEvento.size}**\n` +
      `📢 Status: **${db.eventoConfig.aberto ? 'Aberto' : 'Encerrado'}**`
    );
}

function gerarBotoesAdmin() {

  return [
    new ActionRowBuilder().addComponents(

      new ButtonBuilder()
        .setCustomId('btn_ev_fechar')
        .setLabel('🔒 Fechar Inscrições')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!db.eventoConfig.aberto),

      new ButtonBuilder()
        .setCustomId('btn_ev_abrir')
        .setLabel('🔓 Abrir Inscrições')
        .setStyle(ButtonStyle.Success)
        .setDisabled(db.eventoConfig.aberto),

      new ButtonBuilder()
        .setCustomId('btn_ev_admin_pagamento')
        .setLabel('💰 Registrar Pagamento')
        .setStyle(ButtonStyle.Primary)
    )
  ];
}

// ============================================================================
// 🏆 MODAL PARA DEFINIR PÓDIO
// ============================================================================

function criarModalPodio() {

  const modal = new ModalBuilder()
    .setCustomId('modal_ev_podio')
    .setTitle('🏆 Registrar Pódio');

  const primeiro = new TextInputBuilder()
    .setCustomId('podio_1')
    .setLabel('🥇 ID Discord — 1º Lugar')
    .setPlaceholder('ID do vencedor')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const segundo = new TextInputBuilder()
    .setCustomId('podio_2')
    .setLabel('🥈 ID Discord — 2º Lugar')
    .setPlaceholder('ID do segundo colocado')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const terceiro = new TextInputBuilder()
    .setCustomId('podio_3')
    .setLabel('🥉 ID Discord — 3º Lugar')
    .setPlaceholder('ID do terceiro colocado')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(primeiro),
    new ActionRowBuilder().addComponents(segundo),
    new ActionRowBuilder().addComponents(terceiro)
  );

  return modal;
}

// ============================================================================
// 🖱️ TRATAMENTO CENTRAL DAS INTERAÇÕES DO EVENTO
// ============================================================================

async function tratarInteracaoEvento(interaction, client) {

  // ========================================================================
  // 🔘 BOTÕES
  // ========================================================================

  if (interaction.isButton()) {

    const id = interaction.customId;

    // ----------------------------------------------------------------------
    // 🏎️ INSCRIÇÃO
    // ----------------------------------------------------------------------

    if (id === 'btn_ev_inscrever') {

      if (!db.eventoConfig.aberto) {

        await interaction.reply({
          content: '🔒 As inscrições para este evento estão encerradas.',
          ephemeral: true
        });

        return true;
      }

      if (db.inscritosEvento.has(interaction.user.id)) {

        await interaction.reply({
          content: '⚠️ Você já possui uma inscrição neste evento.',
          ephemeral: true
        });

        return true;
      }

      await interaction.showModal(criarModalInscricao());

      return true;
    }

    // ----------------------------------------------------------------------
    // 🔎 CONSULTAR
    // ----------------------------------------------------------------------

    if (id === 'btn_ev_consultar') {

      await interaction.reply({
        embeds: [
          gerarMinhaInscricao(interaction.user.id)
        ],
        ephemeral: true
      });

      return true;
    }

    // ----------------------------------------------------------------------
    // 📋 LISTA
    // ----------------------------------------------------------------------

    if (id === 'btn_ev_lista') {

      await interaction.reply({
        embeds: [
          gerarListaParticipantes()
        ],
        ephemeral: true
      });

      return true;
    }

    // ----------------------------------------------------------------------
    // 💰 PAGAMENTO STAFF
    // ----------------------------------------------------------------------

    if (id === 'btn_ev_confirmar_pagamento') {

      if (!usuarioEhStaff(interaction)) {

        await interaction.reply({
          content: '⛔ Apenas a **Liderança/Staff** pode confirmar pagamentos.',
          ephemeral: true
        });

        return true;
      }

      await interaction.showModal(
        criarModalPagamento()
      );

      return true;
    }

    // ----------------------------------------------------------------------
    // 🏆 PÓDIO
    // ----------------------------------------------------------------------

    if (id === 'btn_ev_podio') {

      await interaction.reply({
        embeds: [
          gerarEmbedPodio()
        ],
        ephemeral: true
      });

      return true;
    }

    // ----------------------------------------------------------------------
    // 📊 ARRECADAÇÃO
    // ----------------------------------------------------------------------

    if (id === 'btn_ev_arrecadado') {

      if (!usuarioEhStaff(interaction)) {

        await interaction.reply({
          content: '⛔ A arrecadação é visível apenas para a liderança.',
          ephemeral: true
        });

        return true;
      }

      await interaction.reply({
        embeds: [
          gerarEmbedArrecadacao()
        ],
        ephemeral: true
      });

      return true;
    }

    // ----------------------------------------------------------------------
    // 👑 ADMIN
    // ----------------------------------------------------------------------

    if (id === 'btn_ev_admin') {

      if (!usuarioEhStaff(interaction)) {

        await interaction.reply({
          content: '⛔ Você não possui permissão para acessar o painel da liderança.',
          ephemeral: true
        });

        return true;
      }

      await interaction.reply({
        embeds: [
          gerarPainelAdmin()
        ],
        components: gerarBotoesAdmin(),
        ephemeral: true
      });

      return true;
    }

    // ----------------------------------------------------------------------
    // 🔒 FECHAR
    // ----------------------------------------------------------------------

    if (id === 'btn_ev_fechar') {

      if (!usuarioEhStaff(interaction)) {

        await interaction.reply({
          content: '⛔ Sem permissão.',
          ephemeral: true
        });

        return true;
      }

      db.eventoConfig.aberto = false;

      await atualizarPainelNoCanal(client);

      await interaction.reply({
        content: '🔒 **Inscrições encerradas com sucesso!**',
        ephemeral: true
      });

      return true;
    }

    // ----------------------------------------------------------------------
    // 🔓 ABRIR
    // ----------------------------------------------------------------------

    if (id === 'btn_ev_abrir') {

      if (!usuarioEhStaff(interaction)) {

        await interaction.reply({
          content: '⛔ Sem permissão.',
          ephemeral: true
        });

        return true;
      }

      db.eventoConfig.aberto = true;

      await atualizarPainelNoCanal(client);

      await interaction.reply({
        content: '🔓 **Inscrições abertas novamente!**',
        ephemeral: true
      });

      return true;
    }

    // ----------------------------------------------------------------------
    // 💰 ADMIN PAGAMENTO
    // ----------------------------------------------------------------------

    if (id === 'btn_ev_admin_pagamento') {

      if (!usuarioEhStaff(interaction)) {

        await interaction.reply({
          content: '⛔ Sem permissão.',
          ephemeral: true
        });

        return true;
      }

      await interaction.showModal(
        criarModalPagamento()
      );

      return true;
    }

    return false;
  }

  // ========================================================================
  // 📝 MODAIS
  // ========================================================================

  if (interaction.isModalSubmit()) {

    const id = interaction.customId;

    // ----------------------------------------------------------------------
    // 🏎️ NOVA INSCRIÇÃO
    // ----------------------------------------------------------------------

    if (id === 'modal_ev_inscricao') {

      if (!db.eventoConfig.aberto) {

        await interaction.reply({
          content: '🔒 As inscrições estão encerradas.',
          ephemeral: true
        });

        return true;
      }

      if (db.inscritosEvento.has(interaction.user.id)) {

        await interaction.reply({
          content: '⚠️ Você já possui uma inscrição.',
          ephemeral: true
        });

        return true;
      }

      const nome =
        interaction.fields
          .getTextInputValue('ev_nome')
          .trim();

      const passaporte =
        interaction.fields
          .getTextInputValue('ev_passaporte')
          .trim();

      const veiculo =
        interaction.fields
          .getTextInputValue('ev_veiculo')
          .trim();

      const cor =
        interaction.fields
          .getTextInputValue('ev_cor')
          .trim();

      const observacao =
        interaction.fields
          .getTextInputValue('ev_observacao')
          .trim();

      db.inscritosEvento.set(
        interaction.user.id,
        {
          userId: interaction.user.id,
          nome,
          passaporte,
          veiculo,
          cor,
          observacao,
          pago: false,
          dataInscricao: new Date()
        }
      );

      await atualizarPainelNoCanal(client);

      await interaction.reply({
        content:
          '🏁 **INSCRIÇÃO REALIZADA COM SUCESSO!**\n\n' +
          `👤 Participante: **${nome}**\n` +
          `🆔 Passaporte: **#${passaporte}**\n` +
          `🚗 Veículo: **${veiculo}**\n` +
          `🎨 Cor: **${cor}**\n` +
          `💰 Pagamento: **🟡 Pendente**\n\n` +
          `🎟️ Valor da inscrição: **R$ ${VALOR_INSCRICAO.toLocaleString('pt-BR')}**\n\n` +
          'Aguarde a liderança confirmar seu pagamento.',
        ephemeral: true
      });

      return true;
    }

    // ----------------------------------------------------------------------
    // 💰 CONFIRMAR PAGAMENTO
    // ----------------------------------------------------------------------

    if (id === 'modal_ev_pagamento') {

      if (!usuarioEhStaff(interaction)) {

        await interaction.reply({
          content: '⛔ Apenas a liderança pode confirmar pagamentos.',
          ephemeral: true
        });

        return true;
      }

      const userId =
        interaction.fields
          .getTextInputValue('ev_pagamento_usuario')
          .trim();

      const comprovante =
        interaction.fields
          .getTextInputValue('ev_pagamento_comprovante')
          .trim();

      const inscricao =
        db.inscritosEvento.get(userId);

      if (!inscricao) {

        await interaction.reply({
          content:
            `❌ Não encontrei uma inscrição para o ID **${userId}**.`,
          ephemeral: true
        });

        return true;
      }

      inscricao.pago = true;
      inscricao.comprovante = comprovante;
      inscricao.pagamentoPor = interaction.user.id;
      inscricao.dataPagamento = new Date();

      db.inscritosEvento.set(
        userId,
        inscricao
      );

      await atualizarPainelNoCanal(client);

      await interaction.reply({
        content:
          '✅ **PAGAMENTO CONFIRMADO!**\n\n' +
          `👤 Participante: <@${userId}>\n` +
          `🚗 Veículo: **${inscricao.veiculo}**\n` +
          `💰 Valor: **R$ ${VALOR_INSCRICAO.toLocaleString('pt-BR')}**\n` +
          `🧾 Comprovante: **${comprovante}**`,
        ephemeral: true
      });

      return true;
    }

    // ----------------------------------------------------------------------
    // 🏆 REGISTRAR PÓDIO
    // ----------------------------------------------------------------------

    if (id === 'modal_ev_podio') {

      if (!usuarioEhStaff(interaction)) {

        await interaction.reply({
          content: '⛔ Apenas a liderança pode registrar o pódio.',
          ephemeral: true
        });

        return true;
      }

      const id1 =
        interaction.fields.getTextInputValue('podio_1').trim();

      const id2 =
        interaction.fields.getTextInputValue('podio_2').trim();

      const id3 =
        interaction.fields.getTextInputValue('podio_3').trim();

      function pegarParticipante(id) {

        if (!id) return null;

        const participante =
          db.inscritosEvento.get(id);

        if (!participante) return null;

        return {
          userId: id,
          veiculo: participante.veiculo
        };
      }

      db.eventoConfig.primeiroLugar =
        pegarParticipante(id1);

      db.eventoConfig.segundoLugar =
        pegarParticipante(id2);

      db.eventoConfig.terceiroLugar =
        pegarParticipante(id3);

      await atualizarPainelNoCanal(client);

      await interaction.reply({
        content:
          '🏆 **PÓDIO REGISTRADO COM SUCESSO!**\n\n' +
          `🥇 ${id1 ? `<@${id1}>` : 'Não definido'}\n` +
          `🥈 ${id2 ? `<@${id2}>` : 'Não definido'}\n` +
          `🥉 ${id3 ? `<@${id3}>` : 'Não definido'}`,
        ephemeral: true
      });

      return true;
    }

    return false;
  }

  return false;
}

// ============================================================================
// 📦 EXPORTAÇÕES
// ============================================================================

module.exports = {
  gerarEmbedPainelEvento,
  gerarBotoesPainelEvento,
  atualizarPainelNoCanal,
  tratarInteracaoEvento
};
