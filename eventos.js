/**
 * ============================================================================
 * 🏁 LS CUSTOMS — SISTEMA COMPLETO DE EVENTOS AUTOMOTIVOS
 * ARQUIVO: eventos.js
 * CANAL OFICIAL: 1537925623979319297
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
 * 📊 Gera o Embed Principal do Painel de Eventos com dados em tempo real
 */
function gerarEmbedPainelEvento() {
  const totalInscritos = db.inscritosEvento.size;
  let totalPagos = 0;
  let arrecadado = 0;

  for (const item of db.inscritosEvento.values()) {
    if (item.pago) {
      totalPagos++;
      arrecadado += (item.valorPago || configLS.taxaInscricaoEvento);
    }
  }

  const embed = new EmbedBuilder()
    .setColor(configLS.corLS || '#2ECC71')
    .setTitle('🏁🔥 EVENTO AUTOMOTIVO — LS CUSTOMS 🔧')
    .setDescription(
      '🚗 **PREPARE SEU MELHOR PROJETO!** 💨\n\n' +
      'A **LS Customs** está preparando um mega evento para reunir os **melhores carros e projetos customizados** da cidade!\n\n' +
      'Mostre seu motor, estética, suspensão e venha competir pelo pódio mais cobiçado de Los Santos! 🔥\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      '🎟️ **INSCRIÇÃO DO VEÍCULO:** `R$ 10.000`\n\n' +
      '🏆 **PREMIAÇÃO OFICIAL (R$ 100.000 em Prêmios):**\n' +
      '🥇 **1º Lugar:** 💰 `R$ 50.000`\n' +
      '🥈 **2º Lugar:** 💰 `R$ 30.000`\n' +
      '🥉 **3º Lugar:** 💰 `R$ 20.000`\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      '📋 **CRITÉRIOS DE AVALIAÇÃO:**\n' +
      '🎨 **Customização & Pintura** | ⚡ **Performance & Motor**\n' +
      '🚘 **Originalidade do Projeto** | 🔥 **Presença & Estilo**\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      '📊 **STATUS DO EVENTO EM TEMPO REAL:**\n' +
      `👥 **Total de Inscritos:** \`${totalInscritos}\`\n` +
      `🟢 **Pagamentos Confirmados:** \`${totalPagos}/${totalInscritos}\`\n` +
      `💰 **Total Arrecadado na Tesouraria:** \`R$ ${arrecadado.toLocaleString('pt-BR')}\`\n\n` +
      '━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      `📍 **Local:** ${db.eventoConfig.local} | ⏰ **Horário:** ${db.eventoConfig.horario}\n` +
      '> 🔧 *LS Customs — Seu carro, nosso trabalho.*'
    )
    .setImage(configLS.bannerUrl)
    .setFooter({ text: `LS CUSTOMS • Canal #${configLS.canalEventoId} • Atualização Automática` })
    .setTimestamp();

  return embed;
}

/**
 * 🎛️ Gera as Fileiras de Botões Interativos do Painel
 */
function gerarBotoesPainelEvento() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_ev_inscrever')
      .setLabel('🏎️ Inscrever Veículo (R$ 10k)')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('btn_ev_consultar')
      .setLabel('🔎 Minha Inscrição')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('btn_ev_lista')
      .setLabel('📋 Lista de Participantes')
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_ev_confirmar_pagamento')
      .setLabel('✅ Confirmar Pagamento (Staff)')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('btn_ev_podio')
      .setLabel('🏆 Ver Pódio / Vencedores')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('btn_ev_arrecadado')
      .setLabel('📊 Arrecadação')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2];
}

/**
 * 🔄 Atualiza automaticamente a mensagem fixada do Painel no canal
 */
async function atualizarPainelNoCanal(client) {
  try {
    const canal = client.channels.cache.get(configLS.canalEventoId);
    if (!canal) return;

    const embed = gerarEmbedPainelEvento();
    const rows = gerarBotoesPainelEvento();

    if (db.eventoConfig.painelMessageId) {
      try {
        const msg = await canal.messages.fetch(db.eventoConfig.painelMessageId);
        if (msg) {
          await msg.edit({ embeds: [embed], components: rows });
          return;
        }
      } catch (err) {
        // Mensagem antiga não encontrada, enviará nova
      }
    }

    const novaMsg = await canal.send({ embeds: [embed], components: rows });
    db.eventoConfig.painelMessageId = novaMsg.id;
  } catch (error) {
    console.error('⚠️ [EVENTOS] Erro ao atualizar painel no canal:', error && error.message ? error.message : error);
  }
}

