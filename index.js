try {
  require('dotenv').config();
} catch (e) {
  // Ignora se rodando diretamente em ambiente sem .env file
}

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

// 🔑 CONFIGURAÇÃO DO TOKEN E SERVIDOR
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'COLE_SEU_TOKEN_DO_DISCORD_AQUI';
const GUILD_ID = process.env.GUILD_ID || '1535806745816072245';

// ID dos Canais Oficiais de Logs e Painéis
const LOGS_CHANNEL_ID = process.env.LOGS_CHANNEL_ID || '1536308230936993792';
const PONTO_CHANNEL_ID = process.env.PONTO_CHANNEL_ID || '1536309622699466772';
const DEMISSAO_CHANNEL_ID = process.env.DEMISSAO_CHANNEL_ID || '1536304188609400955';
const RADIO_FREQ = process.env.RADIO_FREQ || '633';

// Lista de Cargos e Tags Configuradas
const ROLES_CONFIG = [
  {
    "id": "1",
    "name": "👑 LÍDER",
    "tag": "Líder",
    "color": "#f1c40f",
    "icon": "👑"
  },
  {
    "id": "2",
    "name": "⭐ VICE-LÍDER",
    "tag": "Vice-Líder",
    "color": "#e67e22",
    "icon": "⭐"
  },
  {
    "id": "3",
    "name": "🛠️ GERENTE",
    "tag": "Gerente",
    "color": "#1abc9c",
    "icon": "🛠️"
  },
  {
    "id": "4",
    "name": "🔧 MEMBRO",
    "tag": "Membro",
    "color": "#3498db",
    "icon": "🔧"
  },
  {
    "id": "1536304132980473896",
    "name": "🔰 RECRUTA",
    "tag": "Recruta",
    "color": "#95a5a6",
    "icon": "🔰"
  }
];

// Client Discord com Intents necessários
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Armazenamento em memória para dados de cadastro em 2 etapas
const registrosTemporarios = new Map();

// Banco de dados em memória para registrar bate-ponto (/ponto)
const pontosAtivos = new Map();

// 📜 REGISTRO DOS COMANDOS SLASH
const commands = [
  new SlashCommandBuilder()
    .setName('painelregistro')
    .setDescription('Envia o painel fixo com botão para os membros solicitarem registro'),

  new SlashCommandBuilder()
    .setName('painelponto')
    .setDescription('Envia o Painel Fixado de Bate-Ponto Interativo no canal'),

  new SlashCommandBuilder()
    .setName('paineldemissao')
    .setDescription('Envia o Painel Fixado de Demissão da Liderança'),

  new SlashCommandBuilder()
    .setName('demitir')
    .setDescription('Demitir integrante, remover cargos e expulsar do Discord')
    .addUserOption(option => 
      option.setName('membro').setDescription('Membro a ser demitido').setRequired(true))
    .addStringOption(option => 
      option.setName('motivo').setDescription('Motivo da demissão').setRequired(true))
    .addStringOption(option => 
      option.setName('passaporte').setDescription('Passaporte/ID do membro').setRequired(false)),

  new SlashCommandBuilder()
    .setName('registrar')
    .setDescription('Registra um novo integrante na LS CUSTOMS (Altera Nick e Atribui Cargo)')
    .addUserOption(option => 
      option.setName('membro').setDescription('Selecione o usuário do Discord').setRequired(true))
    .addStringOption(option => 
      option.setName('nome').setDescription('Nome e Sobrenome In-Game').setRequired(true))
    .addStringOption(option => 
      option.setName('passaporte').setDescription('ID / Passaporte In-Game').setRequired(true))
    .addStringOption(option => 
      option.setName('cargo').setDescription('Cargo na LS CUSTOMS').setRequired(true)
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

// 🚀 QUANDO O BOT FICAR ONLINE
client.once('ready', async () => {
  console.log('====================================================');
  console.log("🔥 BOT ONLINE! Conectado como: " + client.user.tag);
  console.log('====================================================');

  client.user.setActivity('🔧 LS CUSTOMS | Rádio ' + RADIO_FREQ, { type: 0 });

  if (!DISCORD_TOKEN || DISCORD_TOKEN === 'COLE_SEU_TOKEN_AQUI') {
    console.error('❌ ERRO CRÍTICO: Token do Discord não foi configurado!');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  try {
    console.log('⚙️ Registrando comandos Slash no Discord...');
    if (GUILD_ID && GUILD_ID.trim() !== '') {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, GUILD_ID.trim()),
        { body: commands }
      );
      console.log("✅ Comandos registrados com sucesso no Servidor ID: " + GUILD_ID);
    } else {
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: commands }
      );
      console.log('✅ Comandos globais registrados com sucesso no Discord!');
    }
  } catch (error) {
    console.error('❌ Erro ao registrar comandos:', error);
  }
});

