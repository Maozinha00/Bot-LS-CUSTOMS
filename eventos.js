/**
 * 📝 Cria e Exibe o Modal de Inscrição / Registro de Veículo (SIMPLIFICADO)
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
    .setLabel('ID / Passaporte')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: 793')
    .setRequired(true);

  const inputVeiculo = new TextInputBuilder()
    .setCustomId('ev_input_veiculo')
    .setLabel('Nome do Carro')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: Nissan Skyline GT-R R34')
    .setRequired(true);

  // Adicionando apenas os 3 campos solicitados
  modal.addComponents(
    new ActionRowBuilder().addComponents(inputNome),
    new ActionRowBuilder().addComponents(inputPassaporte),
    new ActionRowBuilder().addComponents(inputVeiculo)
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
  
  // Valores automáticos para campos removidos para manter compatibilidade com o DB
  const placa = "N/A"; 
  const custom = "Projeto não detalhado.";

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
      .setTitle('🏎️ NOVA INSCRIÇÃO REGISTRADA!')
      .setDescription(
        `👤 **Piloto:** <@${interaction.user.id}> (${nome})\n` +
        `🆔 **ID:** #${passaporte}\n` +
        `🚗 **Veículo:** **${veiculo}**\n\n` +
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
    content: `✅ **Parabéns ${nome}!** Sua inscrição com o veículo **${veiculo}** foi registrada!\n\n` +
             `💳 Para confirmar sua vaga, realize o pagamento da taxa de **R$ 10.000** com a equipe LS Customs.`,
    ephemeral: true
  });
}