/**
 * 📝 Cria e Exibe o Modal de Inscrição / Registro de Veículo
 */
async function abrirModalInscricao(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_ev_inscricao')
    .setTitle('Inscrição no Evento Automotivo');

  const inputNome = new TextInputBuilder()
    .setCustomId('ev_input_nome')
    .setLabel('Nome do Piloto (Personagem)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: Carlos Mendes')
    .setRequired(true);

  const inputPassaporte = new TextInputBuilder()
    .setCustomId('ev_input_id')
    .setLabel('Passaporte / ID na Cidade')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: 793')
    .setRequired(true);

  const inputVeiculo = new TextInputBuilder()
    .setCustomId('ev_input_veiculo')
    .setLabel('Modelo do Carro & Categoria')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: Nissan Skyline GT-R R34 (JDM / Esportivo)')
    .setRequired(true);

  const inputPlaca = new TextInputBuilder()
    .setCustomId('ev_input_placa')
    .setLabel('Placa do Veículo')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: LSC-793')
    .setRequired(true);

  const inputCustom = new TextInputBuilder()
    .setCustomId('ev_input_custom')
    .setLabel('Preparação, Motor & Modificações')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Ex: Stage 4 Twin Turbo, Kit Widebody, Pintura Midnight Purple, Rodas BBS aro 19...')
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(inputNome),
    new ActionRowBuilder().addComponents(inputPassaporte),
    new ActionRowBuilder().addComponents(inputVeiculo),
    new ActionRowBuilder().addComponents(inputPlaca),
    new ActionRowBuilder().addComponents(inputCustom)
  );

  await interaction.showModal(modal);
}

/**
 * 💾 Processa a Submissão do Modal de Inscrição
 */
async function processarInscricao(interaction, client) {
  const nome = interaction.fields.getTextInputValue('ev_input_nome').trim();
  const passaporte = interaction.fields.getTextInputValue('ev_input_id').replace('#', '').trim();
  const veiculo = interaction.fields.getTextInputValue('ev_input_veiculo').trim();
  const placa = interaction.fields.getTextInputValue('ev_input_placa').toUpperCase().trim();
  const custom = interaction.fields.getTextInputValue('ev_input_custom') || 'Projeto original limpo e polido.';

  // Salva no banco de dados centralizado
  db.inscritosEvento.set(interaction.user.id, {
    userId: interaction.user.id,
    userTag: interaction.user.tag,
    nome,
    passaporte,
    veiculo,
    placa,
    custom,
    pago: false,
    valorPago: 0,
    dataInscricao: new Date(),
    dataPagamento: null,
    notas: { customizacao: 0, performance: 0, originalidade: 0, presenca: 0 },
    media: 0
  });

  // Notifica no canal oficial
  const canal = client.channels.cache.get(configLS.canalEventoId);
  if (canal) {
    const alertEmbed = new EmbedBuilder()
      .setColor('#2ECC71')
      .setTitle('🏎️ NOVA INSCRIÇÃO REGISTRADA NO EVENTO!')
      .setDescription(
        `👤 **Piloto:** <@${interaction.user.id}> (${nome})\n` +
        `🆔 **Passaporte:** #${passaporte}\n` +
        `🚗 **Veículo:** **${veiculo}**\n` +
        `🏷️ **Placa:** \`${placa}\`\n\n` +
        `🔧 **Preparação & Detalhes:**\n${custom}\n\n` +
        `💰 **Taxa:** R$ 10.000 — Status: 🟡 **AGUARDANDO PAGAMENTO**\n` +
        `*Procure a gerência da LS Customs para validar sua inscrição!*`
      )
      .setFooter({ text: 'LS Customs • Eventos Automotivos' })
      .setTimestamp();

    await canal.send({ embeds: [alertEmbed] }).catch(() => null);
  }

  // Atualiza o painel fixo
  await atualizarPainelNoCanal(client);

  await interaction.reply({
    content: `✅ **Parabéns ${nome}!** Seu veículo **${veiculo}** (Placa: \`${placa}\`) foi registrado com sucesso!\n\n` +
             `💳 Para confirmar sua vaga na disputa e concorrer aos **R$ 100.000 em prêmios**, pague a taxa de **R$ 10.000** na tesouraria da LS Customs.`,
    ephemeral: true
  });
}

