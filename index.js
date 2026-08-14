/**
 * ============================================================================
 * 🔧 BOT OFICIAL UNIFICADO — LS CUSTOMS (MECÂNICA) & SISTEMA DE AUSÊNCIAS
 * CÓDIGO COMPLETO (COMMONJS - require) - DISCORD.JS V14
 * ============================================================================
 * 
 * Funcionalidades Integradas:
 * 1. 🌴 Painel de Ausência & Folga (Comando !painel-ausencia e /painelausencia)
 *    - Canal do Painel: 1537852669853438032
 *    - Canal de Logs da Staff: 1537852751726510181
 *    - Modal popup interativo (Motivo, Data Início, Retorno)
 *    - Notificação direta para a Liderança da LS Customs com botão de Ciente
 * 2. 📥 Logs de Entrada no Servidor (Canal: 1536304188105949244)
 * 3. 📤 Logs de Saída no Servidor
 * 4. 📋 Recrutamento em 2 Etapas com 8 Perguntas & Aprovação com Auto-Nick e Cargo
 * 5. ⏱️ Sistema de Bate-Ponto Interativo (Entrada, Saída com Cálculo de Horas, Status)
 * 6. 🚨 Painel e Comando de Demissão (/demitir e /paineldemissao)
 * 7. 💰 Tabela de Preços (/tabela) & Frequência de Rádio (/radio)
 * 8. 🌐 Servidor Express Embutido para Uptime 24/7 (SquareCloud, Discloud, VPS)
 * 
 * 📦 Dependências necessárias:
 * npm install discord.js dotenv express
 * 
 * 🚀 Como Executar:
 * node bot.js
 */

require('dotenv').config();
const express = require('express');
const { 
  Client, 
  GatewayIntentBits, 
  Partials,
  EmbedBuilder, 
  SlashCommandBuilder, 
  REST, 
  Routes, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle,
  PermissionsBitField,
  Events
} = require('discord.js');

// ==========================================
// 🔑 CONFIGURAÇÕES & IDS DA LS CUSTOMS
// ==========================================
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN || 'SEU_TOKEN_AQUI';
const GUILD_ID = process.env.GUILD_ID || '1535806745816072245';
const PORT = process.env.PORT || 3001;

const CONFIG_LS = {
  // 🌴 CANAIS DE AUSÊNCIA (CONFIGURADOS CONFORME SOLICITADO)
  canalPainelAusenciaId: process.env.CANAL_PAINEL_AUSENCIA_ID || '1537852669853438032',
  canalLogsAusenciaId: process.env.CANAL_LOGS_AUSENCIA_ID || '1537852751726510181',

  // 🛠️ DEMAIS CANAIS DA MECÂNICA LS CUSTOMS
  canalLogsEntradaSaidaId: process.env.JOIN_LOGS_CHANNEL_ID || '1536304188105949244',
  canalLogsRecrutamentoId: process.env.LOGS_CHANNEL_ID || '1536308230936993792',
  canalPontoId: process.env.PONTO_CHANNEL_ID || '1536309622699466772',
  canalDemissaoId: process.env.DEMISSAO_CHANNEL_ID || '1536304188609400955',

  // 👑 CARGOS E PERMISSÕES
  cargosAdmins: [
    '1515125822795546715' // Cargo de Staff / Liderança LS Customs
  ],
  cargoRecrutaId: '1536304132980473896',

  // 📻 CONFIGURAÇÕES GERAIS
  radioFreq: process.env.RADIO_FREQ || '633',
  corLS: '#2ECC71',        // Verde LS Customs
  corAusencia: '#E67E22',  // Laranja Alerta/Ausência
  corAlerta: '#E74C3C',    // Vermelho Demissão/Saída
  bannerUrl: 'https://i.imgur.com/LfL8qHi.jpeg',
  rodape: 'LS CUSTOMS • Sistema Integrado de Gestão & Ausências • 2026'
};