// ⚡ GERENCIADOR DE INTERAÇÕES
client.on('interactionCreate', async interaction => {
  try {
    // 1️⃣ BOTÃO SOLICITAR REGISTRO (ETAPA 1 - DADOS PESSOAIS & EXPERIÊNCIA)
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

    // SUBMIT ETAPA 1 -> ABRE BOTAO PARA ETAPA 2
    if (interaction.isModalSubmit() && interaction.customId === 'modal_registro_etapa1') {
      const nome = interaction.fields.getTextInputValue('reg_nome');
      const passaporte = interaction.fields.getTextInputValue('reg_passaporte');
      const idade = interaction.fields.getTextInputValue('reg_idade');
      const experiencia = interaction.fields.getTextInputValue('reg_experiencia');

      // Salva progresso temporário
      registrosTemporarios.set(interaction.user.id, {
        nome,
        passaporte,
        idade,
        experiencia
      });

      const stepEmbed = new EmbedBuilder()
        .setTitle('📋 LS CUSTOMS — RECRUTAMENTO (ETAPA 2/2)')
        .setDescription(
          "Great! Etapa 1 concluída com sucesso:\n\n" +
          "👤 **Nome**: " + nome + "\n" +
          "🆔 **Passaporte**: #" + passaporte + "\n" +
          "🎂 **Idade**: " + idade + "\n" +
          "🔧 **Experiência**: " + experiencia + "\n\n" +
          "👉 **Clique no botão abaixo para responder as últimas 4 perguntas e enviar seu formulário para a liderança!**"
        )
        .setColor('#3498db');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('btn_continuar_etapa2')
          .setLabel('📝 Continuar Formuário (Etapa 2)')
          .setStyle(ButtonStyle.Success)
      );

      return interaction.reply({
        embeds: [stepEmbed],
        components: [row],
        ephemeral: true
      });
    }

    // BOTÃO PARA ABRIR MODAL DA ETAPA 2
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
        .setPlaceholder('Ex: Sim, diariamente (noite) / Alguns dias')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const regrasInput = new TextInputBuilder()
        .setCustomId('reg_regras')
        .setLabel('7. Leu as regras, aceita ponto e hierarquia?')
        .setPlaceholder('Sim, li todas e aceito bater ponto / cumprir ordens')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const situacaoInput = new TextInputBuilder()
        .setCustomId('reg_situacao')
        .setLabel('8. Como lidaria com cliente problemático?')
        .setPlaceholder('Descreva como agiria com respeito e paciência...')
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

    // SUBMIT FINAL ETAPA 2 -> ENVIA LOG COMPLETO DAS 8 PERGUNTAS PARA A LIDERANÇA
    if (interaction.isModalSubmit() && interaction.customId === 'modal_registro_etapa2') {
      const temp = registrosTemporarios.get(interaction.user.id) || {
        nome: 'N/A',
        passaporte: '0000',
        idade: 'N/A',
        experiencia: 'N/A'
      };

      const porque = interaction.fields.getTextInputValue('reg_porque');
      const disponibilidade = interaction.fields.getTextInputValue('reg_disponibilidade');
      const regras = interaction.fields.getTextInputValue('reg_regras');
      const situacao = interaction.fields.getTextInputValue('reg_situacao');

      registrosTemporarios.delete(interaction.user.id);

      const roleObj = ROLES_CONFIG.find(r => 
        r.id === '1536304132980473896' ||
        r.name.toLowerCase().includes('recruta') || 
        r.tag.toLowerCase().includes('rec')
      ) || { id: '1536304132980473896', name: 'Recruta', tag: 'Recruta' };

      const tagCargo = roleObj.tag || 'Recruta';
      const cargoNomeFinal = roleObj.name || 'Recruta';
      const novoNick = ("|" + tagCargo + "| " + temp.nome + " | #" + temp.passaporte).substring(0, 32);

      await interaction.reply({
        content: "✅ **Formulário de Recrutamento Enviado com Sucesso!**\nTodas as 8 respostas foram enviadas para a Liderança da **LS CUSTOMS** no canal de logs. Aguarde a análise!",
        ephemeral: true
      });

      try {
        const logsChannel = await interaction.guild.channels.fetch(LOGS_CHANNEL_ID).catch(() => null) || interaction.channel;

        const logEmbed = new EmbedBuilder()
          .setTitle('📋 NOVA SOLICITAÇÃO DE RECRUTAMENTO — 8 RESPOSTAS')
          .setDescription("📌 **FORMULÁRIO PENDENTE DE APROVAÇÃO DA LIDERANÇA**\n\n" +
            "👤 **1. Nome In-Game**: " + temp.nome + "\n" +
            "🆔 **2. Passaporte**: #" + temp.passaporte + "\n" +
            "🎂 **3. Idade**: " + temp.idade + "\n" +
            "🔧 **4. Já trabalhou como mecânico?**: " + temp.experiencia + "\n" +
            "🎯 **5. Por que entrar na LS CUSTOMS?**: " + porque + "\n" +
            "⏰ **6. Disponibilidade**: " + disponibilidade + "\n" +
            "📜 **7. Regras / Ponto / Hierarquia**: " + regras + "\n" +
            "🤝 **8. Gestão de Clientes / Equipe**: " + situacao + "\n\n" +
            "🎮 **USUÁRIO DISCORD**: <@" + interaction.user.id + "> (" + interaction.user.tag + ")\n" +
            "🏷️ **NICK SUGERIDO**: `" + novoNick + "`\n\n" +
            "⚙️ **STATUS**: ⏳ **Aguardando Análise da Liderança...**"
          )
          .setColor('#f1c40f')
          .setFooter({ text: 'Sistema de Recrutamento • LS CUSTOMS' })
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('btn_aprovar_' + interaction.user.id + '_' + encodeURIComponent(temp.nome) + '_' + temp.passaporte)
            .setLabel('✅ Aprovar Set')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('btn_recusar_' + interaction.user.id)
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

    // 2️⃣ BOTÃO PROCESSAR DEMISSÃO
    if (interaction.isButton() && interaction.customId === 'btn_solicitar_demissao') {
      const modal = new ModalBuilder()
        .setCustomId('modal_demissao')
        .setTitle('Processar Demissão — LS CUSTOMS');

      const userOrIdInput = new TextInputBuilder()
        .setCustomId('dem_membro')
        .setLabel('ID Discord do Membro')
        .setPlaceholder('Ex: 8492049201948201')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const passaporteInput = new TextInputBuilder()
        .setCustomId('dem_passaporte')
        .setLabel('Passaporte / ID In-Game')
        .setPlaceholder('Ex: 1234')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const motivoInput = new TextInputBuilder()
        .setCustomId('dem_motivo')
        .setLabel('Motivo da Demissão')
        .setPlaceholder('Ex: Inatividade / Desrespeito')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(userOrIdInput),
        new ActionRowBuilder().addComponents(passaporteInput),
        new ActionRowBuilder().addComponents(motivoInput)
      );

      return await interaction.showModal(modal);
    }

    // 3️⃣ SUBMIT DEMISSÃO
    if (interaction.isModalSubmit() && interaction.customId === 'modal_demissao') {
      const targetUserId = interaction.fields.getTextInputValue('dem_membro').trim();
      const passaporte = interaction.fields.getTextInputValue('dem_passaporte') || 'N/A';
      const motivo = interaction.fields.getTextInputValue('dem_motivo');

      const guild = interaction.guild;
      const staffUser = interaction.user;
      let statusMsg = '✅ Cargos removidos e membro expulso do Discord';

      try {
        const member = await guild.members.fetch(targetUserId).catch(() => null);
        if (member) {
          const rolesToRemove = member.roles.cache.filter(r => r.name !== '@everyone');
          if (rolesToRemove.size > 0) {
            await member.roles.remove(rolesToRemove).catch(() => {});
          }
          if (member.kickable) {
            await member.kick('Demissão efetuada por ' + staffUser.tag + ': ' + motivo).catch(() => {
              statusMsg = '⚠️ Cargos removidos, erro ao expulsar do Discord';
            });
          } else {
            statusMsg = '⚠️ Cargos removidos, mas membro tem cargo maior que o Bot';
          }
        } else {
          statusMsg = '⚠️ Membro não encontrado no servidor, log registrado';
        }
      } catch (err) {
        statusMsg = '⚠️ Erro ao processar expulsão';
      }

      try {
        const demChannel = await guild.channels.fetch(DEMISSAO_CHANNEL_ID).catch(() => null) || interaction.channel;
        const demEmbed = new EmbedBuilder()
          .setTitle('🔴 LS CUSTOMS — REGISTRO DE DEMISSÃO')
          .setDescription(
            "🚨 **INTEGRANTE DEMITIDO E REMOVIDO DO DISCORD**\n\n" +
            "👤 **MEMBRO DEMITIDO**: <@" + targetUserId + "> (" + targetUserId + ")\n" +
            "🆔 **PASSAPORTE**: #" + passaporte + "\n" +
            "👑 **DEMITIDO POR**: <@" + staffUser.id + ">\n" +
            "📝 **MOTIVO**: " + motivo + "\n" +
            "🚪 **AÇÃO EXECUTADA**: " + statusMsg + "\n\n" +
            "📌 *Membro desvinculado oficialmente da equipe da LS CUSTOMS.*"
          )
          .setColor('#e74c3c')
          .setFooter({ text: 'Painel de Demissão • LS CUSTOMS' })
          .setTimestamp();

        if (demChannel) {
          await demChannel.send({ embeds: [demEmbed] });
        }
      } catch (err) {}

      return interaction.reply({
        content: "🚨 **Demissão processada com sucesso!**\nLog publicado no canal de demissão.",
        ephemeral: true
      });
    }

    // 4️⃣ CLIQUE NOS BOTÕES DE APROVAÇÃO
    if (interaction.isButton() && (interaction.customId.startsWith('btn_aprovar_') || interaction.customId.startsWith('btn_recusar_'))) {
      const isApprove = interaction.customId.startsWith('btn_aprovar_');
      const parts = interaction.customId.split('_');
      const targetUserId = parts[2];
      const guild = interaction.guild;
      const staffUser = interaction.user;

      if (isApprove) {
        const nome = decodeURIComponent(parts[3] || '');
        const passaporte = parts[4] || '';

        const roleObj = ROLES_CONFIG.find(r => 
          r.id === '1536304132980473896' ||
          r.name.toLowerCase().includes('recruta') || 
          r.tag.toLowerCase().includes('rec')
        ) || { id: '1536304132980473896', name: 'Recruta', tag: 'Recruta' };

        const tagCargo = roleObj.tag || 'Recruta';
        const cargoNomeFinal = roleObj.name || 'Recruta';
        const roleIdConfig = roleObj.id || '1536304132980473896';
        const novoNick = ("|" + tagCargo + "| " + nome + " | #" + passaporte).substring(0, 32);

        let nickStatus = '✅ Alterado com sucesso';
        let roleStatus = '✅ Cargo atribuído';

        try {
          const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
          if (targetMember) {
            if (targetMember.manageable) {
              await targetMember.setNickname(novoNick).catch(() => { nickStatus = '⚠️ Sem permissão para alterar nick'; });
            } else {
              nickStatus = '⚠️ Sem permissão para alterar nick';
            }

            const discordRole = (roleIdConfig ? guild.roles.cache.get(roleIdConfig) : null) ||
              guild.roles.cache.get('1536304132980473896') ||
              guild.roles.cache.find(r => 
                r.id === roleIdConfig ||
                r.name.toUpperCase().includes(cargoNomeFinal.toUpperCase()) || 
                cargoNomeFinal.toUpperCase().includes(r.name.toUpperCase()) ||
                r.name.toUpperCase().includes('RECRUTA')
              );

            if (discordRole) {
              await targetMember.roles.add(discordRole).catch(() => { roleStatus = '⚠️ Erro ao adicionar cargo'; });
            } else {
              roleStatus = '⚠️ Cargo ' + cargoNomeFinal + ' não encontrado no servidor';
            }
          }
        } catch (e) {}

        const approvedEmbed = new EmbedBuilder()
          .setTitle('✅ RECRUTAMENTO APROVADO — LS CUSTOMS')
          .setDescription(
            "🎉 **SOLICITAÇÃO APROVADA COM SUCESSO!**\n\n" +
            "👤 **NOME**: " + nome + "\n" +
            "🆔 **PASSAPORTE**: #" + passaporte + "\n" +
            "🔰 **CARGO**: " + cargoNomeFinal + "\n" +
            "🎮 **USUÁRIO**: <@" + targetUserId + ">\n" +
            "🏷️ **NICK DEFINIDO**: `" + novoNick + "`\n\n" +
            "👑 **APROVADO POR**: <@" + staffUser.id + ">\n" +
            "⚙️ **Status Apelido**: " + nickStatus + "\n" +
            "⚙️ **Status Cargo**: " + roleStatus
          )
          .setColor('#2ecc71')
          .setFooter({ text: 'Sistema de Recrutamento Automático • LS CUSTOMS' })
          .setTimestamp();

        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('btn_approved_done').setLabel('✅ Aprovado por @' + staffUser.username).setStyle(ButtonStyle.Success).setDisabled(true)
        );

        await interaction.update({ embeds: [approvedEmbed], components: [disabledRow] });
      } else {
        const rejectedEmbed = new EmbedBuilder()
          .setTitle('❌ RECRUTAMENTO RECUSADO — LS CUSTOMS')
          .setDescription(
            "❌ **SOLICITAÇÃO DE RECRUTAMENTO RECUSADA**\n\n" +
            "🎮 **USUÁRIO**: <@" + targetUserId + ">\n" +
            "👑 **RECUSADO POR**: <@" + staffUser.id + ">\n\n" +
            "📌 *A solicitação foi indeferida pela liderança.*"
          )
          .setColor('#e74c3c')
          .setFooter({ text: 'Sistema de Recrutamento Automático • LS CUSTOMS' })
          .setTimestamp();

        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('btn_rejected_done').setLabel('❌ Recusado por @' + staffUser.username).setStyle(ButtonStyle.Danger).setDisabled(true)
        );

        await interaction.update({ embeds: [rejectedEmbed], components: [disabledRow] });
      }
      return;
    }

    // 5️⃣ BATE-PONTO INTERATIVO (COM RESPOSTA PRIVADA / EPHEMERAL E LOG PÚBLICO SEPARADO!)
    if (interaction.isButton() && interaction.customId.startsWith('btn_ponto_')) {
      const userId = interaction.user.id;
      const now = new Date();

      if (interaction.customId === 'btn_ponto_entrar') {
        if (pontosAtivos.has(userId)) {
          const data = pontosAtivos.get(userId);
          const diffMs = now.getTime() - data.startTime.getTime();
          const mins = Math.floor(diffMs / (1000 * 60));
          return interaction.reply({
            content: "⚠️ **Você já está em serviço!**\n\n⏰ **Entrada**: `" + data.startTime.toLocaleTimeString('pt-BR') + "`\n⏱️ **Tempo Decorrido**: `" + Math.floor(mins/60) + "h " + (mins%60) + "m`",
            ephemeral: true
          });
        }

        pontosAtivos.set(userId, { startTime: now });

        const embed = new EmbedBuilder()
          .setTitle('🟢 LS CUSTOMS — BATE-PONTO INICIADO')
          .setDescription(
            "👤 **Mecânico**: <@" + userId + ">\n" +
            "⏰ **Horário de Entrada**: `" + now.toLocaleTimeString('pt-BR') + "`\n" +
            "📻 **Rádio Oficial**: **" + RADIO_FREQ + "**\n\n" +
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
            "⚠️ **IMPORTANTE:** Lembre-se de estar fardado e em sintonia na rádio!\n" +
            "🔧 *Bom trabalho e excelente turno!*"
          )
          .setColor('#2ecc71')
          .setFooter({ text: 'Sistema de Bate-Ponto • LS CUSTOMS' })
          .setTimestamp();

        // Envia log público no canal de ponto para registro
        try {
          const pontoChannel = await interaction.guild.channels.fetch(PONTO_CHANNEL_ID).catch(() => null) ||
            await interaction.guild.channels.fetch(LOGS_CHANNEL_ID).catch(() => null);
          if (pontoChannel) {
            const entryLogEmbed = new EmbedBuilder()
              .setTitle('🟢 LS CUSTOMS — REGISTRO DE ENTRADA EM SERVIÇO')
              .setDescription(
                "👤 **Mecânico**: <@" + userId + "> (" + interaction.user.tag + ")\n" +
                "⏰ **Horário de Entrada**: `" + now.toLocaleTimeString('pt-BR') + "`\n" +
                "📻 **Frequência da Rádio**: **" + RADIO_FREQ + "**\n\n" +
                "📌 *Mecânico iniciou o expediente e está ativo na oficina!*"
              )
              .setColor('#2ecc71')
              .setFooter({ text: 'Log de Entrada • LS CUSTOMS' })
              .setTimestamp();

            await pontoChannel.send({ embeds: [entryLogEmbed] });
          }
        } catch (err) {}

        // Resposta PRIVADA (Ephemeral) ao clicar no botão ("Só você pode ver esta mensagem")
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (interaction.customId === 'btn_ponto_sair') {
        if (!pontosAtivos.has(userId)) {
          return interaction.reply({
            content: "⚠️ **Você não possui um turno ativo no momento!**\nClique no botão **[ 🟢 Entrar em Serviço ]** para iniciar.",
            ephemeral: true
          });
        }

        const data = pontosAtivos.get(userId);
        pontosAtivos.delete(userId);

        const diffMs = now.getTime() - data.startTime.getTime();
        const totalSecs = Math.floor(diffMs / 1000);
        const hours = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        const tempoFormatado = (hours > 0 ? hours + "h " : "") + mins + "m " + secs + "s";

        const logEmbed = new EmbedBuilder()
          .setTitle('🔴 LS CUSTOMS — BATE-PONTO FINALIZADO')
          .setDescription(
            "👤 **Mecânico**: <@" + userId + ">\n" +
            "⏰ **Horário de Entrada**: `" + data.startTime.toLocaleTimeString('pt-BR') + "`\n" +
            "⌛ **Horário de Saída**: `" + now.toLocaleTimeString('pt-BR') + "`\n" +
            "⏱️ **Tempo Total em Serviço**: `" + tempoFormatado + "`\n\n" +
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
            "✅ *Turno encerrado e registrado no sistema. Bom descanso!*"
          )
          .setColor('#e74c3c')
          .setFooter({ text: 'Sistema de Bate-Ponto • LS CUSTOMS' })
          .setTimestamp();

        // 1. ENVIA LOG PÚBLICO PARA O CANAL DE PONTO / LOGS PARA A LIDERANÇA ACOMPANHAR
        try {
          const pontoChannel = await interaction.guild.channels.fetch(PONTO_CHANNEL_ID).catch(() => null) ||
            await interaction.guild.channels.fetch(LOGS_CHANNEL_ID).catch(() => null);
          if (pontoChannel) {
            await pontoChannel.send({ embeds: [logEmbed] });
          }
        } catch (err) {
          console.error("Erro ao publicar log público de saída:", err);
        }

        // 2. RETORNA RESPOSTA PRIVADA (EPHEMERAL) AO USUÁRIO QUE CLICOU NO BOTÃO
        // Exibirá "Só você pode ver esta mensagem" no Discord!
        return interaction.reply({ embeds: [logEmbed], ephemeral: true });
      }

      if (interaction.customId === 'btn_ponto_status') {
        if (pontosAtivos.has(userId)) {
          const data = pontosAtivos.get(userId);
          const diffMs = now.getTime() - data.startTime.getTime();
          const mins = Math.floor(diffMs / (1000 * 60));
          return interaction.reply({
            content: "🟢 **STATUS: EM SERVIÇO**\n\n⏰ **Entrada**: `" + data.startTime.toLocaleTimeString('pt-BR') + "`\n⏱️ **Tempo em Serviço**: `" + Math.floor(mins/60) + "h " + (mins%60) + "m`",
            ephemeral: true
          });
        } else {
          return interaction.reply({
            content: "🔴 **STATUS: FORA DE SERVIÇO**\nVocê não possui ponto aberto no momento.",
            ephemeral: true
          });
        }
      }

      if (interaction.customId === 'btn_ponto_online') {
        const totalOn = pontosAtivos.size;
        if (totalOn === 0) {
          return interaction.reply({
            content: "📊 **MECÂNICOS EM SERVIÇO (0)**\nNenhum mecânico está em serviço no momento.",
            ephemeral: true
          });
        }

        let lista = "📊 **MECÂNICOS EM SERVIÇO (" + totalOn + ")**\n\n";
        for (const [id, item] of pontosAtivos.entries()) {
          const diffMins = Math.floor((now.getTime() - item.startTime.getTime()) / (1000 * 60));
          lista += "• <@" + id + "> — Desde `" + item.startTime.toLocaleTimeString('pt-BR') + "` (" + Math.floor(diffMins/60) + "h " + (diffMins%60) + "m)\n";
        }

        return interaction.reply({ content: lista, ephemeral: true });
      }

      return;
    }

    // 6️⃣ COMANDOS SLASH CHAT
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, user, guild } = interaction;

    if (commandName === 'painelregistro') {
      const embed = new EmbedBuilder()
        .setTitle('🔧 BEM-VINDO À LS CUSTOMS')
        .setDescription(
          "Seja muito bem-vindo(a) à **LS CUSTOMS**!\n\n" +
          "🚗 **Aqui trabalhamos com:**\n" +
          "• Mecânica Geral & Manutenção\n" +
          "• Reparos de Lataria e Engine\n" +
          "• Personalização e Bodykits\n" +
          "• Performance & Tuning\n" +
          "• Pinturas e Acabamentos\n\n" +
          "📜 **Leia atentamente as regras e frequências do servidor antes de iniciar suas atividades.**\n\n" +
          "👉 **Para solicitar seu Recrutamento, clique no botão abaixo e responda às 8 perguntas do formulário:**\n" +
          "1️⃣ Dados Pessoais & In-Game\n" +
          "2️⃣ Regras, Motivação & Disponibilidade\n\n" +
          "⚙️ *Após a aprovação da Liderança, seu apelido será alterado para `[REC] Nome | #ID` e o cargo concedido!*\n\n" +
          "🔧 **LS CUSTOMS** — *Respeito • Organização • Compromisso*"
        )
        .setColor('#2ecc71')
        .setImage('https://i.imgur.com/Vv2juos.jpeg')
        .setFooter({ text: 'LS CUSTOMS — Qualidade e Desempenho Excepcionais' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('btn_solicitar_registro')
          .setLabel('📋 Responder Formuário (8 Perguntas)')
          .setStyle(ButtonStyle.Primary)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    if (commandName === 'painelponto') {
      const embed = new EmbedBuilder()
        .setTitle('⏱️ LS CUSTOMS — PAINEL DE BATE-PONTO')
        .setDescription(
          "🛠️ **REGISTRO DE TURNO & PRESENÇA DA EQUIPE**\n" +
          "*Utilize os botões abaixo para gerenciar seu horário em serviço.*\n\n" +
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
          "🟢 **[ Entrar em Serviço ]** — Inicia a contagem do seu turno\n" +
          "🔴 **[ Sair de Serviço ]** — Finaliza o turno (Notificação Privada + Log Público)\n" +
          "📋 **[ Meu Status ]** — Consulta seu status e tempo decorrido\n" +
          "📊 **[ Mecânicos On ]** — Exibe a lista de mecânicos em serviço\n\n" +
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
          "📻 **Rádio Obrigatória**: **" + RADIO_FREQ + "**\n" +
          "⚠️ *É obrigatório bater ponto ao iniciar e finalizar o expediente!*\n\n" +
          "🔧 **LS CUSTOMS** — *Qualidade e Desempenho Excepcionais*"
        )
        .setColor('#2ecc71')
        .setFooter({ text: 'Painel Fixo de Bate-Ponto • LS CUSTOMS' });

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
        .setDescription(
          "🚨 **PAINEL DE DESVINCULAÇÃO E DEMISSÃO DA LIDERANÇA**\n" +
          "*Acesso restrito para Gerência e Liderança da LS CUSTOMS.*\n\n" +
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
          "⚠️ **Ao processar a demissão de um integrante:**\n" +
          "• Todos os cargos na oficina serão automaticamente removidos\n" +
          "• O integrante será expulso do servidor do Discord\n" +
          "• O registro de demissão será enviado para este canal\n\n" +
          "👉 **Clique no botão abaixo para iniciar o processo de demissão:**"
        )
        .setColor('#e74c3c')
        .setFooter({ text: 'Painel Fixo de Demissão • LS CUSTOMS' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('btn_solicitar_demissao')
          .setLabel('🚨 Processar Demissão')
          .setStyle(ButtonStyle.Danger)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    if (commandName === 'demitir') {
      const targetUser = options.getUser('membro');
      const motivo = options.getString('motivo');
      const passaporte = options.getString('passaporte') || 'N/A';
      const staffUser = user;

      const member = await guild.members.fetch(targetUser.id).catch(() => null);
      let statusMsg = '✅ Cargos removidos e membro expulso do Discord';

      if (member) {
        const rolesToRemove = member.roles.cache.filter(r => r.name !== '@everyone');
        if (rolesToRemove.size > 0) {
          await member.roles.remove(rolesToRemove).catch(() => {});
        }
        if (member.kickable) {
          await member.kick('Demissão efetuada por ' + staffUser.tag + ': ' + motivo).catch(() => {
            statusMsg = '⚠️ Cargos removidos, erro ao expulsar do Discord';
          });
        } else {
          statusMsg = '⚠️ Cargos removidos, membro tem cargo superior ao Bot';
        }
      } else {
        statusMsg = '⚠️ Membro não encontrado no servidor, log de demissão publicado';
      }

      try {
        const demChannel = await guild.channels.fetch(DEMISSAO_CHANNEL_ID).catch(() => null) || interaction.channel;
        const demEmbed = new EmbedBuilder()
          .setTitle('🔴 LS CUSTOMS — REGISTRO DE DEMISSÃO')
          .setDescription(
            "🚨 **INTEGRANTE DEMITIDO E REMOVIDO DO DISCORD**\n\n" +
            "👤 **MEMBRO DEMITIDO**: <@" + targetUser.id + "> (" + targetUser.tag + ")\n" +
            "🆔 **PASSAPORTE**: #" + passaporte + "\n" +
            "👑 **DEMITIDO POR**: <@" + staffUser.id + ">\n" +
            "📝 **MOTIVO**: " + motivo + "\n" +
            "🚪 **AÇÃO EXECUTADA**: " + statusMsg + "\n\n" +
            "📌 *Membro desvinculado oficialmente da equipe da LS CUSTOMS.*"
          )
          .setColor('#e74c3c')
          .setFooter({ text: 'Registro de Demissão • LS CUSTOMS' })
          .setTimestamp();

        if (demChannel) {
          await demChannel.send({ embeds: [demEmbed] });
        }
      } catch (err) {}

      return interaction.reply({
        content: "🚨 **Demissão concluída!** <@" + targetUser.id + "> foi removido do Discord e desvinculado da oficina.",
        ephemeral: true
      });
    }

    if (commandName === 'registrar') {
      const targetUser = options.getUser('membro');
      const nome = options.getString('nome');
      const passaporte = options.getString('passaporte');
      const cargo = options.getString('cargo');

      const member = await guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) {
        return interaction.reply({ content: '❌ Usuário não encontrado neste servidor!', ephemeral: true });
      }

      const roleObj = ROLES_CONFIG.find(r => r.name === cargo || (cargo.toLowerCase().includes('recruta') && (r.id === '1536304132980473896' || r.name.toLowerCase().includes('recruta'))));
      const tagCargo = roleObj ? roleObj.tag : cargo;
      const roleIdConfig = roleObj ? roleObj.id : (cargo.toLowerCase().includes('recruta') ? '1536304132980473896' : '');
      const novoNick = ("|" + tagCargo + "| " + nome + " | #" + passaporte).substring(0, 32);

      let nickStatus = '✅ Alterado com sucesso';
      let roleStatus = '✅ Cargo atribuído';

      if (member.manageable) {
        try {
          await member.setNickname(novoNick);
        } catch (e) {
          nickStatus = '⚠️ Sem permissão para alterar nick';
        }
      } else {
        nickStatus = '⚠️ Sem permissão para alterar nick (O bot precisa estar acima do membro nos cargos)';
      }

      const discordRole = (roleIdConfig ? guild.roles.cache.get(roleIdConfig) : null) ||
        (cargo.toLowerCase().includes('recruta') ? guild.roles.cache.get('1536304132980473896') : null) ||
        guild.roles.cache.find(r => 
          (roleIdConfig && r.id === roleIdConfig) ||
          r.name.toUpperCase().includes(cargo.toUpperCase()) || 
          cargo.toUpperCase().includes(r.name.toUpperCase()) ||
          (cargo.toLowerCase().includes('recruta') && r.name.toUpperCase().includes('RECRUTA'))
        );

      if (discordRole) {
        try {
          await member.roles.add(discordRole);
          roleStatus = '✅ Cargo ' + discordRole.name + ' atribuído com sucesso';
        } catch (e) {
          roleStatus = '⚠️ Erro ao adicionar cargo ' + discordRole.name + ' (Verifique hierarquia do bot)';
        }
      } else {
        roleStatus = '⚠️ Cargo ' + cargo + ' (ID: ' + (roleIdConfig || '1536304132980473896') + ') não encontrado no servidor';
      }

      const embed = new EmbedBuilder()
        .setTitle('📋 REGISTRO DE INTEGRANTE — LS CUSTOMS')
        .setDescription(
          "> **Novo integrante registrado com sucesso!**\n\n" +
          "👤 **NOME**: " + nome + "\n" +
          "🆔 **PASSAPORTE**: #" + passaporte + "\n" +
          "👑 **CARGO**: " + cargo + "\n" +
          "🎮 **USUÁRIO**: <@" + targetUser.id + ">\n" +
          "🏷️ **NICK DEFINIDO**: `" + novoNick + "`\n\n" +
          "⚙️ **Status Apelido**: " + nickStatus + "\n" +
          "⚙️ **Status Cargo**: " + roleStatus + "\n\n" +
          "🔧 **REGISTRADO POR**: " + user.username
        )
        .setColor('#2ecc71')
        .setFooter({ text: 'Bot Oficial • LS CUSTOMS' })
        .setTimestamp();

      return interaction.reply({ 
        content: "✅ Integrante <@" + targetUser.id + "> registrado e setado!", 
        embeds: [embed] 
      });
    }

    if (commandName === 'radio') {
      const embed = new EmbedBuilder()
        .setTitle('📻 RÁDIO OFICIAL — LS CUSTOMS')
        .setDescription(
          "⚙️ **ATENÇÃO EQUIPE E CLIENTES!**\n\n" +
          "Frequência oficial da LS CUSTOMS:\n\n" +
          "📻 **" + RADIO_FREQ + "**\n\n" +
          "🔧 Mecânicos em serviço devem permanecer conectados na rádio **" + RADIO_FREQ + "**."
        )
        .setColor('#2ecc71');

      return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'tabela') {
      const embed = new EmbedBuilder()
        .setTitle('💰 TABELA DE PREÇOS — LS CUSTOMS')
        .setDescription("**🛠️ ITENS**\nKit de Reparo Básico: **R$ 1.000** | Kit de Reparo Avançado: **R$ 2.500** | Chave Inglesa: **R$ 2.000** | Pneu: **R$ 500**\n\n**🚗 PERSONALIZAÇÃO**\nParachoque Dianteiro/Traseiro/Saias: **R$ 2.000** | Faróis Xenon: **R$ 3.500** | Placa Personalizada: **R$ 1.500** | Aerofólio: **R$ 2.000**\n\n**⚙️ PERFORMANCE**\nMotor Nível 1: **R$ 12.000** | Motor Nível 2: **R$ 18.000** | Motor Nível 3: **R$ 22.000** | Kit Turbo: **R$ 15.000**\n\n**🔩 SUSPENSÃO & FREIOS**\nFreios Nível 3: **R$ 18.000** | Suspensão a Ar Nível 4: **R$ 22.000**\n\n**🎨 PINTURA**\nPrimária/Secundária: **R$ 1.500** | Camaleão: **R$ 2.500**")
        .setColor('#f1c40f')
        .setFooter({ text: 'Tabela Sujeita a Alterações Sem Aviso Prévio • LS CUSTOMS' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

  } catch (error) {
    console.error('❌ Erro no comando:', error);
    const errorMsg = '❌ Ocorreu um erro ao executar este comando.';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMsg, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: errorMsg, ephemeral: true }).catch(() => {});
    }
  }
});

// 🚀 INICIALIZA O BOT NO DISCORD
client.login(DISCORD_TOKEN).catch(err => {
  console.error('❌ ERRO AO FAZER LOGIN NO DISCORD:', err.message);
});
