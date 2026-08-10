// ========================================================
// 🔧 LS CUSTOMS DISCORD BOT OFFICIAL SCRIPT (discord.js v14)
// Otimizado para Railway - Pronto para rodar sem erros!
// ========================================================

// Tente carregar dotenv se existir, sem travar caso não exista
try {
  require('dotenv').config();
} catch (e) {
  // Ignora erro do dotenv se rodando diretamente
}

const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

// 🔑 CONFIGURAÇÃO DO TOKEN E SERVIDOR
// Se você preencheu o Token diretamente, ele usará. Senão, pegará das Variáveis de Ambiente do Railway.
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'COLE_SEU_TOKEN_AQUI';
const GUILD_ID = process.env.GUILD_ID || ''; // Opcional: ID do Servidor para atualização INSTÂNTANEA dos comandos

// Inicialização do Client com as permissões corretas (Intents)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Banco de dados em memória para registrar horários de bate-ponto (/ponto)
const pontosAtivos = new Map();

// 📜 REGISTRO DOS COMANDOS SLASH
const commands = [
  new SlashCommandBuilder()
    .setName('painelregistro')
    .setDescription('Envia o painel fixo com botão para os membros solicitarem registro'),

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
    .setName('abrir')
    .setDescription('Anuncia que a oficina da LS CUSTOMS está ABERTA 🟢'),

  new SlashCommandBuilder()
    .setName('fechar')
    .setDescription('Anuncia que a oficina da LS CUSTOMS está FECHADA 🔴'),

  new SlashCommandBuilder()
    .setName('anunciarmec')
    .setDescription('Envia um comunicado oficial da LS CUSTOMS')
    .addStringOption(option => 
      option.setName('titulo').setDescription('Título do comunicado').setRequired(true))
    .addStringOption(option => 
      option.setName('mensagem').setDescription('Conteúdo da mensagem').setRequired(true)),

  new SlashCommandBuilder()
    .setName('ponto')
    .setDescription('Inicia ou finaliza o seu turno no bate-ponto com cálculo de tempo'),

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

  client.user.setActivity('🔧 LS CUSTOMS | Rádio 633', { type: 0 });

  if (!DISCORD_TOKEN || DISCORD_TOKEN === 'COLE_SEU_TOKEN_AQUI' || DISCORD_TOKEN === 'SEU_DISCORD_TOKEN_AQUI') {
    console.error('❌ ERRO CRÍTICO: Token do Discord não foi configurado!');
    console.error('👉 Defina a variável DISCORD_TOKEN ou insira o Token diretamente no código.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  try {
    console.log('⚙️ Registrando comandos Slash no Discord...');
    
    if (GUILD_ID && GUILD_ID.trim() !== '') {
      // Registro no servidor específico (Atualização IMEDIATA)
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, GUILD_ID.trim()),
        { body: commands }
      );
      console.log("✅ Comandos registrados com sucesso no Servidor ID: " + GUILD_ID);
    } else {
      // Registro Global (Pode levar até 1 hora para propagar em todos os servidores)
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: commands }
      );
      console.log('✅ Comandos globais registrados com sucesso no Discord!');
    }
  } catch (error) {
    console.error('❌ Erro ao registrar comandos no Discord:', error);
  }
});