// ==========================================
// 🌐 SERVIDOR WEB PARA UPTIME 24/7
// ==========================================
const app = express();
app.get('/', (req, res) => {
  res.send('🔧 Bot da Mecânica LS Customs & Painel de Ausências Online 24/7!');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 [LS CUSTOMS] Servidor Web de Uptime rodando na porta ${PORT}`);
});

// ==========================================
// 🤖 INICIALIZAÇÃO DO CLIENTE DISCORD
// ==========================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

// Armazenamento em memória para dados voláteis
const registrosTemporarios = new Map();
const pontosAtivos = new Map();

// ==========================================
// 📜 DEFINIÇÃO DOS COMANDOS SLASH
// ==========================================
const slashCommands = [
  new SlashCommandBuilder()
    .setName('painelausencia')
    .setDescription('Envia o Painel Oficial de Registro de Ausência & Folga da LS Customs'),

  new SlashCommandBuilder()
    .setName('painelregistro')
    .setDescription('Envia o painel de recrutamento para novos mecânicos na LS Customs'),

  new SlashCommandBuilder()
    .setName('painelponto')
    .setDescription('Envia o Painel Fixado de Bate-Ponto Interativo da LS Customs'),

  new SlashCommandBuilder()
    .setName('paineldemissao')
    .setDescription('Envia o Painel de Demissão da Liderança LS Customs'),

  new SlashCommandBuilder()
    .setName('demitir')
    .setDescription('Demitir integrante, remover cargos e expulsar do Discord da LS Customs')
    .addUserOption(opt => opt.setName('membro').setDescription('Membro a ser demitido').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo da demissão').setRequired(true))
    .addStringOption(opt => opt.setName('passaporte').setDescription('Passaporte/ID do mecânico').setRequired(false)),

  new SlashCommandBuilder()
    .setName('registrar')
    .setDescription('Registra um integrante na LS CUSTOMS (Altera Nick e Atribui Cargo)')
    .addUserOption(opt => opt.setName('membro').setDescription('Selecione o usuário').setRequired(true))
    .addStringOption(opt => opt.setName('nome').setDescription('Nome e Sobrenome In-Game').setRequired(true))
    .addStringOption(opt => opt.setName('passaporte').setDescription('ID / Passaporte').setRequired(true))
    .addStringOption(opt => opt.setName('cargo').setDescription('Cargo na LS CUSTOMS').setRequired(true)
      .addChoices(
        { name: '👑 LÍDER', value: '👑 LÍDER' },
        { name: '⭐ VICE-LÍDER', value: '⭐ VICE-LÍDER' },
        { name: '🛠️ GERENTE', value: '🛠️ GERENTE' },
        { name: '🔧 MEMBRO', value: '🔧 MEMBRO' },
        { name: '🔰 RECRUTA', value: '🔰 RECRUTA' }
      )),

  new SlashCommandBuilder()
    .setName('tabela')
    .setDescription('Exibe a tabela oficial de preços e peças da LS CUSTOMS'),

  new SlashCommandBuilder()
    .setName('radio')
    .setDescription('Informa a frequência oficial da rádio da mecânica')
].map(cmd => cmd.toJSON());

// ==========================================
// 🚀 EVENTO READY
// ==========================================
client.once(Events.ClientReady, async (c) => {
  console.log('====================================================');
  console.log(`🔥 [LS CUSTOMS] Bot Online com Sucesso como: ${c.user.tag}`);
  console.log(`🌴 Canal Painel de Ausência: #${CONFIG_LS.canalPainelAusenciaId}`);
  console.log(`📋 Canal Logs de Ausência:   #${CONFIG_LS.canalLogsAusenciaId}`);
  console.log(`📥 Canal Logs Entrada/Saída: #${CONFIG_LS.canalLogsEntradaSaidaId}`);
  console.log(`⏱️ Canal Bate-Ponto:         #${CONFIG_LS.canalPontoId}`);
  console.log('====================================================');

  c.user.setActivity(`🔧 LS CUSTOMS | Rádio ${CONFIG_LS.radioFreq} | !painel-ausencia`, { type: 0 });

  if (DISCORD_TOKEN && DISCORD_TOKEN !== 'SEU_TOKEN_AQUI') {
    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
    try {
      console.log('⚙️ Registrando comandos Slash no Discord...');
      if (GUILD_ID) {
        await rest.put(Routes.applicationGuildCommands(c.user.id, GUILD_ID), { body: slashCommands });
        console.log(`✅ Comandos Slash registrados no Servidor (ID: ${GUILD_ID})`);
      } else {
        await rest.put(Routes.applicationCommands(c.user.id), { body: slashCommands });
        console.log('✅ Comandos Slash globais registrados!');
      }
    } catch (err) {
      console.error('❌ Erro ao registrar comandos slash:', err.message);
    }
  }
});

// ==========================================
// 🌴 COMANDO COM PREFIXO: !painel-ausencia
// ==========================================
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;

  const lower = message.content.trim().toLowerCase();
  const isOwner = message.guild.ownerId === message.author.id;
  const isAdmin = message.member?.permissions.has(PermissionsBitField.Flags.Administrator) ||
                  message.member?.permissions.has(PermissionsBitField.Flags.ManageGuild);
  const isStaff = isOwner || isAdmin || (CONFIG_LS.cargosAdmins || []).some(r => r && message.member?.roles.cache.has(r));

  if (lower === '!painel-ausencia' || lower === '!painelausencia' || lower === '!painel_ausencia' || lower === '!ausencia') {
    if (!isStaff) {
      return message.reply({ content: '❌ **Permissão Negada:** Apenas a Liderança e Staff da LS Customs podem enviar este painel.' });
    }

    const embed = new EmbedBuilder()
      .setColor(CONFIG_LS.corAusencia)
      .setTitle('🌴 Painel de Registro de Ausência & Folga — LS CUSTOMS')
      .setDescription(
        `📢 **AVISO DE AUSÊNCIA • MECÂNICA LS CUSTOMS**\n\n` +
        `> 🌴 **Vai precisar se ausentar da cidade, expedientes ou eventos da oficina?**\n` +
        `> ⚠️ Registre obrigatoriamente sua ausência para avisar a **Liderança da LS Customs** e **evitar advertências ou perda da vaga por inatividade**.\n\n` +
        `👇 *Clique no botão abaixo para preencher o formulário com o motivo, data de início e retorno previsto!*`
      )
      .setImage(CONFIG_LS.bannerUrl)
      .setFooter({ text: CONFIG_LS.rodape })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_abrir_modal_ausencia')
        .setLabel('Registrar Ausência / Folga')
        .setEmoji('🌴')
        .setStyle(ButtonStyle.Secondary)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
    if (message.deletable) await message.delete().catch(() => null);
  }
});

