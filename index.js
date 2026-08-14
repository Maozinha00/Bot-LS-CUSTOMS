/**
 * ============================================================================
 * 🔧 BOT OFICIAL UNIFICADO — LOS SANTOS CUSTOMS (MECÂNICA FIVE-M)
 * Sistema Completo: Advertências, Ausências, Bate-Ponto, Recrutamento & Comandos
 * Versão: 2.5.0 • Discord.js v14
 * ============================================================================
 */

require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
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
  Events,
  PermissionsBitField
} = require('discord.js');

// ==========================================
// 🔑 CONFIGURAÇÕES & IDS DA LS CUSTOMS
// ==========================================
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN || 'SEU_TOKEN_AQUI';
const GUILD_ID = process.env.GUILD_ID || '1535806745816072245';
const PORT = process.env.PORT || 3001;
const PREFIX = '!';

const CONFIG_LS = {
  // Canais
  canalAdvId: process.env.CANAL_ADV_ID || '1536304172952191049',
  canalLogsAdvId: process.env.CANAL_LOGS_ADV_ID || '1536333810629607514',
  canalPainelAusenciaId: process.env.CANAL_PAINEL_AUSENCIA_ID || '1537852669853438032',
  canalLogsAusenciaId: process.env.CANAL_LOGS_AUSENCIA_ID || '1537852751726510181',
  canalLogsEntradaSaidaId: process.env.CANAL_LOGS_ENTRADA_SAIDA_ID || '1536304188105949244',
  canalLogsRecrutamentoId: process.env.CANAL_LOGS_RECRUTAMENTO_ID || '1536308230936993792',
  canalPontoId: process.env.CANAL_PONTO_ID || '1536309622699466772',
  canalDemissaoId: process.env.CANAL_DEMISSAO_ID || '1536304188609400955',

  // Cargos
  cargoLiderancaId: process.env.CARGO_LIDERANCA_ID || '1536304128912003112',
  cargoMecanicoId: process.env.CARGO_MECANICO_ID || '1536304130000000001',
  cargoRecrutaId: process.env.CARGO_RECRUTA_ID || '1536304131000000002',
  cargoAusenteId: process.env.CARGO_AUSENTE_ID || '1536304132000000003',
  cargoAdvVerbalLeveId: process.env.CARGO_ADV_LEVE_ID || '1536526429897097246',
  cargoAdvMediaId: process.env.CARGO_ADV_MEDIA_ID || '1536304134746275861',
  cargoAdvGraveId: process.env.CARGO_ADV_GRAVE_ID || '1536304135517773834',
  cargoDemitidoId: process.env.CARGO_DEMITIDO_ID || '1536304136000000004',

  // Visual
  corLS: '#2ECC71',
  corAusencia: '#E67E22',
  corAdv: '#EF4444',
  corPonto: '#3B82F6',
  bannerUrl: 'https://i.imgur.com/Vv2juos.jpeg',
  rodape: 'LS CUSTOMS • Setor Disciplinar, Ausências & Recrutamento'
};

// ==========================================
// 🗄️ BANCO DE DADOS LOCAL (JSON)
// ==========================================
const DB_FILE = path.join(__dirname, 'ls_database.json');
let db = { advertencias: {}, ausencias: {}, pontos: {}, recrutamentos: {} };

function carregarBanco() {
  try {
    if (fs.existsSync(DB_FILE)) {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Erro ao ler banco local:', e.message);
  }
}

function salvarBanco() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erro ao salvar banco local:', e.message);
  }
}
carregarBanco();