// ⚡ GERENCIADOR DE INTERAÇÕES (COMANDOS SLASH, BOTÕES E MODAIS)
client.on('interactionCreate', async interaction => {
  try {
    // 1️⃣ CLIQUE NO BOTÃO "SOLICITAR SET DE RECRUTA"
    if (interaction.isButton() && interaction.customId === 'btn_solicitar_registro') {
      const modal = new ModalBuilder()
        .setCustomId('modal_registro')
        .setTitle('Set de Recruta — LS CUSTOMS');

      const nomeInput = new TextInputBuilder()
        .setCustomId('reg_nome')
        .setLabel('Nome e Sobrenome In-Game')
        .setPlaceholder('Ex: João Silva')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const passaporteInput = new TextInputBuilder()
        .setCustomId('reg_passaporte')
        .setLabel('Passaporte / ID In-Game')
        .setPlaceholder('Ex: 1234')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(nomeInput),
        new ActionRowBuilder().addComponents(passaporteInput)
      );

      return await interaction.showModal(modal);
    }

    // 2️⃣ PROCESSAMENTO DO FORMULÁRIO DE RECRUTA ENVIADO
    if (interaction.isModalSubmit() && interaction.customId === 'modal_registro') {
      const nome = interaction.fields.getTextInputValue('reg_nome');
      const passaporte = interaction.fields.getTextInputValue('reg_passaporte');

      const member = interaction.member;
      const guild = interaction.guild;

      // Localiza o cargo de Recruta/Novato na lista de cargos configurados
      const roleObj = [{"name":"👑 LÍDER","tag":"Líder","color":"#f1c40f"},{"name":"⭐ VICE-LÍDER","tag":"Vice-Líder","color":"#e67e22"},{"name":"🛠️ GERENTE","tag":"Gerente","color":"#1abc9c"},{"name":"🔧 MEMBRO","tag":"Membro","color":"#3498db"},{"name":"🔰 RECRUTA","tag":"Recruta","color":"#95a5a6"}].find(r => 
        r.name.toLowerCase().includes('recruta') || 
        r.name.toLowerCase().includes('novato') || 
        r.tag.toLowerCase().includes('rec')
      ) || [{"name":"👑 LÍDER","tag":"Líder","color":"#f1c40f"},{"name":"⭐ VICE-LÍDER","tag":"Vice-Líder","color":"#e67e22"},{"name":"🛠️ GERENTE","tag":"Gerente","color":"#1abc9c"},{"name":"🔧 MEMBRO","tag":"Membro","color":"#3498db"},{"name":"🔰 RECRUTA","tag":"Recruta","color":"#95a5a6"}][4] || { name: 'Recruta', tag: 'REC' };

      const tagCargo = roleObj.tag || 'REC';
      const cargoNomeFinal = roleObj.name || 'Recruta';
      const novoNick = ("[" + tagCargo + "] " + nome + " | #" + passaporte).substring(0, 32);

      let nickStatus = '✅ Alterado com sucesso';
      let roleStatus = '✅ Cargo atribuído';

      if (member && member.manageable) {
        try {
          await member.setNickname(novoNick);
        } catch (e) {
          nickStatus = '⚠️ Erro ao alterar (cargo do Bot precisa estar acima do usuário)';
        }
      } else {
        nickStatus = '⚠️ Não foi possível alterar (Usuário é Dono do Servidor ou tem cargo maior)';
      }

      const discordRole = guild ? guild.roles.cache.find(r => 
        r.name.toUpperCase().includes(cargoNomeFinal.toUpperCase()) || 
        cargoNomeFinal.toUpperCase().includes(r.name.toUpperCase())
      ) : null;

      if (discordRole && member) {
        try {
          await member.roles.add(discordRole);
        } catch (e) {
          roleStatus = '⚠️ Erro ao adicionar cargo (verifique hierarquia de cargos)';
        }
      } else {
        roleStatus = '⚠️ Cargo ' + cargoNomeFinal + ' não foi encontrado no servidor';
      }

      const embed = new EmbedBuilder()
        .setTitle('📋 SET DE RECRUTA CONCEDIDO — LS CUSTOMS')
        .setDescription(
          "> **Novo Recruta registrado com sucesso!**\n\n" +
          "👤 **NOME**: " + nome + "\n" +
          "🆔 **PASSAPORTE**: #" + passaporte + "\n" +
          "🔰 **CARGO**: " + cargoNomeFinal + "\n" +
          "🎮 **USUÁRIO**: <@" + interaction.user.id + ">\n" +
          "🏷️ **NICK DEFINIDO**: `" + novoNick + "`\n\n" +
          "⚙️ **Status Apelido**: " + nickStatus + "\n" +
          "⚙️ **Status Cargo**: " + roleStatus
        )
        .setColor('#2ecc71')
        .setFooter({ text: 'Bot Oficial • LS CUSTOMS' })
        .setTimestamp();

      await interaction.reply({
        content: "✅ Seu **Set de Recruta** na **LS CUSTOMS** foi processado com sucesso!",
        embeds: [embed],
        ephemeral: true
      });

      // Envia notificação no canal público de registro
      try {
        await interaction.channel.send({
          content: "🎉 Novo Recruta na equipe: <@" + interaction.user.id + "> -> `" + novoNick + "` (" + cargoNomeFinal + ")"
        });
      } catch (e) {}

      return;
    }

    // 3️⃣ COMANDOS SLASH
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, user, guild } = interaction;

    // 📋 COMANDO /painelregistro
    if (commandName === 'painelregistro') {
      const embed = new EmbedBuilder()
        .setTitle('🔧 BEM-VINDO À ' + 'LS CUSTOMS'.toUpperCase())
        .setDescription(
          "Seja muito bem-vindo(a) à **LS CUSTOMS**!\n\n" +
          "🚗 **Aqui trabalhamos com:**\n" +
          "• Mecânica Geral & Manutenção\n" +
          "• Reparos de Lataria e Engine\n" +
          "• Personalização e Bodykits\n" +
          "• Performance & Tuning\n" +
          "• Pinturas e Acabamentos\n\n" +
          "📜 **Antes de iniciar suas atividades ou solicitar atendimentos, leia atentamente as regras e frequências do servidor.**\n\n" +
          "👉 **Para solicitar seu Set de Recruta, clique no botão abaixo:**\n" +
          "1️⃣ Nome e Sobrenome In-Game\n" +
          "2️⃣ Passaporte / ID In-Game\n\n" +
          "⚙️ *O Bot alterará seu apelido para `[REC] Nome | #ID` e concederá o cargo de Recruta automaticamente!*\n\n" +
          "🔧 **LS CUSTOMS** — *Respeito • Organização • Compromisso*"
        )
        .setColor('#2ecc71')
        .setFooter({ text: 'LS CUSTOMS — Qualidade e Desempenho Excepcionais' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('btn_solicitar_registro')
          .setLabel('📋 Solicitar Set de Recruta')
          .setStyle(ButtonStyle.Primary)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    // 📋 COMANDO /registrar
    if (commandName === 'registrar') {
      const targetUser = options.getUser('membro');
      const nome = options.getString('nome');
      const passaporte = options.getString('passaporte');
      const cargo = options.getString('cargo');

      const member = await guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) {
        return interaction.reply({ content: '❌ Usuário não encontrado neste servidor!', ephemeral: true });
      }

      // Encontra a tag resumida do cargo
      const roleObj = [{"name":"👑 LÍDER","tag":"Líder","color":"#f1c40f"},{"name":"⭐ VICE-LÍDER","tag":"Vice-Líder","color":"#e67e22"},{"name":"🛠️ GERENTE","tag":"Gerente","color":"#1abc9c"},{"name":"🔧 MEMBRO","tag":"Membro","color":"#3498db"},{"name":"🔰 RECRUTA","tag":"Recruta","color":"#95a5a6"}].find(r => r.name === cargo);
      const tagCargo = roleObj ? roleObj.tag : 'Membro';
      const novoNick = ("[" + tagCargo + "] " + nome + " | #" + passaporte).substring(0, 32);

      let nickStatus = '✅ Alterado com sucesso';
      let roleStatus = '✅ Cargo atribuído';

      // Altera o apelido (trata erros de permissão ou dono do servidor)
      if (member.manageable) {
        try {
          await member.setNickname(novoNick);
        } catch (e) {
          nickStatus = '⚠️ Sem permissão (cargo do Bot precisa estar acima do usuário)';
        }
      } else {
        nickStatus = '⚠️ Não foi possível alterar (Usuário é Dono do Servidor ou tem cargo maior)';
      }

      // Atribui o cargo correspondente no Discord
      const discordRole = guild.roles.cache.find(r => 
        r.name.toUpperCase().includes(cargo.toUpperCase()) || 
        cargo.toUpperCase().includes(r.name.toUpperCase())
      );

      if (discordRole) {
        try {
          await member.roles.add(discordRole);
        } catch (e) {
          roleStatus = '⚠️ Erro ao adicionar cargo (Verifique a hierarquia dos cargos)';
        }
      } else {
        roleStatus = '⚠️ Cargo com esse nome não foi encontrado no servidor';
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

    // 🟢 COMANDO /abrir
    if (commandName === 'abrir') {
      const embed = new EmbedBuilder()
        .setTitle('🔧 LS CUSTOMS — ABERTA 🟢')
        .setDescription(
          "🚨 **A LS CUSTOMS ESTÁ ABERTA!**\n\n" +
          "🔧 Já estamos realizando atendimentos!\n\n" +
          "🚗 Reparos e Revisões\n" +
          "🏎️ Kits de Performance\n" +
          "🎨 Pintura e Estética\n" +
          "🛞 Pneus e Suspensão\n\n" +
          "📍 Frequência da Rádio: **633**\n" +
          "📍 Venha até a oficina e deixe seu veículo no estilo!\n\n" +
          "🔥 **LS CUSTOMS**\n*Seu carro, nosso compromisso!*"
        )
        .setColor('#2ecc71')
        .setFooter({ text: "Aberto por " + user.username })
        .setTimestamp();

      return interaction.reply({ content: '@everyone 🚨 A OFICINA ESTÁ ABERTA!', embeds: [embed] });
    }

    // 🔴 COMANDO /fechar
    if (commandName === 'fechar') {
      const embed = new EmbedBuilder()
        .setTitle('🔧 LS CUSTOMS — FECHADA 🔴')
        .setDescription(
          "🚨 **A LS CUSTOMS ESTÁ FECHADA!**\n\n" +
          "⛔ No momento encerramos os atendimentos do turno.\n" +
          "📢 Fique atento ao canal para o próximo aviso de abertura.\n\n" +
          "🔥 **LS CUSTOMS**\n*Obrigado pela preferência e até breve!*"
        )
        .setColor('#e74c3c')
        .setFooter({ text: "Fechado por " + user.username })
        .setTimestamp();

      return interaction.reply({ content: '🚨 A oficina fechou no momento.', embeds: [embed] });
    }

    // 📢 COMANDO /anunciarmec
    if (commandName === 'anunciarmec') {
      const titulo = options.getString('titulo');
      const mensagem = options.getString('mensagem');

      const embed = new EmbedBuilder()
        .setTitle("📢 " + titulo)
        .setDescription(mensagem)
        .setColor('#9b59b6')
        .setFooter({ text: "Comunicado Oficial • " + user.username })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // 📻 COMANDO /radio
    if (commandName === 'radio') {
      const embed = new EmbedBuilder()
        .setTitle('📻 RÁDIO OFICIAL — LS CUSTOMS')
        .setDescription(
          "⚙️ **ATENÇÃO EQUIPE E CLIENTES!**\n\n" +
          "Frequência oficial da LS CUSTOMS:\n\n" +
          "📻 **633**\n\n" +
          "🔧 Mecânicos em serviço devem permanecer conectados na rádio **633**."
        )
        .setColor('#2ecc71');

      return interaction.reply({ embeds: [embed] });
    }

    // 💰 COMANDO /tabela
    if (commandName === 'tabela') {
      const embed = new EmbedBuilder()
        .setTitle('💰 TABELA DE PREÇOS — LS CUSTOMS')
        .setDescription("**🛠️ REPAROS**\nReparo Geral: **R$ 5.000** | Kit de Reparo: **R$ 3.500** | Serviço de Reboque: **R$ 4.000**\n\n**🏎️ MOTOR**\nMotor Nível 1: **R$ 15.000** | Motor Nível 2: **R$ 30.000** | Motor Nível 3: **R$ 50.000** | Motor Nível 4 (Turbo): **R$ 80.000**\n\n**⚙️ FREIOS**\nFreios N1: **R$ 8.000** | Freios N2: **R$ 18.000** | Freios N3 (Esportivo): **R$ 32.000**\n\n**🔩 SUSPENSÃO**\nSuspensão N1: **R$ 10.000** | Suspensão Ar / Hidráulica: **R$ 40.000**\n\n**🎨 PINTURA**\nPintura Primária: **R$ 7.000** | Pintura Secundária: **R$ 5.000**")
        .setColor('#f1c40f')
        .setFooter({ text: 'Tabela Sujeita a Alterações Sem Aviso Prévio' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // 🕐 COMANDO /ponto
    if (commandName === 'ponto') {
      const now = new Date();
      const userId = user.id;

      if (pontosAtivos.has(userId)) {
        // Finaliza o ponto e calcula tempo em serviço
        const startTime = pontosAtivos.get(userId);
        pontosAtivos.delete(userId);

        const diffMs = now.getTime() - startTime.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;

        const durationStr = hours > 0 ? (hours + "h " + mins + "m") : (mins + " minuto(s)");

        const embed = new EmbedBuilder()
          .setTitle('🔴 BATE-PONTO — TURNO FINALIZADO')
          .setDescription(
            "👤 **Mecânico**: <@" + userId + ">\n" +
            "⏱️ **Tempo em Serviço**: `" + durationStr + "`\n" +
            "📅 **Entrada**: " + startTime.toLocaleTimeString('pt-BR') + "\n" +
            "📅 **Saída**: " + now.toLocaleTimeString('pt-BR') + "\n\n" +
            "✅ Turno encerrado com sucesso. Bom descanso!"
          )
          .setColor('#e74c3c')
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      } else {
        // Inicia o ponto
        pontosAtivos.set(userId, now);

        const embed = new EmbedBuilder()
          .setTitle('🟢 BATE-PONTO — TURNO INICIADO')
          .setDescription(
            "👤 **Mecânico**: <@" + userId + ">\n" +
            "⏰ **Horário de Entrada**: " + now.toLocaleTimeString('pt-BR') + "\n" +
            "📻 **Rádio Obrigatória**: **633**\n\n" +
            "⚠️ Lembre-se de estar com o uniforme oficial da **LS CUSTOMS**!"
          )
          .setColor('#2ecc71')
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }
    }

  } catch (error) {
    console.error('❌ Erro no processamento do comando:', error);
    const errorMsg = '❌ Ocorreu um erro interno ao executar este comando.';
    
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
  console.error('💡 Verifique se seu Token é válido e se as INTENTS de Membros estão ativadas no Discord Portal!');
});