// ==========================================
// 📥 LOGS DE ENTRADA (GUILD MEMBER ADD)
// ==========================================
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const canal = await member.guild.channels.fetch(CONFIG_LS.canalLogsEntradaSaidaId).catch(() => null);
    if (canal && canal.isTextBased()) {
      const createdSecs = Math.floor(member.user.createdTimestamp / 1000);

      const joinEmbed = new EmbedBuilder()
        .setTitle('📥 NOVO INTEGRANTE NO SERVIDOR — LS CUSTOMS')
        .setDescription(
          `👋 **Boas-vindas à oficina mecânica LS CUSTOMS!**\n\n` +
          `👤 **Membro:** ${member.user} (${member.user.tag})\n` +
          `🆔 **ID Discord:** \`${member.user.id}\`\n` +
          `📅 **Conta criada:** <t:${createdSecs}:R> (<t:${createdSecs}:f>)\n` +
          `👥 **Total de Membros no Servidor:** **${member.guild.memberCount}**\n\n` +
          `📌 *Acesse o canal de recrutamento e preencha o formulário para se tornar um mecânico oficial!*`
        )
        .setColor(CONFIG_LS.corLS)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: 'Logs de Entrada • LS CUSTOMS' })
        .setTimestamp();

      await canal.send({ embeds: [joinEmbed] });
    }
  } catch (err) {
    console.error('❌ Erro no log de entrada:', err);
  }
});

// ==========================================
// 📤 LOGS DE SAÍDA (GUILD MEMBER REMOVE)
// ==========================================
client.on(Events.GuildMemberRemove, async (member) => {
  try {
    const canal = await member.guild.channels.fetch(CONFIG_LS.canalLogsEntradaSaidaId).catch(() => null);
    if (canal && canal.isTextBased()) {
      const leaveEmbed = new EmbedBuilder()
        .setTitle('📤 MEMBRO SAIU DO SERVIDOR — LS CUSTOMS')
        .setDescription(
          `🚪 **Um integrante saiu da oficina mecânica.**\n\n` +
          `👤 **Membro:** ${member.user} (${member.user.tag})\n` +
          `🆔 **ID Discord:** \`${member.user.id}\`\n` +
          `👥 **Total Restante:** **${member.guild.memberCount} membros**`
        )
        .setColor(CONFIG_LS.corAlerta)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: 'Logs de Saída • LS CUSTOMS' })
        .setTimestamp();

      await canal.send({ embeds: [leaveEmbed] });
    }
  } catch (err) {
    console.error('❌ Erro no log de saída:', err);
  }
});