/**
 * 🔎 Consulta a Inscrição do Usuário
 */
async function consultarInscricao(interaction) {
  const dados = db.inscritosEvento.get(interaction.user.id);

  if (!dados) {
    return interaction.reply({
      content: '❌ Você ainda não inscreveu nenhum veículo no Evento Automotivo. Clique em **🏎️ Inscrever Veículo** para participar!',
      ephemeral: true
    });
  }

  const status = dados.pago 
    ? '🟢 **PAGAMENTO CONFIRMADO (VAGA GARANTIDA)**' 
    : '🟡 **PAGAMENTO PENDENTE (R$ 10.000)**';

  const embed = new EmbedBuilder()
    .setColor(dados.pago ? '#2ECC71' : '#F59E0B')
    .setTitle(`🔎 SUA INSCRIÇÃO — ${dados.veiculo}`)
    .setDescription(
      `👤 **Piloto:** ${dados.nome} (<@${dados.userId}>)\n` +
      `🆔 **Passaporte:** #${dados.passaporte}\n` +
      `🚗 **Veículo:** **${dados.veiculo}**\n` +
      `🏷️ **Placa:** \`${dados.placa}\`\n` +
      `🔧 **Modificações:** ${dados.custom}\n\n` +
      `💳 **Status:** ${status}\n` +
      `📅 **Data da Inscrição:** ${dados.dataInscricao.toLocaleDateString('pt-BR')} às ${dados.dataInscricao.toLocaleTimeString('pt-BR')}`
    )
    .setFooter({ text: 'LS Customs • Consulta de Inscrição' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * 📋 Lista de Participantes e Veículos
 */
async function listarParticipantes(interaction) {
  const total = db.inscritosEvento.size;

  if (total === 0) {
    return interaction.reply({
      content: '📋 Nenhum participante se inscreveu no momento. Seja o primeiro a inscrever sua máquina!',
      ephemeral: true
    });
  }

  let desc = `🏁 **GRID DE PARTICIPANTES — LS CUSTOMS**\nTotal de Inscritos: **${total}**\n\n`;
  let idx = 1;

  for (const [uid, dados] of db.inscritosEvento.entries()) {
    const statusIcon = dados.pago ? '🟢 PAGO' : '🟡 PENDENTE';
    desc += `**${idx}.** <@${uid}> (${dados.nome}) | ID #${dados.passaporte}\n`;
    desc += `🏎️ **${dados.veiculo}** [Placa: \`${dados.placa}\`] — ${statusIcon}\n\n`;
    idx++;
  }

  const embed = new EmbedBuilder()
    .setColor('#2ECC71')
    .setTitle('📋 LISTA DE PARTICIPANTES & MÁQUINAS')
    .setDescription(desc)
    .setFooter({ text: `Taxa: R$ 10.000 • Premiação Total: R$ 100.000` });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * ✅ Modal e Ação de Confirmar Pagamento (Staff)
 */
async function abrirModalConfirmarPagamento(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_ev_confirmar_pagamento')
    .setTitle('Confirmar Pagamento de Inscrição');

  const inputId = new TextInputBuilder()
    .setCustomId('ev_pay_id')
    .setLabel('Passaporte / ID ou Mencione o Piloto')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: 793 ou 123456789012345678')
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(inputId));
  await interaction.showModal(modal);
}

/**
 * 💰 Processa a confirmação de pagamento
 */
async function processarConfirmacaoPagamento(interaction, client) {
  const busca = interaction.fields.getTextInputValue('ev_pay_id').replace(/[<@!#>]/g, '').trim();

  let encontrado = null;

  for (const [uid, dados] of db.inscritosEvento.entries()) {
    if (uid === busca || dados.passaporte === busca || dados.nome.toLowerCase().includes(busca.toLowerCase())) {
      encontrado = dados;
      break;
    }
  }

  if (!encontrado) {
    return interaction.reply({
      content: `❌ Não foi encontrado nenhum inscrito com a identificação: \`${busca}\`.`,
      ephemeral: true
    });
  }

  encontrado.pago = true;
  encontrado.valorPago = configLS.taxaInscricaoEvento;
  encontrado.dataPagamento = new Date();

  // Atualiza o painel
  await atualizarPainelNoCanal(client);

  const embed = new EmbedBuilder()
    .setColor('#2ECC71')
    .setTitle('💰 PAGAMENTO CONFIRMADO COM SUCESSO!')
    .setDescription(
      `✅ O pagamento da inscrição do piloto **${encontrado.nome}** (ID #${encontrado.passaporte}) foi validado!\n\n` +
      `🚗 **Veículo:** ${encontrado.veiculo}\n` +
      `🏷️ **Placa:** \`${encontrado.placa}\`\n` +
      `💰 **Valor Recebido:** R$ 10.000\n` +
      `👤 **Validado por:** <@${interaction.user.id}>`
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

/**
 * 🏆 Exibir ou Registrar Pódio
 */
async function exibirPodio(interaction) {
  const { primeiro, segundo, terceiro } = db.podioEvento;

  const desc = 
    `🥇 **1º LUGAR (R$ 50.000):** ${primeiro ? `**${primeiro.nome}** — ${primeiro.veiculo}` : '*A definir pelos jurados*'}\n\n` +
    `🥈 **2º LUGAR (R$ 30.000):** ${segundo ? `**${segundo.nome}** — ${segundo.veiculo}` : '*A definir pelos jurados*'}\n\n` +
    `🥉 **3º LUGAR (R$ 20.000):** ${terceiro ? `**${terceiro.nome}** — ${terceiro.veiculo}` : '*A definir pelos jurados*'}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 **Total em Prêmios:** R$ 100.000\n` +
    `🔧 **Avaliação:** Estética, Performance, Originalidade e Presença.`;

  const embed = new EmbedBuilder()
    .setColor('#F59E0B')
    .setTitle('🏆 PÓDIO OFICIAL DO EVENTO AUTOMOTIVO')
    .setDescription(desc)
    .setFooter({ text: 'LS Customs • Premiações' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * 📊 Exibir Arrecadação Total
 */
async function exibirArrecadacao(interaction) {
  let totalPagos = 0;
  let arrecadado = 0;

  for (const item of db.inscritosEvento.values()) {
    if (item.pago) {
      totalPagos++;
      arrecadado += (item.valorPago || configLS.taxaInscricaoEvento);
    }
  }

  const embed = new EmbedBuilder()
    .setColor('#2ECC71')
    .setTitle('📊 ARRECADAÇÃO DA TESOURARIA DO EVENTO')
    .setDescription(
      `💰 **Total Arrecadado:** \`R$ ${arrecadado.toLocaleString('pt-BR')}\`\n` +
      `👥 **Inscrições Pagas:** \`${totalPagos}\` de \`${db.inscritosEvento.size}\` inscritos\n` +
      `🎟️ **Taxa Individual:** \`R$ 10.000\`\n` +
      `🏆 **Premiação Reservada:** \`R$ 100.000\``
    )
    .setFooter({ text: 'LS Customs • Tesouraria' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * 🎯 Roteador Principal de Interações de Eventos
 */
async function tratarInteracaoEvento(interaction, client) {
  // 1. Botões
  if (interaction.isButton()) {
    switch (interaction.customId) {
      case 'btn_ev_inscrever':
        return await abrirModalInscricao(interaction);
      case 'btn_ev_consultar':
        return await consultarInscricao(interaction);
      case 'btn_ev_lista':
        return await listarParticipantes(interaction);
      case 'btn_ev_confirmar_pagamento':
        return await abrirModalConfirmarPagamento(interaction);
      case 'btn_ev_podio':
        return await exibirPodio(interaction);
      case 'btn_ev_arrecadado':
        return await exibirArrecadacao(interaction);
    }
  }

  // 2. Modais
  if (interaction.isModalSubmit()) {
    switch (interaction.customId) {
      case 'modal_ev_inscricao':
        return await processarInscricao(interaction, client);
      case 'modal_ev_confirmar_pagamento':
        return await processarConfirmacaoPagamento(interaction, client);
    }
  }
}

module.exports = {
  gerarEmbedPainelEvento,
  gerarBotoesPainelEvento,
  atualizarPainelNoCanal,
  tratarInteracaoEvento,
  abrirModalInscricao,
  processarInscricao,
  consultarInscricao,
  listarParticipantes,
  abrirModalConfirmarPagamento,
  processarConfirmacaoPagamento,
  exibirPodio,
  exibirArrecadacao
};
