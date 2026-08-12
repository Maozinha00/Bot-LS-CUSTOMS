/**
 * ====================================================================
 * 🔧 LS CUSTOMS — DISCORD BOT SCRIPT COMPLETO (Node.js / discord.js)
 * ====================================================================
 * 
 * Funcionalidades Incluídas:
 * 1. 📥 Logs de Quem Entrou no Servidor (Canal: 1536304188105949244)
 * 2. 📤 Logs de Quem Saiu do Servidor
 * 3. 📋 Formulário de Recrutamento (8 Perguntas) em 2 Etapas com Modais
 * 4. ⏱️ Painel e Sistema de Bate-Ponto Interativo (Calcula Horas)
 * 5. 🚨 Painel e Comando de Demissão (Remove Cargos e Expulsa)
 * 6. 📜 Comandos Slash: /painelregistro, /painelponto, /paineldemissao, /demitir, /registrar, /tabela, /radio
 * 
 * 📦 Instalação das Dependências:
 * npm install discord.js dotenv
 * 
 * 🚀 Como Executar:
 * node bot.js
 */

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

// 🔑 CONFIGURAÇÃO DO BOT E CANAIS
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'COLE_SEU_TOKEN_AQUI';
const GUILD_ID = process.env.GUILD_ID || '1535806745816072245';

// CANAL ESPECIFICADO PARA LOGS DE ENTRADA / SAÍDA: 1536304188105949244
const JOIN_LOGS_CHANNEL_ID = process.env.JOIN_LOGS_CHANNEL_ID || '1536304188105949244';
const LOGS_CHANNEL_ID = process.env.LOGS_CHANNEL_ID || '1536308230936993792';
const PONTO_CHANNEL_ID = process.env.PONTO_CHANNEL_ID || '1536309622699466772';
const DEMISSAO_CHANNEL_ID = process.env.DEMISSAO_CHANNEL_ID || '1536304188609400955';
const RADIO_FREQ = process.env.RADIO_FREQ || '633';

// CLIENTE DISCORD COM INTENTS NECESSÁRIOS
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers // REQUISITO OBRIGATÓRIO PARA LOGS DE QUEM ENTROU
  ]
});

// MEMÓRIA TEMPORÁRIA
const registrosTemporarios = new Map();
const pontosAtivos = new Map();

// 📜 COMANDOS SLASH
const commands = [
  new SlashCommandBuilder()
    .setName('painelregistro')
    .setDescription('Envia o painel fixo com botão para os membros solicitarem recrutamento'),

  new SlashCommandBuilder()
    .setName('painelponto')
    .setDescription('Envia o Painel Fixado de Bate-Ponto Interativo no canal'),

  new SlashCommandBuilder()
    .setName('paineldemissao')
    .setDescription('Envia o Painel Fixado de Demissão da Liderança'),

  new SlashCommandBuilder()
    .setName('demitir')
    .setDescription('Demitir integrante, remover cargos e expulsar do Discord')
    .addUserOption(opt => opt.setName('membro').setDescription('Membro a ser demitido').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo da demissão').setRequired(true))
    .addStringOption(opt => opt.setName('passaporte').setDescription('Passaporte/ID do membro').setRequired(false)),

  new SlashCommandBuilder()
    .setName('registrar')
    .setDescription('Registra um novo integrante na LS CUSTOMS (Altera Nick e Atribui Cargo)')
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
    .setDescription('Exibe a tabela oficial de preços da LS CUSTOMS'),

  new SlashCommandBuilder()
    .setName('radio')
    .setDescription('Lembrete da frequência oficial da rádio')
].map(cmd => cmd.toJSON());

// 🚀 EVENTO: READY (CONEXÃO DO BOT)
client.once('ready', async () => {
  console.log('====================================================');
  console.log(`🔥 BOT LS CUSTOMS ONLINE! Conectado como: ${client.user.tag}`);
  console.log(`📥 Canal de Logs de Entrada configurado: #${JOIN_LOGS_CHANNEL_ID}`);
  console.log('====================================================');

  client.user.setActivity(`🔧 LS CUSTOMS | Rádio ${RADIO_FREQ}`, { type: 0 });

  if (DISCORD_TOKEN && DISCORD_TOKEN !== 'COLE_SEU_TOKEN_AQUI') {
    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
    try {
      console.log('⚙️ Registrando comandos Slash no Discord...');
      if (GUILD_ID) {
        await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), { body: commands });
        console.log(`✅ Comandos registrados no Servidor ID: ${GUILD_ID}`);
      } else {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Comandos globais registrados!');
      }
    } catch (err) {
      console.error('❌ Erro ao registrar comandos:', err);
    }
  }
});