// ==========================================
// 🛡️ VALIDAÇÃO ANTI-TROLL
// ==========================================
function validarCandidaturaAntiTroll(dados) {
  const { nome, passaporte, idadeDisp, exp, motivo } = dados;
  const passLimpo = passaporte ? passaporte.replace(/\D/g, '') : '';
  if (!passLimpo || parseInt(passLimpo) <= 0) {
    return { valido: false, motivo: 'Passaporte inválido! Digite apenas números.' };
  }
  if (!nome || nome.trim().length < 3) {
    return { valido: false, motivo: 'Nome RP de personagem muito curto.' };
  }
  const idadeMatch = (idadeDisp || '').match(/\d{1,2}/);
  if (idadeMatch) {
    const idadeNum = parseInt(idadeMatch[0]);
    if (idadeNum < 14 || idadeNum > 85) {
      return { valido: false, motivo: 'Idade inválida (Permitido entre 14 e 85 anos).' };
    }
  }
  if ((exp + motivo).length < 15) {
    return { valido: false, motivo: 'Respostas muito curtas. Detalhe sua experiência.' };
  }
  return { valido: true, passaporteNumerico: passLimpo };
}

// ==========================================
// 🌐 SERVIDOR WEB UPTIME (24/7)
// ==========================================
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h1>🔧 Bot LS Customs Online 24/7!</h1>');
});
server.listen(PORT, '0.0.0.0', () => console.log(`🌐 Servidor Uptime ativo na porta ${PORT}`));

// ==========================================
// 🤖 CLIENTE DISCORD
// ==========================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.User, Partials.Message]
});

const commands = [
  new SlashCommandBuilder().setName('paineladv').setDescription('Painel de Advertências Disciplinares'),
  new SlashCommandBuilder().setName('painelausencia').setDescription('Painel de Ausências & Licenças'),
  new SlashCommandBuilder().setName('painelregistro').setDescription('Painel de Recrutamento LS Customs'),
  new SlashCommandBuilder().setName('painelponto').setDescription('Painel de Bate-Ponto Eletrônico'),
  new SlashCommandBuilder().setName('verificarvencidas').setDescription('Verifica ausências expiradas'),
  new SlashCommandBuilder().setName('minhasadvs').setDescription('Consulta suas advertências'),
  new SlashCommandBuilder().setName('tabela').setDescription('Tabela Oficial de Preços LS Customs'),
  new SlashCommandBuilder().setName('radio').setDescription('Frequências de Rádio e Códigos Q'),
  new SlashCommandBuilder()
    .setName('demitir')
    .setDescription('Exonera um membro da mecânica (Liderança)')
    .addUserOption(o => o.setName('membro').setDescription('Membro a demitir').setRequired(true))
    .addStringOption(o => o.setName('passaporte').setDescription('Passaporte RP').setRequired(true))
    .addStringOption(o => o.setName('motivo').setDescription('Motivo da demissão').setRequired(true))
    .addStringOption(o => o.setName('provas').setDescription('Link de provas').setRequired(false))
];

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Bot conectado como: ${c.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationGuildCommands(c.user.id, GUILD_ID), { body: commands });
    console.log('✅ Slash Commands registrados!');
  } catch (e) {
    console.error('Erro ao registrar slash commands:', e);
  }

  // Rotina de checagem automática de ausências a cada 10 minutos
  setInterval(() => verificarAusenciasAutomatico(), 10 * 60 * 1000);
});

// ==========================================
// ⏰ ROTINA DE AUSÊNCIAS EXPIRADAS
// ==========================================
async function verificarAusenciasAutomatico() {
  const agora = Date.now();
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;

  for (const [userId, dados] of Object.entries(db.ausencias)) {
    if (dados.status === 'ATIVA' && agora > dados.vencimento) {
      dados.status = 'VENCIDA';
      salvarBanco();

      // Aplica ADV Grave automática por abandono
      await aplicarAdvertencia(
        guild,
        userId,
        dados.passaporte,
        'GRAVE',
        'Ausência expirada sem retorno ou aviso à Liderança (Abandono de Função).',
        'Sistema Automático',
        'Sistema de Ausências'
      );
    }
  }
}

