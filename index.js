require('dotenv').config();
const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  SlashCommandBuilder, 
  REST, 
  Routes, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle 
} = require('discord.js');

// 🔑 CONFIGURAÇÕES (Defina no arquivo .env ou substitua abaixo)
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'COLE_SEU_TOKEN_AQUI';
const GUILD_ID = process.env.GUILD_ID || ''; // ID do Servidor Discord
const LOGS_CHANNEL_ID = process.env.LOGS_CHANNEL_ID || '';
const PONTO_CHANNEL_ID = process.env.PONTO_CHANNEL_ID || '';
const DEMISSAO_CHANNEL_ID = process.env.DEMISSAO_CHANNEL_ID || '';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Banco de dados em memória para bate-ponto
const pontosAtivos = new Map();

// 📜 REGISTRO DOS COMANDOS SLASH
const commands = [
  new SlashCommandBuilder()
    .setName('paineldemissao')
    .setDescription('Envia o Painel Fixado de Demissão para a Liderança'),

  new SlashCommandBuilder()
    .setName('painelponto')
    .setDescription('Envia o Painel Fixado de Bate-Ponto no canal'),

  new SlashCommandBuilder()
    .setName('demitir')
    .setDescription('Demitir integrante, remover cargos e exonerar do Discord')
    .addUserOption(opt => opt.setName('membro').setDescription('Membro a demitir').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo da demissão').setRequired(true))
    .addStringOption(opt => opt.setName('passaporte').setDescription('Passaporte/ID In-Game').setRequired(false)),

  new SlashCommandBuilder()
    .setName('painelregistro')
    .setDescription('Envia o painel fixo de solicitação de registro de recruta')
];

// 🚀 EVENTO DE INICIALIZAÇÃO
client.once('ready', async () => {
  console.log(`🔥 BOT ONLINE! Conectado como: ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  try {
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), { body: commands });
      console.log('✅ Comandos Slash registrados no servidor!');
    } else {
      await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
      console.log('✅ Comandos Slash registrados globalmente!');
    }
  } catch (error) {
    console.error('❌ Erro ao registrar comandos:', error);
  }
});

// ⚡ INTERAÇÕES DE COMANDOS, BOTÕES E MODAIS
client.on('interactionCreate', async interaction => {
  try {
    // 1️⃣ COMANDO: /paineldemissao
    if (interaction.isChatInputCommand() && interaction.commandName === 'paineldemissao') {
      const embed = new EmbedBuilder()
        .setTitle('🚪 PAINEL OFICIAL DE DEMISSÃO & EXONERAÇÃO')
        .setDescription('🚨 **PAINEL DA LIDERANÇA / GERÊNCIA**\nUtilize este painel para processar o desligamento formal de integrantes.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• **Remoção de cargos** automática no Discord\n• **Registro de auditoria** gravado no canal de logs\n• **Notificação formal** de desligamento\n\nClique no botão abaixo para abrir o formulário:')
        .setColor('#e74c3c')
        .setFooter({ text: 'Mecânica Discord System' });

      const btn = new ButtonBuilder()
        .setCustomId('btn_solicitar_demissao')
        .setLabel('🚨 Processar Demissão')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(btn);
      return await interaction.reply({ embeds: [embed], components: [row] });
    }

    // 2️⃣ BOTÃO: PROCESSAR DEMISSÃO (Abre Modal)
    if (interaction.isButton() && interaction.customId === 'btn_solicitar_demissao') {
      const modal = new ModalBuilder()
        .setCustomId('modal_demissao')
        .setTitle('Formulário de Demissão');

      const inputMembro = new TextInputBuilder()
        .setCustomId('dem_membro')
        .setLabel('ID do Discord do Membro')
        .setPlaceholder('Ex: 8492049201948201')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputMotivo = new TextInputBuilder()
        .setCustomId('dem_motivo')
        .setLabel('Motivo da Demissão')
        .setPlaceholder('Descreva o motivo (Inatividade, Infração de regras, etc.)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(inputMembro),
        new ActionRowBuilder().addComponents(inputMotivo)
      );

      return await interaction.showModal(modal);
    }

    // 3️⃣ MODAL SUBMIT: DEMISSÃO
    if (interaction.isModalSubmit() && interaction.customId === 'modal_demissao') {
      await interaction.deferReply({ ephemeral: true });

      const targetId = interaction.fields.getTextInputValue('dem_membro').trim();
      const motivo = interaction.fields.getTextInputValue('dem_motivo');

      const member = await interaction.guild.members.fetch(targetId).catch(() => null);

      if (!member) {
        return await interaction.editReply(`❌ Membro com ID \`${targetId}\` não encontrado no servidor.`);
      }

      // Remover cargos
      await member.roles.set([]).catch(e => console.error('Erro ao remover cargos:', e));

      const embedLog = new EmbedBuilder()
        .setTitle('🔴 EXONERAÇÃO / DEMISSÃO DE INTEGRANTE')
        .setDescription(`👤 **INTEGRANTE**: ${member.user.tag} (<@${member.id}>)\n🆔 **DISCORD ID**: \`${member.id}\`\n👑 **EXECUTADO POR**: <@${interaction.user.id}>\n📝 **MOTIVO**: ${motivo}`)
        .setColor('#e74c3c')
        .setTimestamp();

      // Enviar log no canal
      const logChannel = DEMISSAO_CHANNEL_ID ? interaction.guild.channels.cache.get(DEMISSAO_CHANNEL_ID) : interaction.channel;
      if (logChannel) {
        await logChannel.send({ embeds: [embedLog] });
      }

      return await interaction.editReply(`✅ **${member.user.tag}** foi demitido(a) com sucesso e os cargos foram removidos.`);
    }

    // 4️⃣ COMANDO DIRECTO: /demitir
    if (interaction.isChatInputCommand() && interaction.commandName === 'demitir') {
      const user = interaction.options.getUser('membro');
      const motivo = interaction.options.getString('motivo');
      const passaporte = interaction.options.getString('passaporte') || 'Não Informado';

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (member) {
        await member.roles.set([]).catch(() => null);
      }

      const embed = new EmbedBuilder()
        .setTitle('🔴 DEMISSÃO REGISTRADA')
        .setDescription(`👤 **MEMBRO**: <@${user.id}>\n🆔 **PASSAPORTE**: #${passaporte}\n📝 **MOTIVO**: ${motivo}\n👑 **POR**: <@${interaction.user.id}>`)
        .setColor('#e74c3c')
        .setTimestamp();

      return await interaction.reply({ embeds: [embed] });
    }

    // 5️⃣ COMANDO: /painelponto
    if (interaction.isChatInputCommand() && interaction.commandName === 'painelponto') {
      const embed = new EmbedBuilder()
        .setTitle('⏱️ REGISTRO DE PONTO DA EQUIPE')
        .setDescription('Utilize os botões abaixo para gerenciar seu turno de serviço.')
        .setColor('#2ecc71');

      const btnEntrar = new ButtonBuilder().setCustomId('btn_ponto_entrar').setLabel('🟢 Entrar em Serviço').setStyle(ButtonStyle.Success);
      const btnSair = new ButtonBuilder().setCustomId('btn_ponto_sair').setLabel('🔴 Sair de Serviço').setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(btnEntrar, btnSair);
      return await interaction.reply({ embeds: [embed], components: [row] });
    }

    // 6️⃣ BATE-PONTO: ENTRAR / SAIR
    if (interaction.isButton() && interaction.customId === 'btn_ponto_entrar') {
      pontosAtivos.set(interaction.user.id, Date.now());
      return await interaction.reply({ content: '🟢 Você entrou em serviço com sucesso!', ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId === 'btn_ponto_sair') {
      const inicio = pontosAtivos.get(interaction.user.id);
      if (!inicio) {
        return await interaction.reply({ content: '⚠️ Você não possui um turno aberto no momento.', ephemeral: true });
      }

      const duracaoMs = Date.now() - inicio;
      const minutos = Math.floor(duracaoMs / 60000);
      const horas = Math.floor(minutos / 60);
      pontosAtivos.delete(interaction.user.id);

      return await interaction.reply({ 
        content: `🔴 Turno finalizado! Tempo trabalhado: **${horas}h ${minutos % 60}m**.`, 
        ephemeral: true 
      });
    }

  } catch (err) {
    console.error('Erro na interação:', err);
  }
});

client.login(DISCORD_TOKEN);