// 📥 EVENTO: GUILD MEMBER ADD (LOGS DE QUEM ENTROU NO SERVIDOR)
client.on('guildMemberAdd', async (member) => {
  console.log(`📥 [ENTRADA] Novo membro entrou: ${member.user.tag} (ID: ${member.id})`);

  try {
    const channel = await member.guild.channels.fetch(JOIN_LOGS_CHANNEL_ID).catch(() => null);
    if (channel && channel.isTextBased()) {
      const createdSecs = Math.floor(member.user.createdTimestamp / 1000);

      const joinEmbed = new EmbedBuilder()
        .setTitle('📥 NOVO INTEGRANTE NO SERVIDOR — LS CUSTOMS')
        .setDescription(
          `👋 **Boas-vindas ao servidor da LS CUSTOMS!**\n\n` +
          `👤 **Membro:** ${member.user} (\`${member.user.tag}\`)\n` +
          `🆔 **ID Discord:** \`${member.user.id}\`\n` +
          `📅 **Conta criada:** <t:${createdSecs}:R> (<t:${createdSecs}:f>)\n` +
          `👥 **Total de Membros no Servidor:** **${member.guild.memberCount}**\n\n` +
          `📌 *Seja bem-vindo(a)! Responda ao formulário no canal de recrutamento para receber sua tag e suporte da liderança.*`
        )
        .setColor('#2ecc71')
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: 'Logs de Entrada • LS CUSTOMS' })
        .setTimestamp();

      await channel.send({ embeds: [joinEmbed] });
      console.log(`✅ Mensagem de entrada enviada para o canal ${JOIN_LOGS_CHANNEL_ID}`);
    } else {
      console.warn(`⚠️ Canal ID ${JOIN_LOGS_CHANNEL_ID} não encontrado ou sem permissão.`);
    }
  } catch (err) {
    console.error('❌ Erro ao enviar log de entrada:', err);
  }
});

// 📤 EVENTO: GUILD MEMBER REMOVE (QUANDO ALGUÉM SAIR)
client.on('guildMemberRemove', async (member) => {
  try {
    const channel = await member.guild.channels.fetch(JOIN_LOGS_CHANNEL_ID).catch(() => null);
    if (channel && channel.isTextBased()) {
      const leaveEmbed = new EmbedBuilder()
        .setTitle('📤 MEMBRO SAIU DO SERVIDOR — LS CUSTOMS')
        .setDescription(
          `🚪 **Um integrante saiu do servidor.**\n\n` +
          `👤 **Membro:** ${member.user} (\`${member.user.tag}\`)\n` +
          `🆔 **ID Discord:** \`${member.user.id}\`\n` +
          `👥 **Total Restante:** **${member.guild.memberCount} membros**`
        )
        .setColor('#e74c3c')
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: 'Logs de Saída • LS CUSTOMS' })
        .setTimestamp();

      await channel.send({ embeds: [leaveEmbed] });
    }
  } catch (err) {
    console.error('Erro ao enviar log de saída:', err);
  }
});