// ==========================================
// ⚠️ APLICAÇÃO DE ADVERTÊNCIAS & 3 ADVs
// ==========================================
async function aplicarAdvertencia(guild, userId, passaporte, tipo, motivo, provas, autorTag) {
  if (!db.advertencias[userId]) {
    db.advertencias[userId] = { pontos: 0, historico: [] };
  }

  let pontosGanhos = tipo === 'GRAVE' ? 3 : tipo === 'MEDIA' ? 2 : 1;
  let cargoParaAdicionar = tipo === 'GRAVE' ? CONFIG_LS.cargoAdvGraveId : tipo === 'MEDIA' ? CONFIG_LS.cargoAdvMediaId : CONFIG_LS.cargoAdvVerbalLeveId;

  db.advertencias[userId].pontos += pontosGanhos;
  const registro = {
    passaporte,
    tipo,
    pontosGanhos,
    motivo,
    provas: provas || 'Nenhuma prova anexada.',
    autor: autorTag,
    data: new Date().toLocaleString('pt-BR')
  };

  db.advertencias[userId].historico.push(registro);
  salvarBanco();

  // Atribui cargo no Discord
  try {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member && cargoParaAdicionar) await member.roles.add(cargoParaAdicionar).catch(() => null);
  } catch (e) {}

  // Log no canal de ADV
  const canalLogs = guild.channels.cache.get(CONFIG_LS.canalLogsAdvId) || guild.channels.cache.get(CONFIG_LS.canalAdvId);
  if (canalLogs) {
    const embedAdv = new EmbedBuilder()
      .setColor(CONFIG_LS.corAdv)
      .setTitle(`⚠️ ADVERTÊNCIA DISCIPLINA — ${tipo}`)
      .setDescription(
        `👤 **Membro:** <@${userId}>\n` +
        `🆔 **Passaporte:** \`\`${passaporte}\`\`\n` +
        `📊 **Gravidade:** \`\`${tipo}\`\` (+${pontosGanhos} ponto(s))\n` +
        `📈 **Total Atual:** \`\`${db.advertencias[userId].pontos}/3\`\` ADVs\n\n` +
        `📝 **Motivo:** ${motivo}\n` +
        `🔗 **Provas:** ${provas || 'Nenhuma'}\n` +
        `👮 **Aplicado por:** ${autorTag}`
      )
      .setImage(CONFIG_LS.bannerUrl)
      .setFooter({ text: CONFIG_LS.rodape })
      .setTimestamp();
    canalLogs.send({ embeds: [embedAdv] });
  }

  // Notifica Membro via DM
  try {
    const user = await client.users.fetch(userId);
    if (user) {
      user.send({
        embeds: [
          new EmbedBuilder()
            .setColor(CONFIG_LS.corAdv)
            .setTitle('⚠️ VOCÊ RECEBEU UMA ADVERTÊNCIA — LS CUSTOMS')
            .setDescription(`**Tipo:** ${tipo}\n**Motivo:** ${motivo}\n**Total:** ${db.advertencias[userId].pontos}/3 ADVs.`)
        ]
      }).catch(() => null);
    }
  } catch (e) {}

  // ⛔ EXONERAÇÃO AUTOMÁTICA EM 3 ADVs OU GRAVE
  if (db.advertencias[userId].pontos >= 3 || tipo === 'GRAVE') {
    await executarDemissao(
      guild, 
      userId, 
      passaporte, 
      `Exoneração automática por acúmulo de advertências (${db.advertencias[userId].pontos}/3 ADVs).`,
      'Sistema Disciplinar Automático'
    );
  }
}

