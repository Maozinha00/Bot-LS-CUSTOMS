// ========================================================
// 🔧 LS CUSTOMS DISCORD BOT OFFICIAL SCRIPT (discord.js v14)
// ========================================================
// Requisitos: node >= 18, discord.js ^14.14.0, dotenv
// Instale com: npm install discord.js dotenv

require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Registra os Slash Commands no Discord (incluindo o Bot de Registro)
const commands = [
  new SlashCommandBuilder()
    .setName('registrar')
    .setDescription('Registra um novo mecânico na LS Customs (Altera Nick, Cargo e Posta Registro)')
    .addUserOption(option => 
      option.setName('membro').setDescription('Selecione o usuário do Discord').setRequired(true))
    .addStringOption(option => 
      option.setName('nome').setDescription('Nome e Sobrenome In-Game').setRequired(true))
    .addStringOption(option => 
      option.setName('passaporte').setDescription('ID / Passaporte In-Game').setRequired(true))
    .addStringOption(option => 
      option.setName('cargo').setDescription('Cargo na LS Customs').setRequired(true)
        .addChoices(
          { name: '👑 LÍDER', value: 'LÍDER' },
          { name: '⭐ VICE-LÍDER', value: 'VICE-LÍDER' },
          { name: '🔧 MEMBRO', value: 'MEMBRO' },
          { name: '🔰 RECRUTA', value: 'RECRUTA' }
        )),

  new SlashCommandBuilder()
    .setName('abrir')
    .setDescription('Anuncia que a oficina da LS Customs está aberta 🟢'),

  new SlashCommandBuilder()
    .setName('fechar')
    .setDescription('Anuncia que a oficina da LS Customs está fechada 🔴'),

  new SlashCommandBuilder()
    .setName('anunciarmec')
    .setDescription('Envia um comunicado oficial da LS Customs')
    .addStringOption(option => 
      option.setName('titulo').setDescription('Título do comunicado').setRequired(true))
    .addStringOption(option => 
      option.setName('mensagem').setDescription('Conteúdo da mensagem').setRequired(true)),

  new SlashCommandBuilder()
    .setName('ponto')
    .setDescription('Registra início ou término de turno no bate-ponto'),

  new SlashCommandBuilder()
    .setName('tabela')
    .setDescription('Exibe a tabela oficial de preços da LS Customs'),

  new SlashCommandBuilder()
    .setName('radio')
    .setDescription('Lembrete da frequência oficial da rádio')
].map(cmd => cmd.toJSON());