// ==========================================
// ⚡ PROCESSAMENTO DE INTERAÇÕES
// ==========================================
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // ----------------------------------------------------
    // 🌴 1. SISTEMA DE AUSÊNCIA: ABRIR MODAL
    // ----------------------------------------------------
    if (interaction.isButton() && interaction.customId === 'btn_abrir_modal_ausencia') {
      const modal = new ModalBuilder()
        .setCustomId('modal_envio_ausencia')
        .setTitle('LS CUSTOMS — Formulário de Ausência');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('motivo')
            .setLabel('Motivo da Ausência / Folga')
            .setPlaceholder('Ex: Viagem a trabalho / Semana de provas / Manutenção do PC / Problemas pessoais')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('data_inicio')
            .setLabel('Data de Início da Ausência')
            .setPlaceholder('Ex: 15/08/2026')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('previsao_retorno')
            .setLabel('Previsão de Retorno à Oficina')
            .setPlaceholder('Ex: 22/08/2026')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

      return await interaction.showModal(modal);
    }

    // ----------------------------------------------------
    // 🌴 2. SISTEMA DE AUSÊNCIA: ENVIO DO MODAL
    // ----------------------------------------------------
    if (interaction.isModalSubmit() && interaction.customId === 'modal_envio_ausencia') {
      const motivo = interaction.fields.getTextInputValue('motivo');
      const inicio = interaction.fields.getTextInputValue('data_inicio');
      const retorno = interaction.fields.getTextInputValue('previsao_retorno');

      const canalLogs = await interaction.guild.channels.fetch(CONFIG_LS.canalLogsAusenciaId).catch(() => null);

      const embedStaff = new EmbedBuilder()
        .setColor(CONFIG_LS.corAusencia)
        .setTitle('🌴 Novo Registro de Ausência • LS CUSTOMS')
        .setDescription(
          `Um mecânico acaba de registrar uma ausência/folga oficial no sistema.\n\n` +
          `👤 **Membro:** <@${interaction.user.id}> (${interaction.user.tag})\n` +
          `🆔 **ID Discord:** \`${interaction.user.id}\`\n` +
          `📅 **Data de Início:** \`${inicio}\`\n` +
          `🔄 **Previsão de Retorno:** \`${retorno}\`\n\n` +
          `📝 **Motivo Declarado:**\n\`\`\`\n${motivo}\n\`\`\``
        )
        .setImage(CONFIG_LS.bannerUrl)
        .setFooter({ text: CONFIG_LS.rodape })
        .setTimestamp();

      const rowStaff = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`btn_ausencia_ciente_${interaction.user.id}`)
          .setLabel('✅ Ciente / Aprovado pela Liderança')
          .setStyle(ButtonStyle.Success)
      );

      if (canalLogs && canalLogs.isTextBased()) {
        await canalLogs.send({ embeds: [embedStaff], components: [rowStaff] });
      }

      return interaction.reply({
        content: `✅ **Sua ausência foi registrada com sucesso, <@${interaction.user.id}>!**\n` +
                 `📌 A **Liderança da LS CUSTOMS** já foi notificada no canal de logs da Staff.\n` +
                 `*Bom descanso/resolução e esperamos seu retorno em \`${retorno}\`!*`,
        ephemeral: true
      });
    }

    // Ação da Liderança no log de ausência (Marcar Ciente)
    if (interaction.isButton() && interaction.customId.startsWith('btn_ausencia_ciente_')) {
      const targetMecId = interaction.customId.replace('btn_ausencia_ciente_', '');
      const staffUser = interaction.user;

      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('btn_ausencia_done')
          .setLabel(`✅ Ciente por @${staffUser.username}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

      await interaction.update({ components: [disabledRow] });
      return interaction.followUp({ content: `✅ Você marcou ciente na ausência de <@${targetMecId}>.`, ephemeral: true });
    }

    // ----------------------------------------------------
    // 📋 3. RECRUTAMENTO LS CUSTOMS (ETAPA 1/2)
    // ----------------------------------------------------
    if (interaction.isButton() && interaction.customId === 'btn_solicitar_registro') {
      const modal = new ModalBuilder()
        .setCustomId('modal_registro_etapa1')
        .setTitle('LS CUSTOMS — Recrutamento (1/2)');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('reg_nome')
            .setLabel('1. Nome e Sobrenome In-Game')
            .setPlaceholder('Ex: Carlos Mendez')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('reg_passaporte')
            .setLabel('2. Passaporte / ID In-Game')
            .setPlaceholder('Ex: #1234')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('reg_idade')
            .setLabel('3. Idade (Requisito mínimo)')
            .setPlaceholder('Ex: 18')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('reg_experiencia')
            .setLabel('4. Experiência como mecânico?')
            .setPlaceholder('Sim / Não. Se sim, em qual cidade?')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

      return await interaction.showModal(modal);
    }

    // SUBMIT ETAPA 1
    if (interaction.isModalSubmit() && interaction.customId === 'modal_registro_etapa1') {
      const nome = interaction.fields.getTextInputValue('reg_nome');
      const passaporte = interaction.fields.getTextInputValue('reg_passaporte');
      const idade = interaction.fields.getTextInputValue('reg_idade');
      const experiencia = interaction.fields.getTextInputValue('reg_experiencia');

      registrosTemporarios.set(interaction.user.id, { nome, passaporte, idade, experiencia });

      const stepEmbed = new EmbedBuilder()
        .setTitle('📋 LS CUSTOMS — RECRUTAMENTO (ETAPA 2/2)')
        .setDescription(
          `Primeira etapa preenchida com sucesso:\n\n` +
          `👤 **Nome**: ${nome}\n` +
          `🆔 **Passaporte**: #${passaporte}\n` +
          `🎂 **Idade**: ${idade}\n` +
          `🔧 **Experiência**: ${experiencia}\n\n` +
          `👉 **Clique no botão abaixo para responder às últimas 4 perguntas e finalizar!**`
        )
        .setColor(CONFIG_LS.corLS);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('btn_continuar_etapa2')
          .setLabel('📝 Continuar Formulário (Etapa 2)')
          .setStyle(ButtonStyle.Success)
      );

      return interaction.reply({ embeds: [stepEmbed], components: [row], ephemeral: true });
    }

    // ABRIR ETAPA 2
    if (interaction.isButton() && interaction.customId === 'btn_continuar_etapa2') {
      const modal = new ModalBuilder()
        .setCustomId('modal_registro_etapa2')
        .setTitle('LS CUSTOMS — Recrutamento (2/2)');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('reg_porque')
            .setLabel('5. Por que quer entrar na LS CUSTOMS?')
            .setPlaceholder('Descreva o que te motiva a trabalhar na mecânica...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('reg_disponibilidade')
            .setLabel('6. Qual a sua disponibilidade de horários?')
            .setPlaceholder('Ex: Tarde e Noite (18h às 23h)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('reg_regras')
            .setLabel('7. Leu as regras e aceita bater ponto?')
            .setPlaceholder('Sim, concordo com todas as diretrizes')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('reg_situacao')
            .setLabel('8. Como lidaria com cliente estressado?')
            .setPlaceholder('Explique como manteria a calma e postura profissional...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        )
      );

      return await interaction.showModal(modal);
    }

    // SUBMIT FINAL ETAPA 2
    if (interaction.isModalSubmit() && interaction.customId === 'modal_registro_etapa2') {
      const temp = registrosTemporarios.get(interaction.user.id) || { nome: 'Desconhecido', passaporte: '0000', idade: 'N/A', experiencia: 'N/A' };
      const porque = interaction.fields.getTextInputValue('reg_porque');
      const disponibilidade = interaction.fields.getTextInputValue('reg_disponibilidade');
      const regras = interaction.fields.getTextInputValue('reg_regras');
      const situacao = interaction.fields.getTextInputValue('reg_situacao');

      registrosTemporarios.delete(interaction.user.id);
      const novoNick = `|Recruta| ${temp.nome} | #${temp.passaporte}`.substring(0, 32);

      await interaction.reply({
        content: '✅ **Formulário enviado com sucesso!** A Liderança da LS Customs irá analisar suas respostas.',
        ephemeral: true
      });

      try {
        const canalLogs = await interaction.guild.channels.fetch(CONFIG_LS.canalLogsRecrutamentoId).catch(() => null) || interaction.channel;

        const logEmbed = new EmbedBuilder()
          .setTitle('📋 NOVA SOLICITAÇÃO DE RECRUTAMENTO — LS CUSTOMS')
          .setDescription(
            `📌 **CANDIDATURA PENDENTE DE AVALIAÇÃO**\n\n` +
            `👤 **1. Nome In-Game**: ${temp.nome}\n` +
            `🆔 **2. Passaporte**: #${temp.passaporte}\n` +
            `🎂 **3. Idade**: ${temp.idade}\n` +
            `🔧 **4. Experiência**: ${temp.experiencia}\n` +
            `🎯 **5. Motivo**: ${porque}\n` +
            `⏰ **6. Disponibilidade**: ${disponibilidade}\n` +
            `📜 **7. Aceita Regras & Ponto**: ${regras}\n` +
            `🤝 **8. Resolução de Conflitos**: ${situacao}\n\n` +
            `🎮 **DISCORD**: <@${interaction.user.id}> (${interaction.user.tag})\n` +
            `🏷️ **NICK SUGERIDO**: \`${novoNick}\``
          )
          .setColor('#F1C40F')
          .setFooter({ text: 'Recrutamento • LS CUSTOMS' })
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`btn_aprovar_${interaction.user.id}_${encodeURIComponent(temp.nome)}_${temp.passaporte}`)
            .setLabel('✅ Aprovar e Setar Tag')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`btn_recusar_${interaction.user.id}`)
            .setLabel('❌ Recusar')
            .setStyle(ButtonStyle.Danger)
        );

        if (canalLogs) {
          await canalLogs.send({ embeds: [logEmbed], components: [row] });
        }
      } catch (err) {
        console.error('Erro ao enviar log de recrutamento:', err);
      }
      return;
    }

    // APROVAR OU RECUSAR RECRUTA
    if (interaction.isButton() && (interaction.customId.startsWith('btn_aprovar_') || interaction.customId.startsWith('btn_recusar_'))) {
      const isApprove = interaction.customId.startsWith('btn_aprovar_');
      const parts = interaction.customId.split('_');
      const targetUserId = parts[2];
      const guild = interaction.guild;
      const staffUser = interaction.user;

      if (isApprove) {
        const nome = decodeURIComponent(parts[3] || '');
        const passaporte = parts[4] || '';
        const novoNick = `|Recruta| ${nome} | #${passaporte}`.substring(0, 32);

        try {
          const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
          if (targetMember) {
            if (targetMember.manageable) {
              await targetMember.setNickname(novoNick).catch(() => {});
            }
            const cargo = guild.roles.cache.get(CONFIG_LS.cargoRecrutaId) || guild.roles.cache.find(r => r.name.toUpperCase().includes('RECRUTA'));
            if (cargo) {
              await targetMember.roles.add(cargo).catch(() => {});
            }
          }
        } catch (e) {}

        const approvedEmbed = new EmbedBuilder()
          .setTitle('✅ RECRUTAMENTO APROVADO — LS CUSTOMS')
          .setDescription(`🎉 <@${targetUserId}> foi aprovado por <@${staffUser.id}>!\n\n🏷️ **Nick Atribuído**: \`${novoNick}\``)
          .setColor(CONFIG_LS.corLS)
          .setTimestamp();

        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('btn_done').setLabel(`✅ Aprovado por @${staffUser.username}`).setStyle(ButtonStyle.Success).setDisabled(true)
        );

        await interaction.update({ embeds: [approvedEmbed], components: [disabledRow] });
      } else {
        const rejectedEmbed = new EmbedBuilder()
          .setTitle('❌ RECRUTAMENTO RECUSADO — LS CUSTOMS')
          .setDescription(`🎮 A candidatura de <@${targetUserId}> foi recusada por <@${staffUser.id}>.`)
          .setColor(CONFIG_LS.corAlerta)
          .setTimestamp();

        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('btn_done').setLabel(`❌ Recusado por @${staffUser.username}`).setStyle(ButtonStyle.Danger).setDisabled(true)
        );

        await interaction.update({ embeds: [rejectedEmbed], components: [disabledRow] });
      }
      return;
    }

    // ----------------------------------------------------
    // ⏱️ 4. BATE-PONTO INTERATIVO
    // ----------------------------------------------------
    if (interaction.isButton() && interaction.customId.startsWith('btn_ponto_')) {
      const userId = interaction.user.id;
      const now = new Date();

      if (interaction.customId === 'btn_ponto_entrar') {
        if (pontosAtivos.has(userId)) {
          const data = pontosAtivos.get(userId);
          const mins = Math.floor((now.getTime() - data.startTime.getTime()) / 60000);
          return interaction.reply({ content: `⚠️ Você já está em serviço! (${mins}m atrás)`, ephemeral: true });
        }

        pontosAtivos.set(userId, { startTime: now });

        const embed = new EmbedBuilder()
          .setTitle('🟢 BATE-PONTO INICIADO — LS CUSTOMS')
          .setDescription(
            `👤 **Mecânico**: <@${userId}>\n` +
            `⏰ **Entrada**: \`${now.toLocaleTimeString('pt-BR')}\`\n` +
            `📻 **Rádio Oficial**: **${CONFIG_LS.radioFreq}**\n\n` +
            `⚠️ *Lembre-se de estar fardado na oficina e em sintonia na rádio! Bom turno!*`
          )
          .setColor(CONFIG_LS.corLS)
          .setTimestamp();

        try {
          const pontoChannel = await interaction.guild.channels.fetch(CONFIG_LS.canalPontoId).catch(() => null) || interaction.channel;
          if (pontoChannel) {
            const entryLog = new EmbedBuilder()
              .setTitle('🟢 ENTRADA EM SERVIÇO')
              .setDescription(`👤 <@${userId}> (${interaction.user.tag}) bateu ponto de entrada às \`${now.toLocaleTimeString('pt-BR')}\`.`)
              .setColor(CONFIG_LS.corLS)
              .setTimestamp();

            await pontoChannel.send({ embeds: [entryLog] });
          }
        } catch (e) {}

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (interaction.customId === 'btn_ponto_sair') {
        if (!pontosAtivos.has(userId)) {
          return interaction.reply({ content: `⚠️ Você não possui um ponto ativo no momento!`, ephemeral: true });
        }

        const data = pontosAtivos.get(userId);
        pontosAtivos.delete(userId);

        const diffSecs = Math.floor((now.getTime() - data.startTime.getTime()) / 1000);
        const hours = Math.floor(diffSecs / 3600);
        const mins = Math.floor((diffSecs % 3600) / 60);
        const secs = diffSecs % 60;
        const totalStr = `${hours > 0 ? hours + 'h ' : ''}${mins}m ${secs}s`;

        const logEmbed = new EmbedBuilder()
          .setTitle('🔴 BATE-PONTO FINALIZADO — LS CUSTOMS')
          .setDescription(
            `👤 **Mecânico**: <@${userId}>\n` +
            `⏰ **Entrada**: \`${data.startTime.toLocaleTimeString('pt-BR')}\`\n` +
            `⌛ **Saída**: \`${now.toLocaleTimeString('pt-BR')}\`\n` +
            `⏱️ **Tempo Total de Turno**: \`${totalStr}\`\n\n` +
            `✅ *Serviço registrado na folha de ponto. Bom descanso!*`
          )
          .setColor(CONFIG_LS.corAlerta)
          .setTimestamp();

        try {
          const pontoChannel = await interaction.guild.channels.fetch(CONFIG_LS.canalPontoId).catch(() => null) || interaction.channel;
          if (pontoChannel) {
            await pontoChannel.send({ embeds: [logEmbed] });
          }
        } catch (e) {}

        return interaction.reply({ embeds: [logEmbed], ephemeral: true });
      }

      if (interaction.customId === 'btn_ponto_status') {
        if (pontosAtivos.has(userId)) {
          const data = pontosAtivos.get(userId);
          const mins = Math.floor((now.getTime() - data.startTime.getTime()) / 60000);
          return interaction.reply({ content: `🟢 **EM SERVIÇO:** Desde \`${data.startTime.toLocaleTimeString('pt-BR')}\` (${mins}m decorridos)`, ephemeral: true });
        }
        return interaction.reply({ content: `🔴 **FORA DE SERVIÇO:** Nenhum ponto ativo registrado.`, ephemeral: true });
      }

      if (interaction.customId === 'btn_ponto_online') {
        const total = pontosAtivos.size;
        if (total === 0) return interaction.reply({ content: '📊 Nenhum mecânico em serviço no momento.', ephemeral: true });

        let listStr = `📊 **MECÂNICOS EM SERVIÇO (${total})**\n\n`;
        for (const [id, item] of pontosAtivos.entries()) {
          const mins = Math.floor((now.getTime() - item.startTime.getTime()) / 60000);
          listStr += `• <@${id}> — Entrada: \`${item.startTime.toLocaleTimeString('pt-BR')}\` (${mins}m)\n`;
        }
        return interaction.reply({ content: listStr, ephemeral: true });
      }
    }

    // ----------------------------------------------------
    // 📜 5. COMANDOS SLASH (CHAT INPUT)
    // ----------------------------------------------------
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, user, guild } = interaction;

    // /painelausencia
    if (commandName === 'painelausencia') {
      const isOwner = guild.ownerId === user.id;
      const isAdmin = interaction.member?.permissions.has(PermissionsBitField.Flags.Administrator) ||
                      interaction.member?.permissions.has(PermissionsBitField.Flags.ManageGuild);
      const isStaff = isOwner || isAdmin || (CONFIG_LS.cargosAdmins || []).some(r => r && interaction.member?.roles.cache.has(r));

      if (!isStaff) {
        return interaction.reply({ content: '❌ Apenas Staff/Liderança podem usar este comando.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(CONFIG_LS.corAusencia)
        .setTitle('🌴 Painel de Registro de Ausência & Folga — LS CUSTOMS')
        .setDescription(
          `📢 **AVISO DE AUSÊNCIA • MECÂNICA LS CUSTOMS**\n\n` +
          `> 🌴 **Vai precisar se ausentar da cidade, expedientes ou eventos da oficina?**\n` +
          `> ⚠️ Registre obrigatoriamente sua ausência para avisar a **Liderança da LS Customs** e **evitar advertências ou perda da vaga por inatividade**.\n\n` +
          `👇 *Clique no botão abaixo para preencher o formulário com o motivo, data de início e retorno previsto!*`
        )
        .setImage(CONFIG_LS.bannerUrl)
        .setFooter({ text: CONFIG_LS.rodape })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('btn_abrir_modal_ausencia')
          .setLabel('Registrar Ausência / Folga')
          .setEmoji('🌴')
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.channel.send({ embeds: [embed], components: [row] });
      return interaction.reply({ content: '✅ Painel de Ausência enviado no canal!', ephemeral: true });
    }

    // /painelregistro
    if (commandName === 'painelregistro') {
      const embed = new EmbedBuilder()
        .setTitle('🔧 RECRUTAMENTO — LS CUSTOMS')
        .setDescription(
          `Quer fazer parte da equipe de mecânicos da **LS CUSTOMS**?\n\n` +
          `👉 **Clique no botão abaixo para responder ao formulário oficial de recrutamento (8 perguntas):**`
        )
        .setColor(CONFIG_LS.corLS)
        .setFooter({ text: 'LS CUSTOMS' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_solicitar_registro').setLabel('📋 Responder Formulário').setStyle(ButtonStyle.Primary)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    // /painelponto
    if (commandName === 'painelponto') {
      const embed = new EmbedBuilder()
        .setTitle('⏱️ LS CUSTOMS — BATE-PONTO')
        .setDescription(`Gerencie seu horário em serviço utilizando os botões abaixo:\n\n📻 **Rádio Oficial:** **${CONFIG_LS.radioFreq}**`)
        .setColor(CONFIG_LS.corLS);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_ponto_entrar').setLabel('🟢 Entrar em Serviço').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_ponto_sair').setLabel('🔴 Sair de Serviço').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('btn_ponto_status').setLabel('📋 Meu Status').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('btn_ponto_online').setLabel('📊 Mecânicos On').setStyle(ButtonStyle.Primary)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    // /paineldemissao
    if (commandName === 'paineldemissao') {
      const embed = new EmbedBuilder()
        .setTitle('🚪 LS CUSTOMS — PAINEL DE DEMISSÃO')
        .setDescription(`🚨 **Acesso restrito para a Liderança / Gerência**\nRemoção imediata de cargos e expulsão do Discord.`)
        .setColor(CONFIG_LS.corAlerta);

      return interaction.reply({ embeds: [embed] });
    }

    // /demitir
    if (commandName === 'demitir') {
      const targetUser = options.getUser('membro', true);
      const motivo = options.getString('motivo', true);
      const passaporte = options.getString('passaporte') || 'N/A';

      const member = await guild.members.fetch(targetUser.id).catch(() => null);
      let statusMsg = '✅ Cargos removidos e expulso do Discord';

      if (member) {
        const rolesToRemove = member.roles.cache.filter(r => r.name !== '@everyone');
        if (rolesToRemove.size > 0) await member.roles.remove(rolesToRemove).catch(() => {});
        if (member.kickable) {
          await member.kick(`Demitido por ${user.tag}: ${motivo}`).catch(() => { statusMsg = '⚠️ Erro ao expulsar'; });
        } else {
          statusMsg = '⚠️ Cargo superior ou igual ao Bot';
        }
      }

      try {
        const demChannel = await guild.channels.fetch(CONFIG_LS.canalDemissaoId).catch(() => null) || interaction.channel;
        const demEmbed = new EmbedBuilder()
          .setTitle('🔴 REGISTRO DE DEMISSÃO — LS CUSTOMS')
          .setDescription(
            `👤 **Membro**: <@${targetUser.id}>\n` +
            `🆔 **Passaporte**: #${passaporte}\n` +
            `👑 **Demitido por**: <@${user.id}>\n` +
            `📝 **Motivo**: ${motivo}\n` +
            `🚪 **Resultado**: ${statusMsg}`
          )
          .setColor(CONFIG_LS.corAlerta)
          .setTimestamp();

        if (demChannel) await demChannel.send({ embeds: [demEmbed] });
      } catch (e) {}

      return interaction.reply({ content: `🚨 Demissão de <@${targetUser.id}> concluída.`, ephemeral: true });
    }

    // /registrar
    if (commandName === 'registrar') {
      const targetUser = options.getUser('membro', true);
      const nome = options.getString('nome', true);
      const passaporte = options.getString('passaporte', true);
      const cargo = options.getString('cargo', true);

      const member = await guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) return interaction.reply({ content: '❌ Usuário não encontrado no servidor!', ephemeral: true });

      const novoNick = `|Recruta| ${nome} | #${passaporte}`.substring(0, 32);

      if (member.manageable) await member.setNickname(novoNick).catch(() => {});
      const discordRole = guild.roles.cache.get(CONFIG_LS.cargoRecrutaId) || guild.roles.cache.find(r => r.name.toUpperCase().includes(cargo.toUpperCase()));
      if (discordRole) await member.roles.add(discordRole).catch(() => {});

      return interaction.reply({ content: `✅ <@${targetUser.id}> registrado como **${cargo}** com o nick \`${novoNick}\`!` });
    }

    // /tabela
    if (commandName === 'tabela') {
      const embed = new EmbedBuilder()
        .setTitle('💰 TABELA OFICIAL DE PREÇOS — LS CUSTOMS')
        .setDescription(
          `**🛠️ ITENS DE REPARO**\n` +
          `• Kit Reparo Básico: R$ 1.000\n` +
          `• Kit Reparo Avançado: R$ 2.500\n` +
          `• Chave Inglesa: R$ 2.000\n` +
          `• Pneu Sobressalente: R$ 500\n\n` +
          `**⚙️ PERFORMANCE & TUNING**\n` +
          `• Motor N1: R$ 12.000 | N2: R$ 18.000 | N3: R$ 22.000\n` +
          `• Freios / Suspensão: R$ 8.000\n` +
          `• Instalação de Turbo: R$ 15.000\n\n` +
          `**🎨 CUSTOMIZAÇÃO VISUAL**\n` +
          `• Pintura Primária: R$ 1.500 | Camaleão: R$ 2.500\n` +
          `• Farol Xenon: R$ 3.500 | Neon Completo: R$ 4.000`
        )
        .setColor('#F1C40F');

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // /radio
    if (commandName === 'radio') {
      return interaction.reply({ content: `📻 **Frequência Oficial da Rádio LS CUSTOMS:** **${CONFIG_LS.radioFreq}**` });
    }

  } catch (err) {
    console.error('❌ Erro na interação:', err);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Ocorreu um erro ao executar este comando.', ephemeral: true }).catch(() => {});
    }
  }
});

// ==========================================
// 🚀 LOGIN DO BOT NO DISCORD
// ==========================================
client.login(DISCORD_TOKEN).catch(err => {
  console.error('❌ ERRO AO FAZER LOGIN NO DISCORD:', err.message);
  console.log('💡 DICA: Verifique se configurou seu DISCORD_TOKEN no arquivo .env!');
});