// ==========================================
// 🛑 EXECUÇÃO DE DEMISSÃO
// ==========================================
async function executarDemissao(guild, userId, passaporte, motivo, autorTag) {
  try {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member) {
      const cargosRemover = [
        CONFIG_LS.cargoMecanicoId,
        CONFIG_LS.cargoRecrutaId,
        CONFIG_LS.cargoAusenteId,
        CONFIG_LS.cargoAdvVerbalLeveId,
        CONFIG_LS.cargoAdvMediaId,
        CONFIG_LS.cargoAdvGraveId
      ];
      for (const c of cargosRemover) {
        if (c && member.roles.cache.has(c)) await member.roles.remove(c).catch(() => null);
      }
      if (CONFIG_LS.cargoDemitidoId) await member.roles.add(CONFIG_LS.cargoDemitidoId).catch(() => null);
    }

    const canalDemissao = guild.channels.cache.get(CONFIG_LS.canalDemissaoId);
    if (canalDemissao) {
      const embedDemissao = new EmbedBuilder()
        .setColor('#000000')
        .setTitle('⛔ EXONERAÇÃO / DEMISSÃO — LS CUSTOMS')
        .setDescription(
          `👤 **Ex-Funcionário:** <@${userId}>\n` +
          `🆔 **Passaporte:** \`\`${passaporte}\`\`\n` +
          `📋 **Motivo:** ${motivo}\n` +
          `👮 **Responsável:** ${autorTag}`
        )
        .setImage(CONFIG_LS.bannerUrl)
        .setTimestamp();
      canalDemissao.send({ embeds: [embedDemissao] });
    }
  } catch (err) {
    console.error('Erro na demissão:', err);
  }
}

// ==========================================
// 📨 COMANDOS POR PREFIXO
// ==========================================
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  if (message.content === '!painel-adv') {
    const embed = new EmbedBuilder()
      .setColor(CONFIG_LS.corAdv)
      .setTitle('⚠️ SETOR DISCIPLINAR — LS CUSTOMS')
      .setDescription(
        `🟡 **LEVE (1 Ponto):** Atrasos / Uniforme / Rádio.\n` +
        `🟠 **MÉDIA (2 Pontos):** Desobediência / Condução perigosa.\n` +
        `🔴 **GRAVE (3 Pontos):** Cobrança fora da tabela / Abandono.\n\n` +
        `⛔ **3 Advertências = Exoneração Imediata!**`
      )
      .setImage(CONFIG_LS.bannerUrl);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_abrir_modal_adv').setLabel('⚠️ Aplicar ADV').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('btn_consultar_minhas_advs').setLabel('📋 Minhas ADVs').setStyle(ButtonStyle.Secondary)
    );
    await message.channel.send({ embeds: [embed], components: [row] });
  }

  if (message.content === '!painel-ausencia') {
    const embed = new EmbedBuilder()
      .setColor(CONFIG_LS.corAusencia)
      .setTitle('🌴 REGISTRO DE AUSÊNCIAS (MÁX 5 DIAS)')
      .setDescription('Registre sua licença. Se o prazo vencer sem retorno, haverá ADV Grave automática.')
      .setImage(CONFIG_LS.bannerUrl);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_abrir_modal_ausencia').setLabel('🌴 Solicitar Ausência').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('btn_informar_retorno_ausencia').setLabel('↩️ Informar Retorno').setStyle(ButtonStyle.Success)
    );
    await message.channel.send({ embeds: [embed], components: [row] });
  }

  if (message.content === '!painel-registro' || message.content === '!registro') {
    const embed = new EmbedBuilder()
      .setColor(CONFIG_LS.corLS)
      .setTitle('⚙️ RECRUTAMENTO OFICIAL — LS CUSTOMS')
      .setDescription('Deseja fazer parte da melhor oficina mecânica? Clique no botão abaixo para candidatar-se!')
      .setImage(CONFIG_LS.bannerUrl);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_iniciar_recrutamento').setLabel('📝 Iniciar Candidatura').setStyle(ButtonStyle.Success)
    );
    await message.channel.send({ embeds: [embed], components: [row] });
  }

  if (message.content === '!painel-ponto' || message.content === '!ponto') {
    const embed = new EmbedBuilder()
      .setColor(CONFIG_LS.corPonto)
      .setTitle('⏱️ BATE-PONTO ELETRÔNICO — LS CUSTOMS')
      .setDescription('Abra e encerre seu plantão de serviço na mecânica.')
      .setImage(CONFIG_LS.bannerUrl);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_ponto_entrar').setLabel('🟢 Iniciar Ponto').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('btn_ponto_finalizar').setLabel('🔴 Finalizar Ponto').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('btn_ponto_consultar').setLabel('📊 Minhas Horas').setStyle(ButtonStyle.Primary)
    );
    await message.channel.send({ embeds: [embed], components: [row] });
  }
});