client.once('ready', async () => {
  console.log(`🔥 LS CUSTOMS BOT Online como ${client.user.tag}!`);
  client.user.setActivity('🔧 LS CUSTOMS | Rádio 633', { type: 0 });

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('Registrando comandos Slash no Discord...');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ Comandos registrados com sucesso!');
  } catch (error) {
    console.error('Erro ao registrar comandos:', error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, user } = interaction;

  // 📋 COMANDO /registrar (BOT DE REGISTRO / SETAGEM)
  if (commandName === 'registrar') {
    const targetUser = options.getUser('membro');
    const nome = options.getString('nome');
    const passaporte = options.getString('passaporte');
    const cargo = options.getString('cargo');

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: '❌ Usuário não encontrado no servidor!', ephemeral: true });
    }

    const tagCargo = cargo === 'LÍDER' ? 'Líder' : cargo === 'VICE-LÍDER' ? 'Vice-Líder' : cargo === 'RECRUTA' ? 'Recruta' : 'Membro';
    const novoNick = `[${tagCargo}] ${nome} | #${passaporte}`.substring(0, 32);

    try {
      await member.setNickname(novoNick);
    } catch (e) {
      console.error('Erro ao alterar nickname:', e);
    }

    const role = interaction.guild.roles.cache.find(r => r.name.toUpperCase().includes(cargo.toUpperCase()));
    if (role) {
      try {
        await member.roles.add(role);
      } catch (e) {
        console.error('Erro ao atribuir cargo:', e);
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('📋 REGISTRO DE INTEGRANTE — LS CUSTOMS')
      .setDescription(`> **Novo integrante registrado com sucesso!**\n\n👤 **NOME**: ${nome}\n🆔 **PASSAPORTE**: #${passaporte}\n👑 **CARGO**: ${cargo}\n🎮 **USUÁRIO**: <@${targetUser.id}>\n🏷️ **NICK ATUALIZADO**: \`${novoNick}\`\n\n🔧 **REGISTRADO POR**: ${user.username}`)
      .setColor('#2ecc71')
      .setFooter({ text: 'Bot de Registro Automático • LS Customs' })
      .setTimestamp();

    return interaction.reply({ content: `✅ Integrante <@${targetUser.id}> registrado e setado com sucesso!`, embeds: [embed] });
  }

  // 🟢 COMANDO /abrir
  if (commandName === 'abrir') {
    const embed = new EmbedBuilder()
      .setTitle('🔧 LS CUSTOMS — ABERTA 🟢')
      .setDescription(`🚨 **A LS CUSTOMS ESTÁ ABERTA!**\n\n🔧 Já estamos realizando atendimentos!\n\n🚗 Reparos\n🏎️ Performance\n🎨 Customização\n🛞 Personalização\n\n📍 Passe na LS Customs e deixe seu veículo no estilo!\n\n🔥 **LS CUSTOMS**\n*Seu carro, nosso trabalho!*`)
      .setColor('#2ecc71')
      .setFooter({ text: `Aberto por ${user.username}` })
      .setTimestamp();

    return interaction.reply({ content: '@everyone 🚨 A LS CUSTOMS ESTÁ ABERTA!', embeds: [embed] });
  }

  // 🔴 COMANDO /fechar
  if (commandName === 'fechar') {
    const embed = new EmbedBuilder()
      .setTitle('🔧 LS CUSTOMS — FECHADA 🔴')
      .setDescription(`🚨 **A LS CUSTOMS ESTÁ FECHADA!**\n\n⛔ No momento, não estamos realizando atendimentos.\n📢 Aguarde o próximo aviso de abertura.\n\n🔥 **LS CUSTOMS**\n*Até breve!*`)
      .setColor('#e74c3c')
      .setFooter({ text: `Fechado por ${user.username}` })
      .setTimestamp();

    return interaction.reply({ content: '🚨 A LS Customs fechou no momento.', embeds: [embed] });
  }

  // 📢 COMANDO /anunciarmec
  if (commandName === 'anunciarmec') {
    const titulo = options.getString('titulo');
    const mensagem = options.getString('mensagem');

    const embed = new EmbedBuilder()
      .setTitle(`📢 ${titulo}`)
      .setDescription(mensagem)
      .setColor('#9b59b6')
      .setFooter({ text: `Comunicado enviado por ${user.username} • LS Customs` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  // 📻 COMANDO /radio
  if (commandName === 'radio') {
    const embed = new EmbedBuilder()
      .setTitle('📻 RÁDIO OFICIAL — LS CUSTOMS')
      .setDescription(`⚙️ **ATENÇÃO, EQUIPE!**\n\nA frequência oficial da LS Customs é:\n\n📻 **633**\n\n🔧 É obrigatório que todos os funcionários em serviço estejam conectados na frequência **633**.`)
      .setColor('#2ecc71');

    return interaction.reply({ embeds: [embed] });
  }

  // 💰 COMANDO /tabela
  if (commandName === 'tabela') {
    const embed = new EmbedBuilder()
      .setTitle('💰 TABELA DE PREÇOS — LS CUSTOMS')
      .setDescription(`🛠️ **REPAROS**: Reparo R$5.000 | Kit R$3.500 | Reboque R$4.000\n🏎️ **MOTOR**: N1 R$15k | N2 R$30k | N3 R$50k | N4 R$80k\n⚙️ **FREIOS**: N1 R$8k | N2 R$18k | N3 R$32k\n⚡ **CÂMBIO**: N1 R$12k | N2 R$25k | N3 R$45k\n🔩 **SUSPENSÃO**: N1 R$10k | N2 R$22k | N3 (Ar) R$40k\n🎨 **PINTURA**: Primária R$7k | Secundária R$5k`)
      .setColor('#f1c40f');

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // 🕐 COMANDO /ponto
  if (commandName === 'ponto') {
    const embed = new EmbedBuilder()
      .setTitle('🕐 REGISTRO DE BATE-PONTO')
      .setDescription(`Mecânico **${user.username}** registrou movimentação no ponto!\n\n⚠️ Lembre-se de manter o uniforme oficial e estar conectado na **Rádio 633**.`)
      .setColor('#3498db')
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
});

client.login(process.env.DISCORD_TOKEN);