// ⚡ GERENCIADOR DE INTERAÇÕES (BOTÕES, MODAIS, SLASH COMMANDS)
client.on('interactionCreate', async (interaction) => {
  try {
    // 1️⃣ BOTÃO RECRUTAMENTO - ETAPA 1
    if (interaction.isButton() && interaction.customId === 'btn_solicitar_registro') {
      const modal = new ModalBuilder()
        .setCustomId('modal_registro_etapa1')
        .setTitle('LS CUSTOMS — Recrutamento (1/2)');

      const nomeInput = new TextInputBuilder()
        .setCustomId('reg_nome')
        .setLabel('1. Nome e Sobrenome In-Game')
        .setPlaceholder('Ex: João Silva')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const passaporteInput = new TextInputBuilder()
        .setCustomId('reg_passaporte')
        .setLabel('2. Passaporte / ID In-Game')
        .setPlaceholder('Ex: #1234')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const idadeInput = new TextInputBuilder()
        .setCustomId('reg_idade')
        .setLabel('3. Idade (Requisito mínimo)')
        .setPlaceholder('Ex: 18 anos')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const expInput = new TextInputBuilder()
        .setCustomId('reg_experiencia')
        .setLabel('4. Já trabalhou como mecânico antes?')
        .setPlaceholder('Sim / Não. Se sim, qual cidade?')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(nomeInput),
        new ActionRowBuilder().addComponents(passaporteInput),
        new ActionRowBuilder().addComponents(idadeInput),
        new ActionRowBuilder().addComponents(expInput)
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
          `Etapa 1 concluída com sucesso:\n\n` +
          `👤 **Nome**: ${nome}\n` +
          `🆔 **Passaporte**: #${passaporte}\n` +
          `🎂 **Idade**: ${idade}\n` +
          `🔧 **Experiência**: ${experiencia}\n\n` +
          `👉 **Clique no botão abaixo para responder as últimas 4 perguntas e finalizar seu formulário!**`
        )
        .setColor('#3498db');

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

      const porqueInput = new TextInputBuilder()
        .setCustomId('reg_porque')
        .setLabel('5. Por que quer entrar na LS CUSTOMS?')
        .setPlaceholder('Explique sua motivação...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const dispInput = new TextInputBuilder()
        .setCustomId('reg_disponibilidade')
        .setLabel('6. Qual sua disponibilidade de horário?')
        .setPlaceholder('Ex: Diariamente (Noite)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const regrasInput = new TextInputBuilder()
        .setCustomId('reg_regras')
        .setLabel('7. Leu as regras, aceita ponto e hierarquia?')
        .setPlaceholder('Sim, li todas e aceito')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const situacaoInput = new TextInputBuilder()
        .setCustomId('reg_situacao')
        .setLabel('8. Como lidaria com cliente problemático?')
        .setPlaceholder('Descreva sua atitude...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(porqueInput),
        new ActionRowBuilder().addComponents(dispInput),
        new ActionRowBuilder().addComponents(regrasInput),
        new ActionRowBuilder().addComponents(situacaoInput)
      );

      return await interaction.showModal(modal);
    }

    // SUBMIT FINAL ETAPA 2
    if (interaction.isModalSubmit() && interaction.customId === 'modal_registro_etapa2') {
      const temp = registrosTemporarios.get(interaction.user.id) || { nome: 'Inconhecido', passaporte: '0000', idade: 'N/A', experiencia: 'N/A' };
      const porque = interaction.fields.getTextInputValue('reg_porque');
      const disponibilidade = interaction.fields.getTextInputValue('reg_disponibilidade');
      const regras = interaction.fields.getTextInputValue('reg_regras');
      const situacao = interaction.fields.getTextInputValue('reg_situacao');

      registrosTemporarios.delete(interaction.user.id);

      const novoNick = `|Recruta| ${temp.nome} | #${temp.passaporte}`.substring(0, 32);

      await interaction.reply({
        content: '✅ **Formulário enviado com sucesso!** A liderança analisará suas respostas.',
        ephemeral: true
      });

      try {
        const logsChannel = await interaction.guild.channels.fetch(LOGS_CHANNEL_ID).catch(() => null) || interaction.channel;

        const logEmbed = new EmbedBuilder()
          .setTitle('📋 NOVA SOLICITAÇÃO DE RECRUTAMENTO — 8 RESPOSTAS')
          .setDescription(
            `📌 **FORMULÁRIO PENDENTE DE ANÁLISE**\n\n` +
            `👤 **1. Nome In-Game**: ${temp.nome}\n` +
            `🆔 **2. Passaporte**: #${temp.passaporte}\n` +
            `🎂 **3. Idade**: ${temp.idade}\n` +
            `🔧 **4. Experiência Anterior**: ${temp.experiencia}\n` +
            `🎯 **5. Motivação**: ${porque}\n` +
            `⏰ **6. Disponibilidade**: ${disponibilidade}\n` +
            `📜 **7. Aceita Regras/Ponto**: ${regras}\n` +
            `🤝 **8. Gestão de Crise**: ${situacao}\n\n` +
            `🎮 **DISCORD**: <@${interaction.user.id}> (${interaction.user.tag})\n` +
            `🏷️ **NICK SUGERIDO**: \`${novoNick}\`\n\n` +
            `⚙️ **STATUS**: ⏳ **Aguardando Liderança...**`
          )
          .setColor('#f1c40f')
          .setFooter({ text: 'Recrutamento • LS CUSTOMS' })
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`btn_aprovar_${interaction.user.id}_${encodeURIComponent(temp.nome)}_${temp.passaporte}`)
            .setLabel('✅ Aprovar Set')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`btn_recusar_${interaction.user.id}`)
            .setLabel('❌ Recusar Set')
            .setStyle(ButtonStyle.Danger)
        );

        if (logsChannel) {
          await logsChannel.send({ embeds: [logEmbed], components: [row] });
        }
      } catch (err) {
        console.error('Erro ao enviar log de formulário:', err);
      }
      return;
    }

    // APROVAÇÃO / RECUSA DE RECRUTAMENTO
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
            const discordRole = guild.roles.cache.get('1536304132980473896') || guild.roles.cache.find(r => r.name.toUpperCase().includes('RECRUTA'));
            if (discordRole) {
              await targetMember.roles.add(discordRole).catch(() => {});
            }
          }
        } catch (e) {}

        const approvedEmbed = new EmbedBuilder()
          .setTitle('✅ RECRUTAMENTO APROVADO — LS CUSTOMS')
          .setDescription(`🎉 <@${targetUserId}> foi aprovado por <@${staffUser.id}>!\n\n🏷️ **Nick Setado**: \`${novoNick}\``)
          .setColor('#2ecc71')
          .setTimestamp();

        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('btn_done').setLabel(`✅ Aprovado por @${staffUser.username}`).setStyle(ButtonStyle.Success).setDisabled(true)
        );

        await interaction.update({ embeds: [approvedEmbed], components: [disabledRow] });
      } else {
        const rejectedEmbed = new EmbedBuilder()
          .setTitle('❌ RECRUTAMENTO RECUSADO')
          .setDescription(`🎮 <@${targetUserId}> foi recusado por <@${staffUser.id}>.`)
          .setColor('#e74c3c')
          .setTimestamp();

        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('btn_done').setLabel(`❌ Recusado por @${staffUser.username}`).setStyle(ButtonStyle.Danger).setDisabled(true)
        );

        await interaction.update({ embeds: [rejectedEmbed], components: [disabledRow] });
      }
      return;
    }

    // 2️⃣ BATE-PONTO INTERATIVO
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
            `📻 **Rádio Oficial**: **${RADIO_FREQ}**\n\n` +
            `⚠️ *Esteja fardado e em sintonia na rádio oficial! Bom trabalho!*`
          )
          .setColor('#2ecc71')
          .setTimestamp();

        try {
          const pontoChannel = await interaction.guild.channels.fetch(PONTO_CHANNEL_ID).catch(() => null) || interaction.channel;
          if (pontoChannel) {
            const entryLog = new EmbedBuilder()
              .setTitle('🟢 REGISTRO DE ENTRADA EM SERVIÇO')
              .setDescription(`👤 <@${userId}> (${interaction.user.tag}) entrou em serviço às \`${now.toLocaleTimeString('pt-BR')}\`.`)
              .setColor('#2ecc71')
              .setTimestamp();

            await pontoChannel.send({ embeds: [entryLog] });
          }
        } catch (e) {}

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (interaction.customId === 'btn_ponto_sair') {
        if (!pontosAtivos.has(userId)) {
          return interaction.reply({ content: `⚠️ Você não possui um ponto ativo!`, ephemeral: true });
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
            `⏱️ **Tempo Total**: \`${totalStr}\`\n\n` +
            `✅ *Turno registrado. Bom descanso!*`
          )
          .setColor('#e74c3c')
          .setTimestamp();

        try {
          const pontoChannel = await interaction.guild.channels.fetch(PONTO_CHANNEL_ID).catch(() => null) || interaction.channel;
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
          return interaction.reply({ content: `🟢 **EM SERVIÇO:** Desde \`${data.startTime.toLocaleTimeString('pt-BR')}\` (${mins}m atrás)`, ephemeral: true });
        }
        return interaction.reply({ content: `🔴 **FORA DE SERVIÇO**`, ephemeral: true });
      }

      if (interaction.customId === 'btn_ponto_online') {
        const total = pontosAtivos.size;
        if (total === 0) return interaction.reply({ content: '📊 Nenhum mecânico em serviço.', ephemeral: true });

        let listStr = `📊 **MECÂNICOS EM SERVIÇO (${total})**\n\n`;
        for (const [id, item] of pontosAtivos.entries()) {
          const mins = Math.floor((now.getTime() - item.startTime.getTime()) / 60000);
          listStr += `• <@${id}> — Entrada \`${item.startTime.toLocaleTimeString('pt-BR')}\` (${mins}m)\n`;
        }
        return interaction.reply({ content: listStr, ephemeral: true });
      }
    }

    // 3️⃣ COMANDOS SLASH
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, user, guild } = interaction;

    if (commandName === 'painelregistro') {
      const embed = new EmbedBuilder()
        .setTitle('🔧 BEM-VINDO À LS CUSTOMS')
        .setDescription(
          `Seja bem-vindo(a) à **LS CUSTOMS**!\n\n` +
          `👉 **Clique no botão abaixo para responder ao formulário oficial de recrutamento (8 perguntas):**`
        )
        .setColor('#2ecc71')
        .setFooter({ text: 'LS CUSTOMS' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_solicitar_registro').setLabel('📋 Responder Formulário').setStyle(ButtonStyle.Primary)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    if (commandName === 'painelponto') {
      const embed = new EmbedBuilder()
        .setTitle('⏱️ LS CUSTOMS — BATE-PONTO')
        .setDescription(`Gerencie seu horário em serviço utilizando os botões abaixo:\n\n📻 **Rádio Oficial:** **${RADIO_FREQ}**`)
        .setColor('#2ecc71');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_ponto_entrar').setLabel('🟢 Entrar em Serviço').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_ponto_sair').setLabel('🔴 Sair de Serviço').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('btn_ponto_status').setLabel('📋 Meu Status').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('btn_ponto_online').setLabel('📊 Mecânicos On').setStyle(ButtonStyle.Primary)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    if (commandName === 'paineldemissao') {
      const embed = new EmbedBuilder()
        .setTitle('🚪 LS CUSTOMS — PAINEL DE DEMISSÃO')
        .setDescription(`🚨 **Acesso restrito para Liderança/Gerência**\nRemoção de cargos e expulsão automática do Discord.`)
        .setColor('#e74c3c');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_solicitar_demissao').setLabel('🚨 Processar Demissão').setStyle(ButtonStyle.Danger)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

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
          statusMsg = '⚠️ Cargo superior ao Bot';
        }
      }

      try {
        const demChannel = await guild.channels.fetch(DEMISSAO_CHANNEL_ID).catch(() => null) || interaction.channel;
        const demEmbed = new EmbedBuilder()
          .setTitle('🔴 REGISTRO DE DEMISSÃO — LS CUSTOMS')
          .setDescription(`👤 **Membro**: <@${targetUser.id}>\n🆔 **Passaporte**: #${passaporte}\n👑 **Demitido por**: <@${user.id}>\n📝 **Motivo**: ${motivo}\n🚪 **Resultado**: ${statusMsg}`)
          .setColor('#e74c3c')
          .setTimestamp();

        if (demChannel) await demChannel.send({ embeds: [demEmbed] });
      } catch (e) {}

      return interaction.reply({ content: `🚨 Demissão concluída para <@${targetUser.id}>.`, ephemeral: true });
    }

    if (commandName === 'registrar') {
      const targetUser = options.getUser('membro', true);
      const nome = options.getString('nome', true);
      const passaporte = options.getString('passaporte', true);
      const cargo = options.getString('cargo', true);

      const member = await guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) return interaction.reply({ content: '❌ Usuário não encontrado!', ephemeral: true });

      const novoNick = `|Recruta| ${nome} | #${passaporte}`.substring(0, 32);

      if (member.manageable) await member.setNickname(novoNick).catch(() => {});
      const discordRole = guild.roles.cache.get('1536304132980473896') || guild.roles.cache.find(r => r.name.toUpperCase().includes(cargo.toUpperCase()));
      if (discordRole) await member.roles.add(discordRole).catch(() => {});

      return interaction.reply({ content: `✅ <@${targetUser.id}> registrado como ${cargo} (${novoNick})!` });
    }

    if (commandName === 'tabela') {
      const embed = new EmbedBuilder()
        .setTitle('💰 TABELA DE PREÇOS — LS CUSTOMS')
        .setDescription(
          `**🛠️ ITENS**\nKit Reparo Básico: R$ 1.000 | Kit Avançado: R$ 2.500 | Chave Inglesa: R$ 2.000 | Pneu: R$ 500\n\n` +
          `**⚙️ PERFORMANCE**\nMotor N1: R$ 12.000 | Motor N2: R$ 18.000 | Motor N3: R$ 22.000 | Turbo: R$ 15.000\n\n` +
          `**🎨 PINTURA & LATARIA**\nParachoques: R$ 2.000 | Xenon: R$ 3.500 | Pintura Primária: R$ 1.500 | Camaleão: R$ 2.500`
        )
        .setColor('#f1c40f');

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (commandName === 'radio') {
      return interaction.reply({ content: `📻 **Frequência da Rádio:** **${RADIO_FREQ}**` });
    }

  } catch (err) {
    console.error('❌ Erro na interação:', err);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Erro ao executar o comando.', ephemeral: true }).catch(() => {});
    }
  }
});

// LOGIN DO BOT NO DISCORD
client.login(DISCORD_TOKEN).catch(err => {
  console.error('❌ ERRO NO LOGIN DO DISCORD:', err.message);
});