// ==========================================
// 🖱️ TRATAMENTO DE INTERAÇÕES
// ==========================================
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // 1. SLASH COMMANDS
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;
      if (commandName === 'paineladv') {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('btn_abrir_modal_adv').setLabel('⚠️ Aplicar ADV').setStyle(ButtonStyle.Danger)
        );
        return interaction.reply({ content: 'Painel gerado!', components: [row] });
      }
      if (commandName === 'verificarvencidas') {
        await interaction.deferReply({ ephemeral: true });
        await verificarAusenciasAutomatico();
        return interaction.editReply({ content: '✅ Verificação concluída com sucesso!' });
      }
      if (commandName === 'demitir') {
        const membro = interaction.options.getUser('membro');
        const pass = interaction.options.getString('passaporte');
        const mot = interaction.options.getString('motivo');
        await executarDemissao(interaction.guild, membro.id, pass, mot, interaction.user.tag);
        return interaction.reply({ content: `✅ Membro <@${membro.id}> exonerado com sucesso!`, ephemeral: true });
      }
    }

    // 2. BOTÕES
    if (interaction.isButton()) {
      const { customId } = interaction;

      if (customId === 'btn_iniciar_recrutamento') {
        const modal = new ModalBuilder().setCustomId('modal_recrutamento_oficial').setTitle('Candidatura LS Customs');
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rec_nome').setLabel('Nome Completo (RP)').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rec_passaporte').setLabel('ID / Passaporte').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rec_idade_disp').setLabel('Idade e Horários').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rec_exp').setLabel('Experiência Prévia').setStyle(TextInputStyle.Paragraph).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rec_motivo').setLabel('Por que a LS Customs?').setStyle(TextInputStyle.Paragraph).setRequired(true))
        );
        return interaction.showModal(modal);
      }

      if (customId === 'btn_abrir_modal_adv') {
        const modal = new ModalBuilder().setCustomId('modal_aplicar_adv').setTitle('Aplicar Advertência');
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('adv_user_id').setLabel('ID ou Menção Discord').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('adv_passaporte').setLabel('Passaporte RP').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('adv_grau').setLabel('Grau (LEVE, MEDIA ou GRAVE)').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('adv_motivo').setLabel('Motivo').setStyle(TextInputStyle.Paragraph).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('adv_provas').setLabel('Link de Provas').setStyle(TextInputStyle.Short).setRequired(false))
        );
        return interaction.showModal(modal);
      }

      if (customId === 'btn_abrir_modal_ausencia') {
        const modal = new ModalBuilder().setCustomId('modal_solicitar_ausencia').setTitle('Solicitar Ausência');
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('aus_passaporte').setLabel('Passaporte RP').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('aus_nome').setLabel('Nome Completo (RP)').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('aus_dias').setLabel('Dias (Máximo 5)').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('aus_motivo').setLabel('Motivo').setStyle(TextInputStyle.Paragraph).setRequired(true))
        );
        return interaction.showModal(modal);
      }

      if (customId === 'btn_ponto_entrar') {
        const uId = interaction.user.id;
        db.pontos[uId] = { status: 'EM_SERVICO', inicio: Date.now() };
        salvarBanco();
        return interaction.reply({ content: '🟢 Ponto aberto com sucesso! Bom plantão.', ephemeral: true });
      }

      if (customId === 'btn_ponto_finalizar') {
        const uId = interaction.user.id;
        const p = db.pontos[uId];
        if (!p || p.status !== 'EM_SERVICO') return interaction.reply({ content: 'Você não tem ponto aberto!', ephemeral: true });
        const min = Math.floor((Date.now() - p.inicio) / 60000);
        p.status = 'FINALIZADO';
        salvarBanco();
        return interaction.reply({ content: `🔴 Ponto finalizado! Duração: **${min} minutos**.`, ephemeral: true });
      }

      if (customId.startsWith('rec_aprovar_')) {
        const cId = customId.replace('rec_aprovar_', '');
        const member = await interaction.guild.members.fetch(cId).catch(() => null);
        if (member && CONFIG_LS.cargoRecrutaId) await member.roles.add(CONFIG_LS.cargoRecrutaId).catch(() => null);
        return interaction.update({ content: `✅ Candidato <@${cId}> Aprovado por <@${interaction.user.id}>!`, components: [] });
      }
    }

    // 3. ENVIO DE MODAIS
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'modal_recrutamento_oficial') {
        const nome = interaction.fields.getTextInputValue('rec_nome');
        const pass = interaction.fields.getTextInputValue('rec_passaporte');
        const val = validarCandidaturaAntiTroll({ nome, passaporte: pass, exp: interaction.fields.getTextInputValue('rec_exp'), motivo: interaction.fields.getTextInputValue('rec_motivo') });
        if (!val.valido) return interaction.reply({ content: `⚠️ ${val.motivo}`, ephemeral: true });

        const canalLogs = interaction.guild.channels.cache.get(CONFIG_LS.canalLogsRecrutamentoId);
        if (canalLogs) {
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`rec_aprovar_${interaction.user.id}`).setLabel('✅ Aprovar').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`rec_reprovar_${interaction.user.id}`).setLabel('❌ Reprovar').setStyle(ButtonStyle.Danger)
          );
          canalLogs.send({ content: `📝 **Nova Candidatura:** <@${interaction.user.id}> (Nome: ${nome} | Pass: ${val.passaporteNumerico})`, components: [row] });
        }
        return interaction.reply({ content: '✅ Candidatura enviada com sucesso!', ephemeral: true });
      }

      if (interaction.customId === 'modal_aplicar_adv') {
        const targetId = interaction.fields.getTextInputValue('adv_user_id').replace(/\D/g, '');
        const pass = interaction.fields.getTextInputValue('adv_passaporte');
        const grau = interaction.fields.getTextInputValue('adv_grau').toUpperCase().includes('GRAV') ? 'GRAVE' : interaction.fields.getTextInputValue('adv_grau').toUpperCase().includes('MED') ? 'MEDIA' : 'LEVE';
        const mot = interaction.fields.getTextInputValue('adv_motivo');
        const prov = interaction.fields.getTextInputValue('adv_provas');

        await aplicarAdvertencia(interaction.guild, targetId, pass, grau, mot, prov, interaction.user.tag);
        return interaction.reply({ content: `✅ Advertência **${grau}** aplicada ao usuário <@${targetId}>!`, ephemeral: true });
      }

      if (interaction.customId === 'modal_solicitar_ausencia') {
        const pass = interaction.fields.getTextInputValue('aus_passaporte');
        const dias = Math.min(5, Math.max(1, parseInt(interaction.fields.getTextInputValue('aus_dias')) || 1));
        db.ausencias[interaction.user.id] = { passaporte: pass, status: 'ATIVA', vencimento: Date.now() + dias * 86400000 };
        salvarBanco();
        return interaction.reply({ content: `✅ Ausência registrada para **${dias} dias**!`, ephemeral: true });
      }
    }
  } catch (e) {
    console.error('Erro na interação:', e);
  }
});

client.login(DISCORD_TOKEN);
