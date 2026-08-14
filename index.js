/**
 * ============================================================================
 * 🔧 BOT OFICIAL UNIFICADO — LOS SANTOS CUSTOMS (MECÂNICA FIVE-M)
 * Sistema Completo: Set de Recruta, Advertências, Ausências, Bate-Ponto & Comandos
 * Versão: 2.6.0 • Discord.js v14
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
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN || 'SEU_DISCORD_BOT_TOKEN_AQUI';
const GUILD_ID = process.env.GUILD_ID || '1535806745816072245';
const PORT = process.env.PORT || 3001;
const PREFIX = '!';

const CONFIG_LS = {
  // Canais
  canalAdvId: process.env.CANAL_ADV_ID || '1536304172952191049',
  canalLogsAdvId: process.env.CANAL_LOGS_ADV_ID || '1537900474995445852',
  canalPainelAusenciaId: process.env.CANAL_PAINEL_AUSENCIA_ID || '1537852669853438032',
  canalLogsAusenciaId: process.env.CANAL_LOGS_AUSENCIA_ID || '1537852751726510181',
  canalLogsEntradaSaidaId: process.env.CANAL_LOGS_ENTRADA_SAIDA_ID || '1536304188105949244',
  canalLogsRecrutamentoId: process.env.CANAL_LOGS_RECRUTAMENTO_ID || '1536308230936993792',
  canalPontoId: process.env.CANAL_PONTO_ID || '1536309622699466772',
  canalDemissaoId: process.env.CANAL_DEMISSAO_ID || '1536304188609400955',
  canalAnunciosId: process.env.CANAL_ANUNCIOS_ID || '1536304188105949250',

  // Cargos
  cargoLiderancaId: process.env.CARGO_LIDERANCA_ID || '1536304130367299604',
  cargoMecanicoId: process.env.CARGO_MECANICO_ID || '1536304132191948831',
  cargoRecrutaId: process.env.CARGO_RECRUTA_ID || '1536304132980473896',
  cargoAusenteId: process.env.CARGO_AUSENTE_ID || '1537201812795555850',
  cargoAdvVerbalLeveId: process.env.CARGO_ADV_LEVE_ID || '1536304133924200468',
  cargoAdvMediaId: process.env.CARGO_ADV_MEDIA_ID || '1536304134746275861',
  cargoAdvGraveId: process.env.CARGO_ADV_GRAVE_ID || '1536304135517773834',
  cargoDemitidoId: process.env.CARGO_DEMITIDO_ID || '1536304136000000004',

  // Cores & Visual
  corLS: '#2ECC71',
  corAusencia: '#E67E22',
  corAdv: '#EF4444',
  corPonto: '#3B82F6',
  bannerUrl: 'https://i.imgur.com/Vv2juos.jpeg',
  logoUrl: 'https://i.imgur.com/8Q9Z5qA.png',
  rodape: 'LS CUSTOMS • Setor Disciplinar, Ausências & Recrutamento'
};

// ==========================================
// 🗄️ PERSISTÊNCIA DE DADOS (BANCO LOCAL JSON)
// ==========================================
const DB_FILE = path.join(__dirname, 'ls_database.json');

let db = {
  advertencias: {}, // { [userId]: { pontos: number, historico: [] } }
  ausencias: {},    // { [userId]: { passaporte, nomeRP, dias, inicio, vencimento, status } }
  pontos: {},       // { [userId]: { status: 'EM_SERVICO'|'PAUSA'|'OFF', inicioTimestamp, totalSegundos, historico: [] } }
  recrutamentos: {} // { [candidatoId]: { nomeRP, passaporte, status, avaliadoPor } }
};

function carregarBanco() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(raw);
      console.log('📦 Banco de dados local carregado com sucesso!');
    }
  } catch (err) {
    console.error('⚠️ Erro ao carregar banco local:', err.message);
  }
}

function salvarBanco() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('⚠️ Erro ao salvar banco local:', err.message);
  }
}

carregarBanco();

// ==========================================
// 🛡️ VALIDAÇÃO ANTI-TROLL RECRUTAMENTO
// ==========================================
function validarCandidaturaAntiTroll(dados) {
  const { nome, passaporte, idadeDisp, exp, motivo } = dados;

  // 1. Validar Passaporte (somente números positivos)
  const passLimpo = passaporte ? passaporte.replace(/\D/g, '') : '';
  if (!passLimpo || parseInt(passLimpo) <= 0) {
    return { valido: false, motivo: 'Passaporte inválido! Informe apenas o número do seu ID/Passaporte.' };
  }

  // 2. Validar Nome RP
  if (!nome || nome.trim().length < 3 || /^[0-9]+$/.test(nome)) {
    return { valido: false, motivo: 'Nome RP inválido! Digite seu nome e sobrenome de personagem.' };
  }

  if (idadeDisp !== undefined && exp !== undefined && motivo !== undefined) {
    // 3. Validar Idade
    const idadeMatch = (idadeDisp || '').match(/\d{1,2}/);
    if (idadeMatch) {
      const idadeNum = parseInt(idadeMatch[0]);
      if (idadeNum < 14 || idadeNum > 85) {
        return { valido: false, motivo: 'Idade inválida! O servidor aceita candidatos entre 14 e 85 anos.' };
      }
    }

    // 4. Validar respostas muito curtas
    const textoCombinado = `${exp} ${motivo}`.toLowerCase();
    if (textoCombinado.length < 15) {
      return { valido: false, motivo: 'Respostas muito curtas! Descreva melhor sua experiência e motivação.' };
    }

    const palavrasTroll = ['sla', 'sei la', 'nada', 'nenhum', '...', 'aaa', 'fodase', 'fds', 'test', 'teste'];
    if (palavrasTroll.includes(motivo.trim().toLowerCase()) || palavrasTroll.includes(exp.trim().toLowerCase())) {
      return { valido: false, motivo: 'Respostas incoerentes detectadas. Por favor, leve a candidatura a sério.' };
    }
  }

  return { valido: true, passaporteNumerico: passLimpo };
}

// ==========================================
// 🌐 SERVIDOR WEB UPTIME (24/7)
// ==========================================
const server = http.createServer((req, res) => {
  if (req.url === '/status' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'online',
      bot: client.user ? client.user.tag : 'Iniciando...',
      servidor: 'LS Customs',
      uptime: process.uptime(),
      ausenciasAtivas: Object.values(db.ausencias).filter(a => a.status === 'ATIVA').length,
      mecanicosEmServico: Object.values(db.pontos).filter(p => p.status === 'EM_SERVICO').length
    }));
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head><title>LS Customs Bot</title></head>
      <body style="background:#111; color:#2ECC71; font-family:sans-serif; text-align:center; padding:50px;">
        <h1>🔧 Bot Oficial LS Customs Online!</h1>
        <p>Status: Operacional • Discord.js v14</p>
      </body>
    </html>
  `);
});
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Servidor Web Uptime ativo na porta ${PORT}`);
});

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

// ==========================================
// 📋 SLASH COMMANDS
// ==========================================
const commands = [
  new SlashCommandBuilder()
    .setName('paineladv')
    .setDescription('Envia o Painel Interativo de Advertências Disciplinares (Canal 1536304172952191049)'),

  new SlashCommandBuilder()
    .setName('painelausencia')
    .setDescription('Envia o Painel Interativo de Ausências & Licenças (Máximo 5 dias)'),

  new SlashCommandBuilder()
    .setName('painelregistro')
    .setDescription('Envia o Painel Oficial de Boas-Vindas e Set de Recruta da LS Customs'),

  new SlashCommandBuilder()
    .setName('painelponto')
    .setDescription('Envia o Painel Interativo de Bate-Ponto da Mecânica'),

  new SlashCommandBuilder()
    .setName('verificarvencidas')
    .setDescription('Verifica manualmente se há ausências vencidas e aplica sanções automáticas'),

  new SlashCommandBuilder()
    .setName('minhasadvs')
    .setDescription('Consulta seu histórico pessoal de advertências disciplinares'),

  new SlashCommandBuilder()
    .setName('tabela')
    .setDescription('Exibe a Tabela Oficial de Preços e Serviços da LS Customs'),

  new SlashCommandBuilder()
    .setName('radio')
    .setDescription('Exibe as Frequências de Rádio oficiais e Códigos de Comunicação'),

  new SlashCommandBuilder()
    .setName('demitir')
    .setDescription('Exonera um membro da equipe (Apenas Liderança)')
    .addUserOption(opt => opt.setName('membro').setDescription('Membro a ser demitido').setRequired(true))
    .addStringOption(opt => opt.setName('passaporte').setDescription('Passaporte / ID RP').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo da exoneração').setRequired(true))
    .addStringOption(opt => opt.setName('provas').setDescription('Link com provas/prints (opcional)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('ajuda')
    .setDescription('Lista todos os comandos e painéis da LS Customs')
];

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Bot logado com sucesso como: ${c.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  try {
    console.log('🔄 Registrando Slash Commands no servidor...');
    await rest.put(Routes.applicationGuildCommands(c.user.id, GUILD_ID), { body: commands });
    console.log('✅ Todos os Slash Commands foram registrados com sucesso!');
  } catch (e) {
    console.error('⚠️ Erro ao registrar slash commands:', e);
  }

  // Iniciar rotina de verificação de ausências a cada 10 minutos
  setInterval(() => {
    verificarAusenciasAutomatico();
  }, 10 * 60 * 1000);
});

// ==========================================
// ⏰ ROTINA DE VERIFICAÇÃO AUTOMÁTICA DE AUSÊNCIAS
// ==========================================
async function verificarAusenciasAutomatico() {
  const agora = Date.now();
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;

  const canalLogs = guild.channels.cache.get(CONFIG_LS.canalLogsAusenciaId);

  for (const [userId, dados] of Object.entries(db.ausencias)) {
    if (dados.status === 'ATIVA' && agora > dados.vencimento) {
      dados.status = 'VENCIDA';
      salvarBanco();

      console.log(`⚠️ Ausência vencida do usuário ${userId} (Passaporte ${dados.passaporte})`);

      // Aplicar ADV Grave automática por abandono de cargo
      aplicarAdvertencia(
        guild, 
        userId, 
        dados.passaporte, 
        'GRAVE', 
        'Ausência expirada sem retorno ou justificativa prévia à Liderança (Abandono de Função).', 
        'Sistema Automático de Ausências',
        'Sistema Automático'
      );

      if (canalLogs) {
        const embedVencida = new EmbedBuilder()
          .setColor(CONFIG_LS.corAdv)
          .setTitle('🚨 AUSÊNCIA EXPIRADA — PUNIÇÃO AUTOMÁTICA')
          .setDescription(
            `O prazo de ausência do mecânico <@${userId}> (``${dados.nomeRP}`` - ID: ``${dados.passaporte}``) **EXPIROU**!

` +
            `📅 **Prazo concedido:** ${dados.dias} dia(s)
` +
            `⚠️ **Sanção Aplicada:** Advertência Grave automática aplicada por descumprimento do prazo.`
          )
          .setTimestamp();
        canalLogs.send({ embeds: [embedVencida] });
      }
    }
  }
}

// ==========================================
// ⚠️ APLICAÇÃO DE ADVERTÊNCIA & CONTAGEM DE 3 ADVs
// Canal: 1536304172952191049
// Regra: LEVE e MÉDIA NÃO fazem demissão! Apenas registram e somam pontos.
// Demissão APENAS ao acumular 3 pontos ou receber GRAVE (ou /demitir).
// ==========================================
async function aplicarAdvertencia(guild, userId, passaporte, tipo, motivo, provas, autorTag) {
  if (!db.advertencias[userId]) {
    db.advertencias[userId] = { pontos: 0, historico: [] };
  }

  let pontosGanhos = 1;
  let cargoIdParaAdicionar = CONFIG_LS.cargoAdvVerbalLeveId;

  if (tipo === 'LEVE') {
    pontosGanhos = 1;
    cargoIdParaAdicionar = CONFIG_LS.cargoAdvVerbalLeveId;
  } else if (tipo === 'MEDIA') {
    pontosGanhos = 2;
    cargoIdParaAdicionar = CONFIG_LS.cargoAdvMediaId;
  } else if (tipo === 'GRAVE') {
    pontosGanhos = 3;
    cargoIdParaAdicionar = CONFIG_LS.cargoAdvGraveId;
  }

  db.advertencias[userId].pontos += pontosGanhos;
  const totalAtual = db.advertencias[userId].pontos;

  const registro = {
    id: Date.now().toString(),
    passaporte,
    tipo,
    pontosGanhos,
    pontosTotal: totalAtual,
    motivo,
    provas: provas || 'Nenhuma prova anexada.',
    autor: autorTag,
    data: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    timestamp: Date.now()
  };

  db.advertencias[userId].historico.push(registro);
  salvarBanco();

  // Adicionar cargo correspondente no Discord
  try {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member && cargoIdParaAdicionar) {
      await member.roles.add(cargoIdParaAdicionar).catch(() => null);
    }
  } catch (err) {
    console.error('Erro ao adicionar cargo de ADV:', err.message);
  }

  // Notificar canal de ADVs (Canal oficial 1536304172952191049)
  const canalAdv = guild.channels.cache.get(CONFIG_LS.canalAdvId) || guild.channels.cache.get(CONFIG_LS.canalLogsAdvId);

  const embedAdv = new EmbedBuilder()
    .setColor(CONFIG_LS.corAdv)
    .setTitle(`⚠️ ADVERTÊNCIA DISCIPLINA — ${tipo}`)
    .setDescription(
      `👤 **Membro:** <@${userId}> (``${userId}``)
` +
      `🆔 **Passaporte:** ``${passaporte}``
` +
      `📊 **Gravidade:** ``${tipo}`` (+${pontosGanhos} ponto(s))
` +
      `📈 **Total de ADVs Ativas:** ``${totalAtual}/3``

` +
      `📝 **Motivo:** ${motivo}
` +
      `🔗 **Provas:** ${provas || 'Nenhuma'}
` +
      `👮 **Aplicado por:** ${autorTag}`
    )
    .setThumbnail(CONFIG_LS.logoUrl || null)
    .setImage(CONFIG_LS.bannerUrl)
    .setFooter({ text: CONFIG_LS.rodape })
    .setTimestamp();

  if (canalAdv) canalAdv.send({ embeds: [embedAdv] });

  // Notificar Membro via DM
  try {
    const user = await client.users.fetch(userId);
    if (user) {
      const dmEmbed = new EmbedBuilder()
        .setColor(CONFIG_LS.corAdv)
        .setTitle('⚠️ VOCÊ RECEBEU UMA ADVERTÊNCIA — LS CUSTOMS')
        .setDescription(
          `Você recebeu uma punição disciplinar na **Los Santos Customs**.

` +
          `📊 **Tipo:** ``${tipo}``
` +
          `📝 **Motivo:** ${motivo}
` +
          `📈 **Acúmulo Atual:** ``${totalAtual}/3`` advertências.

` +
          (totalAtual < 3 && tipo !== 'GRAVE'
            ? `ℹ️ Você continua como membro ativo. Cumpra as regras para evitar acúmulo de advertências!`
            : `⚠️ **Atenção:** Ao atingir 3 advertências, você será **exonerado imediatamente** da mecânica!`)
        )
        .setTimestamp();
      user.send({ embeds: [dmEmbed] }).catch(() => null);
    }
  } catch (e) {}

  // ⛔ VERIFICAÇÃO CRÍTICA: DEMISSÃO APENAS EM 3 ADVs OU GRAVE
  if (totalAtual >= 3 || tipo === 'GRAVE') {
    await executarDemissao(
      guild, 
      userId, 
      passaporte, 
      `Exoneração automática por acúmulo de advertências disciplinares (${totalAtual}/3 ADVs).`,
      'Sistema Disciplinar Automático'
    );
  }

  return registro;
}

// ==========================================
// 🛑 EXECUÇÃO DE DEMISSÃO / EXONERAÇÃO
// ==========================================
async function executarDemissao(guild, userId, passaporte, motivo, autorTag) {
  try {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member) {
      // Remover cargos da mecânica
      const cargosRemover = [
        CONFIG_LS.cargoMecanicoId,
        CONFIG_LS.cargoRecrutaId,
        CONFIG_LS.cargoAusenteId,
        CONFIG_LS.cargoAdvVerbalLeveId,
        CONFIG_LS.cargoAdvMediaId,
        CONFIG_LS.cargoAdvGraveId
      ].filter(Boolean);

      for (const cId of cargosRemover) {
        if (member.roles.cache.has(cId)) {
          await member.roles.remove(cId).catch(() => null);
        }
      }

      // Adicionar cargo de demitido
      if (CONFIG_LS.cargoDemitidoId) {
        await member.roles.add(CONFIG_LS.cargoDemitidoId).catch(() => null);
      }
    }

    // Log no canal de demissões
    const canalDemissao = guild.channels.cache.get(CONFIG_LS.canalDemissaoId);
    if (canalDemissao) {
      const embedDemissao = new EmbedBuilder()
        .setColor('#000000')
        .setTitle('⛔ EXONERAÇÃO / DEMISSÃO OFICIAL — LS CUSTOMS')
        .setDescription(
          `O mecânico abaixo foi oficialmente **DESLIGADO** do quadro de funcionários da Los Santos Customs.

` +
          `👤 **Ex-Funcionário:** <@${userId}> (``${userId}``)
` +
          `🆔 **Passaporte:** ``${passaporte}``
` +
          `📋 **Motivo da Exoneração:** ${motivo}
` +
          `👮 **Responsável:** ${autorTag}
` +
          `📅 **Data:** ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`
        )
        .setImage(CONFIG_LS.bannerUrl)
        .setFooter({ text: CONFIG_LS.rodape })
        .setTimestamp();

      canalDemissao.send({ embeds: [embedDemissao] });
    }

    // DM de aviso
    try {
      const user = await client.users.fetch(userId);
      if (user) {
        const dm = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('⛔ COMUNICADO DE EXONERAÇÃO — LS CUSTOMS')
          .setDescription(
            `Informamos que você foi desligado da **Los Santos Customs**.

` +
            `📝 **Motivo:** ${motivo}
` +
            `Agradecemos pelos serviços prestados e desejamos sorte em sua jornada.`
          );
        user.send({ embeds: [dm] }).catch(() => null);
      }
    } catch (e) {}

  } catch (err) {
    console.error('Erro ao executar demissão:', err);
  }
}

// ==========================================
// 🔧 GERADOR DO PAINEL DE BOAS-VINDAS & SET RECRUTA
// ==========================================
function criarPainelRecrutamentoBemVindo() {
  const welcomeEmbed = new EmbedBuilder()
    .setColor(CONFIG_LS.corLS)
    .setTitle('🔧 BEM-VINDO À LS CUSTOMS')
    .setDescription(
      `Seja muito bem-vindo(a) à **LS CUSTOMS**!

` +
      `🚗 **Aqui trabalhamos com:**
` +
      `• Mecânica Geral & Manutenção
` +
      `• Reparos de Lataria e Engine
` +
      `• Personalização e Bodykits
` +
      `• Performance & Tuning
` +
      `• Pinturas e Acabamentos

` +
      `📜 Leia atentamente as regras e frequências do servidor antes de iniciar suas atividades.

` +
      `👉 **Para solicitar seu Set de Recruta, clique no botão abaixo:**
` +
      `1️⃣ Nome e Sobrenome In-Game
` +
      `2️⃣ Passaporte / ID In-Game

` +
      `⚙️ *O Bot alterará seu apelido para ``|Recruta| Nome | #ID`` e concederá o cargo de Recruta automaticamente!*

` +
      `🔧 **LS CUSTOMS — Respeito • Organização • Compromisso**`
    )
    .setImage(CONFIG_LS.bannerUrl)
    .setFooter({ text: CONFIG_LS.rodape });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_solicitar_set_recruta')
      .setLabel('🔰 Solicitar Set de Recruta')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('btn_iniciar_recrutamento')
      .setLabel('📝 Formulário Completo')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [welcomeEmbed], components: [row] };
}

// ==========================================
// 📨 COMANDOS POR PREFIXO (!painel-...)
// ==========================================
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  // 1. Painel de Boas-Vindas & Set de Recruta
  if (
    message.content === `${PREFIX}painel-registro` || 
    message.content === `${PREFIX}registro` || 
    message.content === `${PREFIX}setrecruta` || 
    message.content === `${PREFIX}painel-bemvindo`
  ) {
    const painel = criarPainelRecrutamentoBemVindo();
    await message.channel.send(painel);
  }

  // 2. Painel de Advertências (Canal 1536304172952191049)
  if (message.content === `${PREFIX}painel-adv` || message.content === `${PREFIX}paineladv`) {
    const advEmbed = new EmbedBuilder()
      .setColor(CONFIG_LS.corAdv)
      .setTitle('⚠️ SETOR DISCIPLINAR — LS CUSTOMS')
      .setDescription(
        `Bem-vindo ao setor disciplinar da **Los Santos Customs**.

` +
        `🟡 **ADVERTÊNCIA LEVE (1 Ponto):** Atrasos no ponto / Uniforme inadequado / Rádio fora do padrão. *(Não demite)*
` +
        `🟠 **ADVERTÊNCIA MÉDIA (2 Pontos):** Desobediência a superiores / Condução imprudente com guincho. *(Não demite)*
` +
        `🔴 **ADVERTÊNCIA GRAVE (3 Pontos):** Cobrança indevida / Abandono de serviço / Desonestidade.

` +
        `⛔ **REGRA DOS 3 PONTOS:** Apenas ao atingir **3 advertências** ou 1 ADV Grave ocorre a **DEMISSÃO IMEDIATA**!`
      )
      .setImage(CONFIG_LS.bannerUrl)
      .setFooter({ text: CONFIG_LS.rodape });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_abrir_modal_adv').setLabel('⚠️ Aplicar Advertência').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('btn_consultar_minhas_advs').setLabel('📋 Minhas Advertências').setStyle(ButtonStyle.Secondary)
    );
    await message.channel.send({ embeds: [advEmbed], components: [row] });
  }

  // 3. Painel de Ausências
  if (message.content === `${PREFIX}painel-ausencia` || message.content === `${PREFIX}painelausencia`) {
    const ausenciaEmbed = new EmbedBuilder()
      .setColor(CONFIG_LS.corAusencia)
      .setTitle('🌴 REGISTRO DE AUSÊNCIAS & LICENÇAS — LS CUSTOMS')
      .setDescription(
        `Precisa se ausentar da cidade por motivos de viagem, estudo ou trabalho?

` +
        `📌 **Regras de Ausência:**
` +
        `• Prazo Máximo: **5 Dias Corridos**.
` +
        `• Não é permitido bater ponto durante a ausência.
` +
        `• Se a ausência expirar e você não retornar, receberá **ADV Grave** por abandono.
` +
        `• Ao retornar, clique em **Informar Retorno** ou bata ponto.`
      )
      .setImage(CONFIG_LS.bannerUrl)
      .setFooter({ text: CONFIG_LS.rodape });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_abrir_modal_ausencia').setLabel('🌴 Solicitar Ausência').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('btn_informar_retorno_ausencia').setLabel('↩️ Informar Retorno').setStyle(ButtonStyle.Success)
    );
    await message.channel.send({ embeds: [ausenciaEmbed], components: [row] });
  }

  // 4. Painel de Bate-Ponto
  if (message.content === `${PREFIX}painel-ponto` || message.content === `${PREFIX}ponto`) {
    const pontoEmbed = new EmbedBuilder()
      .setColor(CONFIG_LS.corPonto)
      .setTitle('⏱️ BATE-PONTO ELETRÔNICO — LS CUSTOMS')
      .setDescription(
        `Registre seu turno de trabalho para contabilização de horas e bonificações.

` +
        `🟢 **Entrar em Serviço:** Inicia a contagem do seu plantão.
` +
        `🟡 **Pausa / Intervalo:** Pausa temporária (almoço / assunto pessoal).
` +
        `🔴 **Finalizar Serviço:** Encerra o plantão e envia o relatório.`
      )
      .setImage(CONFIG_LS.bannerUrl)
      .setFooter({ text: CONFIG_LS.rodape });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_ponto_entrar').setLabel('🟢 Entrar em Serviço').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('btn_ponto_pausar').setLabel('🟡 Pausa / Intervalo').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('btn_ponto_finalizar').setLabel('🔴 Finalizar Serviço').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('btn_ponto_consultar').setLabel('📊 Minhas Horas').setStyle(ButtonStyle.Primary)
    );
    await message.channel.send({ embeds: [pontoEmbed], components: [row] });
  }

  // 5. Tabela de Preços
  if (message.content === `${PREFIX}tabela`) {
    await message.channel.send({ embeds: [criarEmbedTabela()] });
  }

  // 6. Frequências de Rádio
  if (message.content === `${PREFIX}radio`) {
    await message.channel.send({ embeds: [criarEmbedRadio()] });
  }

  // 7. Ajuda
  if (message.content === `${PREFIX}ajuda`) {
    const embedAjuda = new EmbedBuilder()
      .setColor(CONFIG_LS.corLS)
      .setTitle('📖 GUIA DE COMANDOS & PAINÉIS — LS CUSTOMS')
      .setDescription(
        `**Comandos de Painel (Para enviar nos canais correspondentes):**
` +
        `• ``${PREFIX}painel-registro`` ou ``/painelregistro`` — Painel de boas-vindas e set de recruta
` +
        `• ``${PREFIX}painel-adv`` ou ``/paineladv`` — Painel de advertências disciplinares
` +
        `• ``${PREFIX}painel-ausencia`` ou ``/painelausencia`` — Painel de ausências
` +
        `• ``${PREFIX}painel-ponto`` ou ``/painelponto`` — Painel de ponto eletrônico

` +
        `**Comandos Rápidos:**
` +
        `• ``${PREFIX}tabela`` ou ``/tabela`` — Tabela de preços de serviços
` +
        `• ``${PREFIX}radio`` ou ``/radio`` — Frequências de rádio e Códigos Q
` +
        `• ``/verificarvencidas`` — Checa ausências expiradas e pune automático
` +
        `• ``/demitir`` — Exonera membro e limpa cargos da facção`
      )
      .setFooter({ text: CONFIG_LS.rodape });
    await message.channel.send({ embeds: [embedAjuda] });
  }
});

// ==========================================
// 🖱️ TRATAMENTO DE INTERAÇÕES (SLASH, BOTÕES, MODAIS)
// ==========================================
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // ----------------------------------------------------
    // 1. SLASH COMMANDS
    // ----------------------------------------------------
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;

      if (commandName === 'painelregistro') {
        const painel = criarPainelRecrutamentoBemVindo();
        return interaction.reply(painel);
      }

      if (commandName === 'paineladv') {
        const advEmbed = new EmbedBuilder()
          .setColor(CONFIG_LS.corAdv)
          .setTitle('⚠️ SETOR DISCIPLINAR — LS CUSTOMS')
          .setDescription(
            `Painel de Advertências Disciplinares da **Los Santos Customs**.

` +
            `🟡 **ADVERTÊNCIA LEVE (1 Ponto)** — Não demite
` +
            `🟠 **ADVERTÊNCIA MÉDIA (2 Pontos)** — Não demite
` +
            `🔴 **ADVERTÊNCIA GRAVE (3 Pontos / Exoneração)**

` +
            `⛔ **3 Advertências = Demissão Automática.**`
          )
          .setImage(CONFIG_LS.bannerUrl)
          .setFooter({ text: CONFIG_LS.rodape });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('btn_abrir_modal_adv').setLabel('⚠️ Aplicar Advertência').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('btn_consultar_minhas_advs').setLabel('📋 Minhas Advertências').setStyle(ButtonStyle.Secondary)
        );
        return interaction.reply({ embeds: [advEmbed], components: [row] });
      }

      if (commandName === 'painelausencia') {
        const ausenciaEmbed = new EmbedBuilder()
          .setColor(CONFIG_LS.corAusencia)
          .setTitle('🌴 REGISTRO DE AUSÊNCIAS — LS CUSTOMS')
          .setDescription('Registre sua ausência de no máximo 5 dias.')
          .setImage(CONFIG_LS.bannerUrl)
          .setFooter({ text: CONFIG_LS.rodape });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('btn_abrir_modal_ausencia').setLabel('🌴 Solicitar Ausência').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('btn_informar_retorno_ausencia').setLabel('↩️ Informar Retorno').setStyle(ButtonStyle.Success)
        );
        return interaction.reply({ embeds: [ausenciaEmbed], components: [row] });
      }

      if (commandName === 'painelponto') {
        const pontoEmbed = new EmbedBuilder()
          .setColor(CONFIG_LS.corPonto)
          .setTitle('⏱️ BATE-PONTO ELETRÔNICO — LS CUSTOMS')
          .setDescription('Controle seu plantão de serviço na mecânica.')
          .setImage(CONFIG_LS.bannerUrl)
          .setFooter({ text: CONFIG_LS.rodape });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('btn_ponto_entrar').setLabel('🟢 Entrar em Serviço').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('btn_ponto_pausar').setLabel('🟡 Pausa / Intervalo').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('btn_ponto_finalizar').setLabel('🔴 Finalizar Serviço').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('btn_ponto_consultar').setLabel('📊 Minhas Horas').setStyle(ButtonStyle.Primary)
        );
        return interaction.reply({ embeds: [pontoEmbed], components: [row] });
      }

      if (commandName === 'verificarvencidas') {
        await interaction.deferReply({ ephemeral: true });
        await verificarAusenciasAutomatico();
        return interaction.editReply({ content: '✅ Verificação de ausências executada com sucesso!' });
      }

      if (commandName === 'tabela') {
        return interaction.reply({ embeds: [criarEmbedTabela()] });
      }

      if (commandName === 'radio') {
        return interaction.reply({ embeds: [criarEmbedRadio()] });
      }

      if (commandName === 'minhasadvs') {
        const userAdvs = db.advertencias[interaction.user.id];
        if (!userAdvs || userAdvs.pontos === 0) {
          return interaction.reply({ content: '🎉 Parabéns! Você possui **0 advertências** ativas na LS Customs.', ephemeral: true });
        }
        const embed = new EmbedBuilder()
          .setColor(CONFIG_LS.corAdv)
          .setTitle(`📋 HISTÓRICO DISCIPLINAR — ${interaction.user.username}`)
          .setDescription(`Você possui um total de **${userAdvs.pontos}/3** pontos de advertência.`)
          .addFields(
            userAdvs.historico.slice(-5).map(h => ({
              name: `${h.tipo} — ${h.data}`,
              value: `**Motivo:** ${h.motivo}\n**Aplicado por:** ${h.autor}`
            }))
          );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (commandName === 'demitir') {
        const isLeader = interaction.member.roles.cache.has(CONFIG_LS.cargoLiderancaId) || 
                         interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
        if (!isLeader) {
          return interaction.reply({ content: '❌ Apenas a Liderança da LS Customs pode usar este comando.', ephemeral: true });
        }

        const membroAlvo = interaction.options.getUser('membro');
        const passaporte = interaction.options.getString('passaporte');
        const motivo = interaction.options.getString('motivo');

        await executarDemissao(interaction.guild, membroAlvo.id, passaporte, motivo, interaction.user.tag);
        return interaction.reply({ content: `✅ O funcionário <@${membroAlvo.id}> foi exonerado com sucesso!`, ephemeral: true });
      }

      if (commandName === 'ajuda') {
        const embedAjuda = new EmbedBuilder()
          .setColor(CONFIG_LS.corLS)
          .setTitle('📖 GUIA DE COMANDOS — LS CUSTOMS')
          .setDescription(
            `• ``/painelregistro`` — Inicia o recrutamento / Set Recruta\n` +
            `• ``/paineladv`` — Painel de advertências\n` +
            `• ``/painelausencia`` — Painel de ausências\n` +
            `• ``/painelponto`` — Painel de bate-ponto\n` +
            `• ``/tabela`` — Tabela de preços\n` +
            `• ``/radio`` — Frequências de rádio\n` +
            `• ``/minhasadvs`` — Consulta suas advertências\n` +
            `• ``/verificarvencidas`` — Checa ausências\n` +
            `• ``/demitir`` — Exonera membro (Líder)`
          );
        return interaction.reply({ embeds: [embedAjuda], ephemeral: true });
      }
    }

    // ----------------------------------------------------
    // 2. BOTÕES
    // ----------------------------------------------------
    if (interaction.isButton()) {
      const { customId } = interaction;

      // Botão: Solicitar Set de Recruta Rápido (2 Campos)
      if (customId === 'btn_solicitar_set_recruta') {
        const modalSet = new ModalBuilder()
          .setCustomId('modal_set_recruta')
          .setTitle('🔰 Solicitar Set de Recruta');

        const inputNome = new TextInputBuilder()
          .setCustomId('set_nome')
          .setLabel('1️⃣ Nome e Sobrenome In-Game')
          .setPlaceholder('Ex: xavi souza')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const inputPass = new TextInputBuilder()
          .setCustomId('set_passaporte')
          .setLabel('2️⃣ Passaporte / ID In-Game')
          .setPlaceholder('Ex: 846')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modalSet.addComponents(
          new ActionRowBuilder().addComponents(inputNome),
          new ActionRowBuilder().addComponents(inputPass)
        );

        return interaction.showModal(modalSet);
      }

      // Botão: Formulário Completo de Recrutamento (5 Campos)
      if (customId === 'btn_iniciar_recrutamento') {
        const modal = new ModalBuilder()
          .setCustomId('modal_recrutamento_oficial')
          .setTitle('📝 Candidatura LS Customs');

        const inputNome = new TextInputBuilder()
          .setCustomId('rec_nome')
          .setLabel('Nome Completo (RP)')
          .setPlaceholder('Ex: xavi souza')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const inputPass = new TextInputBuilder()
          .setCustomId('rec_passaporte')
          .setLabel('ID / Passaporte (Apenas Números)')
          .setPlaceholder('Ex: 846')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const inputIdade = new TextInputBuilder()
          .setCustomId('rec_idade_disp')
          .setLabel('Idade Real & Horários Disponíveis')
          .setPlaceholder('Ex: 21 anos, disponível tarde e noite')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const inputExp = new TextInputBuilder()
          .setCustomId('rec_exp')
          .setLabel('Experiência Prévia em Mecânica')
          .setPlaceholder('Já atuou em mecânica em alguma cidade?')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const inputMotivo = new TextInputBuilder()
          .setCustomId('rec_motivo')
          .setLabel('Por que escolheu a LS Customs?')
          .setPlaceholder('Explique o que você busca na oficina...')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(inputNome),
          new ActionRowBuilder().addComponents(inputPass),
          new ActionRowBuilder().addComponents(inputIdade),
          new ActionRowBuilder().addComponents(inputExp),
          new ActionRowBuilder().addComponents(inputMotivo)
        );

        return interaction.showModal(modal);
      }

      // Botão: Abrir Modal de ADV (Apenas Liderança)
      if (customId === 'btn_abrir_modal_adv') {
        const isLeader = interaction.member.roles.cache.has(CONFIG_LS.cargoLiderancaId) || 
                         interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
        if (!isLeader) {
          return interaction.reply({ content: '❌ Apenas a Liderança pode aplicar advertências disciplinares.', ephemeral: true });
        }

        const modalAdv = new ModalBuilder()
          .setCustomId('modal_aplicar_adv')
          .setTitle('⚠️ Aplicar Advertência Disciplinar');

        const inputUser = new TextInputBuilder()
          .setCustomId('adv_user_id')
          .setLabel('ID ou Menção Discord do Infrator')
          .setPlaceholder('Ex: 291096519822 ou @usuario')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const inputPass = new TextInputBuilder()
          .setCustomId('adv_passaporte')
          .setLabel('Passaporte / ID do Mecânico')
          .setPlaceholder('Ex: 3412')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const inputGrau = new TextInputBuilder()
          .setCustomId('adv_grau')
          .setLabel('Gravidade (Digite: LEVE, MEDIA ou GRAVE)')
          .setPlaceholder('LEVE = 1 ponto | MEDIA = 2 pontos | GRAVE = 3 pontos')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const inputMotivo = new TextInputBuilder()
          .setCustomId('adv_motivo')
          .setLabel('Motivo Detalhado da Punição')
          .setPlaceholder('Descreva a infração cometida...')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const inputProvas = new TextInputBuilder()
          .setCustomId('adv_provas')
          .setLabel('Link de Provas (Imgur/YouTube)')
          .setPlaceholder('https://imgur.com/...')
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        modalAdv.addComponents(
          new ActionRowBuilder().addComponents(inputUser),
          new ActionRowBuilder().addComponents(inputPass),
          new ActionRowBuilder().addComponents(inputGrau),
          new ActionRowBuilder().addComponents(inputMotivo),
          new ActionRowBuilder().addComponents(inputProvas)
        );

        return interaction.showModal(modalAdv);
      }

      // Botão: Consultar Minhas ADVs
      if (customId === 'btn_consultar_minhas_advs') {
        const userAdvs = db.advertencias[interaction.user.id];
        const pontos = userAdvs ? userAdvs.pontos : 0;
        return interaction.reply({
          content: `📊 Seu status disciplinar atual: **${pontos}/3 Advertências**.`,
          ephemeral: true
        });
      }

      // Botão: Solicitar Ausência -> Abre Modal
      if (customId === 'btn_abrir_modal_ausencia') {
        const modalAusencia = new ModalBuilder()
          .setCustomId('modal_solicitar_ausencia')
          .setTitle('🌴 Solicitação de Ausência / Licença');

        const inputPass = new TextInputBuilder()
          .setCustomId('aus_passaporte')
          .setLabel('ID / Passaporte RP')
          .setPlaceholder('Ex: 5678')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const inputNome = new TextInputBuilder()
          .setCustomId('aus_nome')
          .setLabel('Nome Completo (RP)')
          .setPlaceholder('Ex: Carlos Alberto')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const inputDias = new TextInputBuilder()
          .setCustomId('aus_dias')
          .setLabel('Quantidade de Dias (Máximo: 5 Dias)')
          .setPlaceholder('Digite um número entre 1 e 5')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const inputMotivo = new TextInputBuilder()
          .setCustomId('aus_motivo')
          .setLabel('Motivo da Ausência')
          .setPlaceholder('Viagem a trabalho, provas na faculdade, etc.')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        modalAusencia.addComponents(
          new ActionRowBuilder().addComponents(inputPass),
          new ActionRowBuilder().addComponents(inputNome),
          new ActionRowBuilder().addComponents(inputDias),
          new ActionRowBuilder().addComponents(inputMotivo)
        );

        return interaction.showModal(modalAusencia);
      }

      // Botão: Informar Retorno da Ausência
      if (customId === 'btn_informar_retorno_ausencia') {
        const registro = db.ausencias[interaction.user.id];
        if (!registro || registro.status !== 'ATIVA') {
          return interaction.reply({ content: 'ℹ️ Você não possui nenhuma ausência ativa no momento.', ephemeral: true });
        }

        registro.status = 'FINALIZADA';
        registro.retornoEm = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        salvarBanco();

        if (CONFIG_LS.cargoAusenteId && interaction.member.roles.cache.has(CONFIG_LS.cargoAusenteId)) {
          interaction.member.roles.remove(CONFIG_LS.cargoAusenteId).catch(() => null);
        }

        const canalLogs = interaction.guild.channels.cache.get(CONFIG_LS.canalLogsAusenciaId);
        if (canalLogs) {
          const retEmbed = new EmbedBuilder()
            .setColor(CONFIG_LS.corLS)
            .setTitle('↩️ RETORNO DE AUSÊNCIA CONFIRMADO')
            .setDescription(
              `O mecânico <@${interaction.user.id}> (``${registro.nomeRP}`` - ID: ``${registro.passaporte}``) **RETORNOU** às atividades normais na oficina!`
            )
            .setTimestamp();
          canalLogs.send({ embeds: [retEmbed] });
        }

        return interaction.reply({ content: '✅ Seu retorno foi registrado com sucesso! Bem-vindo de volta ao serviço.', ephemeral: true });
      }

      // Botões do Bate-Ponto
      if (customId === 'btn_ponto_entrar') {
        const uId = interaction.user.id;
        if (db.pontos[uId] && db.pontos[uId].status === 'EM_SERVICO') {
          return interaction.reply({ content: '⚠️ Você já está com ponto aberto em andamento!', ephemeral: true });
        }

        if (db.ausencias[uId] && db.ausencias[uId].status === 'ATIVA') {
          db.ausencias[uId].status = 'FINALIZADA';
          if (CONFIG_LS.cargoAusenteId && interaction.member.roles.cache.has(CONFIG_LS.cargoAusenteId)) {
            interaction.member.roles.remove(CONFIG_LS.cargoAusenteId).catch(() => null);
          }
        }

        db.pontos[uId] = {
          status: 'EM_SERVICO',
          inicioTimestamp: Date.now(),
          totalSegundos: (db.pontos[uId]?.totalSegundos || 0)
        };
        salvarBanco();

        const canalPonto = interaction.guild.channels.cache.get(CONFIG_LS.canalLogsEntradaSaidaId) || 
                           interaction.guild.channels.cache.get(CONFIG_LS.canalPontoId);
        
        if (canalPonto) {
          const embed = new EmbedBuilder()
            .setColor(CONFIG_LS.corLS)
            .setTitle('🟢 BATE-PONTO — ENTRADA EM SERVIÇO')
            .setDescription(
              `👤 **Mecânico:** <@${uId}>
` +
              `⏰ **Horário de Entrada:** ${new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
` +
              `📻 **Status:** Em serviço na oficina / pista`
            )
            .setTimestamp();
          canalPonto.send({ embeds: [embed] });
        }

        return interaction.reply({ content: '🟢 **Ponto aberto com sucesso!** Bom plantão!', ephemeral: true });
      }

      if (customId === 'btn_ponto_finalizar') {
        const uId = interaction.user.id;
        const p = db.pontos[uId];
        if (!p || p.status !== 'EM_SERVICO') {
          return interaction.reply({ content: 'ℹ️ Você não tem nenhum ponto em andamento para fechar.', ephemeral: true });
        }

        const duracaoSegundos = Math.floor((Date.now() - p.inicioTimestamp) / 1000);
        const horas = Math.floor(duracaoSegundos / 3600);
        const minutos = Math.floor((duracaoSegundos % 3600) / 60);

        p.totalSegundos = (p.totalSegundos || 0) + duracaoSegundos;
        p.status = 'FINALIZADO';
        salvarBanco();

        const canalPonto = interaction.guild.channels.cache.get(CONFIG_LS.canalLogsEntradaSaidaId) || 
                           interaction.guild.channels.cache.get(CONFIG_LS.canalPontoId);

        if (canalPonto) {
          const embed = new EmbedBuilder()
            .setColor(CONFIG_LS.corAdv)
            .setTitle('🔴 BATE-PONTO — SAÍDA DE SERVIÇO')
            .setDescription(
              `👤 **Mecânico:** <@${uId}>
` +
              `⏱️ **Tempo no Turno:** ``${horas}h ${minutos}min``
` +
              `⏰ **Horário de Saída:** ${new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
` +
              `📈 **Total Acumulado:** ``${Math.floor(p.totalSegundos / 3600)}h ${Math.floor((p.totalSegundos % 3600) / 60)}min```
            )
            .setTimestamp();
          canalPonto.send({ embeds: [embed] });
        }

        return interaction.reply({ content: `🔴 **Ponto finalizado!** Você trabalhou **${horas}h ${minutos}min** neste turno.`, ephemeral: true });
      }

      if (customId === 'btn_ponto_consultar') {
        const uId = interaction.user.id;
        const p = db.pontos[uId];
        const seg = p ? (p.totalSegundos || 0) : 0;
        const h = Math.floor(seg / 3600);
        const m = Math.floor((seg % 3600) / 60);
        const statusTxt = p?.status === 'EM_SERVICO' ? '🟢 Em Serviço' : '🔴 Fora de Serviço';

        return interaction.reply({
          content: `📊 **Seu Histórico de Ponto:**\n• Status: ${statusTxt}\n• Total de Horas Acumuladas: **${h}h ${m}min**`,
          ephemeral: true
        });
      }

      // ----------------------------------------------------
      // AÇÕES DA LIDERANÇA NO RECRUTAMENTO (Aprovar / Reprovar)
      // ----------------------------------------------------
      if (customId.startsWith('rec_aprovar_')) {
        const candidatoId = customId.replace('rec_aprovar_', '');
        const isLeader = interaction.member.roles.cache.has(CONFIG_LS.cargoLiderancaId) || 
                         interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!isLeader) {
          return interaction.reply({ content: '❌ Apenas a Liderança pode aprovar candidatos.', ephemeral: true });
        }

        const guild = interaction.guild;
        const member = await guild.members.fetch(candidatoId).catch(() => null);
        const dadosCand = db.recrutamentos[candidatoId] || { nomeRP: 'Mecânico', passaporte: '000' };

        let statusNick = '✅ Alterado com sucesso';
        let statusCargo = '✅ Cargo atribuído';

        // 1. Alterar apelido para |Recruta| Nome | #Passaporte
        if (member) {
          const novoNick = `|Recruta| ${dadosCand.nomeRP} | #${dadosCand.passaporte}`;
          try {
            await member.setNickname(novoNick);
          } catch (err) {
            statusNick = '⚠️ Sem permissão de hierarquia para alterar apelido';
          }

          // 2. Atribuir cargo de recruta
          try {
            if (CONFIG_LS.cargoRecrutaId) {
              await member.roles.add(CONFIG_LS.cargoRecrutaId);
            }
          } catch (err) {
            statusCargo = '⚠️ Sem permissão para gerenciar este cargo';
          }
        }

        const agoraFormatada = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

        // Embed Oficial Exato Solicitado
        const embedAprovado = new EmbedBuilder()
          .setColor(CONFIG_LS.corLS)
          .setTitle('✅ RECRUTAMENTO APROVADO — LS CUSTOMS')
          .setDescription(
            `🎉 **SOLICITAÇÃO APROVADA COM SUCESSO!**

` +
            `👤 **NOME:** ${dadosCand.nomeRP}
` +
            `🆔 **PASSAPORTE:** #${dadosCand.passaporte}
` +
            `🔰 **CARGO:** 🔰 RECRUTA
` +
            `🎮 **USUÁRIO:** <@${candidatoId}>
` +
            `🏷️ **NICK DEFINIDO:** ``|Recruta| ${dadosCand.nomeRP} | #${dadosCand.passaporte}``

` +
            `👑 **APROVADO POR:** <@${interaction.user.id}>
` +
            `⚙️ **Status Apelido:** ${statusNick}
` +
            `⚙️ **Status Cargo:** ${statusCargo}`
          )
          .setImage(CONFIG_LS.bannerUrl)
          .setFooter({ text: `Sistema de Recrutamento Automático • LS CUSTOMS • ${agoraFormatada}` })
          .setTimestamp();

        await interaction.update({ embeds: [embedAprovado], components: [] });

        // Enviar DM ao candidato
        try {
          const user = await client.users.fetch(candidatoId);
          if (user) {
            user.send({ embeds: [embedAprovado] }).catch(() => null);
          }
        } catch (e) {}
      }

      if (customId.startsWith('rec_reprovar_')) {
        const candidatoId = customId.replace('rec_reprovar_', '');
        const isLeader = interaction.member.roles.cache.has(CONFIG_LS.cargoLiderancaId) || 
                         interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!isLeader) {
          return interaction.reply({ content: '❌ Apenas a Liderança pode reprovar candidatos.', ephemeral: true });
        }

        const origEmbed = EmbedBuilder.from(interaction.message.embeds[0])
          .setColor(CONFIG_LS.corAdv)
          .setTitle('❌ CANDIDATURA REPROVADA')
          .setFooter({ text: `Reprovado por ${interaction.user.tag} • LS Customs` });

        await interaction.update({ embeds: [origEmbed], components: [] });

        try {
          const user = await client.users.fetch(candidatoId);
          if (user) {
            const dmEmbed = new EmbedBuilder()
              .setColor(CONFIG_LS.corAdv)
              .setTitle('COMUNICADO DE RECRUTAMENTO — LS CUSTOMS')
              .setDescription(
                `Agradecemos pelo seu interesse em fazer parte da LS Customs.

` +
                `Infelizmente, sua candidatura não foi aceita neste momento. Você poderá tentar novamente em futuros processos seletivos!`
              );
            user.send({ embeds: [dmEmbed] }).catch(() => null);
          }
        } catch (e) {}
      }
    }

    // ----------------------------------------------------
    // 3. ENVIO DE MODAIS (Formulários)
    // ----------------------------------------------------
    if (interaction.isModalSubmit()) {
      const { customId } = interaction;

      // MODAL: Solicitar Set de Recruta Direto (2 Campos)
      if (customId === 'modal_set_recruta') {
        const nome = interaction.fields.getTextInputValue('set_nome');
        const passaporte = interaction.fields.getTextInputValue('set_passaporte');

        const validacao = validarCandidaturaAntiTroll({ nome, passaporte });
        if (!validacao.valido) {
          return interaction.reply({
            content: `⚠️ **Dados Inválidos:** ${validacao.motivo}`,
            ephemeral: true
          });
        }

        const member = interaction.member;
        let statusNick = '✅ Alterado com sucesso';
        let statusCargo = '✅ Cargo atribuído';

        // 1. Alterar Nickname para |Recruta| Nome | #Passaporte
        const novoNick = `|Recruta| ${nome} | #${validacao.passaporteNumerico}`;
        try {
          await member.setNickname(novoNick);
        } catch (err) {
          statusNick = '⚠️ Sem permissão hierárquica para alterar apelido';
        }

        // 2. Conceder Cargo de Recruta
        try {
          if (CONFIG_LS.cargoRecrutaId) {
            await member.roles.add(CONFIG_LS.cargoRecrutaId);
          }
        } catch (err) {
          statusCargo = '⚠️ Sem permissão para gerenciar cargo';
        }

        const agoraFormatada = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

        // Embed Exata Formatada
        const embedAprovado = new EmbedBuilder()
          .setColor(CONFIG_LS.corLS)
          .setTitle('✅ RECRUTAMENTO APROVADO — LS CUSTOMS')
          .setDescription(
            `🎉 **SOLICITAÇÃO APROVADA COM SUCESSO!**

` +
            `👤 **NOME:** ${nome}
` +
            `🆔 **PASSAPORTE:** #${validacao.passaporteNumerico}
` +
            `🔰 **CARGO:** 🔰 RECRUTA
` +
            `🎮 **USUÁRIO:** <@${interaction.user.id}>
` +
            `🏷️ **NICK DEFINIDO:** ``${novoNick}``

` +
            `👑 **APROVADO POR:** Sistema Automático
` +
            `⚙️ **Status Apelido:** ${statusNick}
` +
            `⚙️ **Status Cargo:** ${statusCargo}`
          )
          .setImage(CONFIG_LS.bannerUrl)
          .setFooter({ text: `Sistema de Recrutamento Automático • LS CUSTOMS • ${agoraFormatada}` })
          .setTimestamp();

        // Enviar no canal de logs de recrutamento
        const canalLogs = interaction.guild.channels.cache.get(CONFIG_LS.canalLogsRecrutamentoId) || interaction.channel;
        if (canalLogs) {
          canalLogs.send({ embeds: [embedAprovado] });
        }

        return interaction.reply({
          content: `🎉 **Set de Recruta concluído com sucesso!** Bem-vindo à LS Customs, **${novoNick}**!`,
          embeds: [embedAprovado],
          ephemeral: true
        });
      }

      // MODAL: Recrutamento Completo
      if (customId === 'modal_recrutamento_oficial') {
        const nome = interaction.fields.getTextInputValue('rec_nome');
        const passaporte = interaction.fields.getTextInputValue('rec_passaporte');
        const idadeDisp = interaction.fields.getTextInputValue('rec_idade_disp');
        const exp = interaction.fields.getTextInputValue('rec_exp');
        const motivo = interaction.fields.getTextInputValue('rec_motivo');

        // Validação Anti-Troll
        const validacao = validarCandidaturaAntiTroll({ nome, passaporte, idadeDisp, exp, motivo });
        if (!validacao.valido) {
          return interaction.reply({
            content: `⚠️ **Candidatura Não Enviada:** ${validacao.motivo}`,
            ephemeral: true
          });
        }

        // Salvar registro
        db.recrutamentos[interaction.user.id] = {
          nomeRP: nome,
          passaporte: validacao.passaporteNumerico,
          status: 'PENDENTE',
          enviadoEm: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        };
        salvarBanco();

        // Enviar para canal de logs de recrutamento
        const canalLogs = interaction.guild.channels.cache.get(CONFIG_LS.canalLogsRecrutamentoId);
        if (canalLogs) {
          const logEmbed = new EmbedBuilder()
            .setColor(CONFIG_LS.corLS)
            .setTitle('📝 NOVA CANDIDATURA DE RECRUTAMENTO')
            .setDescription(
              `👤 **Candidato:** <@${interaction.user.id}> (``${interaction.user.id}``)
` +
              `🚗 **Nome RP:** ``${nome}``
` +
              `🆔 **ID / Passaporte:** ``${validacao.passaporteNumerico}``
` +
              `🎂 **Idade & Horários:** ``${idadeDisp}``

` +
              `🔧 **Experiência Prévia:**
${exp}

` +
              `🎯 **Por que a LS Customs?**
${motivo}`
            )
            .setFooter({ text: 'Aguardando avaliação da liderança...' })
            .setTimestamp();

          const botoes = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`rec_aprovar_${interaction.user.id}`)
              .setLabel('✅ Aprovar Candidato (Dar Cargo & Set Nick)')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`rec_reprovar_${interaction.user.id}`)
              .setLabel('❌ Reprovar Candidato')
              .setStyle(ButtonStyle.Danger)
          );

          await canalLogs.send({ embeds: [logEmbed], components: [botoes] });
        }

        return interaction.reply({
          content: '✅ **Sua candidatura foi enviada com sucesso!** A liderança avaliará em breve.',
          ephemeral: true
        });
      }

      // MODAL: Aplicar ADV (Canal 1536304172952191049)
      if (customId === 'modal_aplicar_adv') {
        const userInput = interaction.fields.getTextInputValue('adv_user_id').replace(/[^0-9]/g, '');
        const passaporte = interaction.fields.getTextInputValue('adv_passaporte');
        const grauInput = interaction.fields.getTextInputValue('adv_grau').toUpperCase().trim();
        const motivo = interaction.fields.getTextInputValue('adv_motivo');
        const provas = interaction.fields.getTextInputValue('adv_provas') || 'Nenhuma';

        let tipo = 'LEVE';
        if (grauInput.includes('MED') || grauInput === '2') tipo = 'MEDIA';
        else if (grauInput.includes('GRAV') || grauInput === '3') tipo = 'GRAVE';

        if (!userInput) {
          return interaction.reply({ content: '❌ ID de usuário Discord inválido!', ephemeral: true });
        }

        await aplicarAdvertencia(
          interaction.guild,
          userInput,
          passaporte,
          tipo,
          motivo,
          provas,
          interaction.user.tag
        );

        return interaction.reply({
          content: `✅ Advertência **${tipo}** aplicada com sucesso ao usuário <@${userInput}>! Enviado no canal <#${CONFIG_LS.canalAdvId}>.`,
          ephemeral: true
        });
      }

      // MODAL: Solicitar Ausência
      if (customId === 'modal_solicitar_ausencia') {
        const passaporte = interaction.fields.getTextInputValue('aus_passaporte');
        const nome = interaction.fields.getTextInputValue('aus_nome');
        const diasStr = interaction.fields.getTextInputValue('aus_dias').replace(/\D/g, '');
        const motivo = interaction.fields.getTextInputValue('aus_motivo');

        const diasNum = parseInt(diasStr) || 1;
        if (diasNum < 1 || diasNum > 5) {
          return interaction.reply({
            content: '❌ **Prazo Inválido!** O período de ausência deve ser entre **1 e 5 dias** corridos.',
            ephemeral: true
          });
        }

        const agora = Date.now();
        const duracaoMs = diasNum * 24 * 60 * 60 * 1000;
        const vencimentoTimestamp = agora + duracaoMs;

        db.ausencias[interaction.user.id] = {
          userId: interaction.user.id,
          passaporte,
          nomeRP: nome,
          dias: diasNum,
          motivo,
          inicio: agora,
          vencimento: vencimentoTimestamp,
          status: 'ATIVA'
        };
        salvarBanco();

        // Adicionar cargo de ausente
        if (CONFIG_LS.cargoAusenteId) {
          interaction.member.roles.add(CONFIG_LS.cargoAusenteId).catch(() => null);
        }

        // Log no canal de ausências
        const canalLogs = interaction.guild.channels.cache.get(CONFIG_LS.canalLogsAusenciaId);
        if (canalLogs) {
          const dataVencFormatada = new Date(vencimentoTimestamp).toLocaleDateString('pt-BR');
          const embed = new EmbedBuilder()
            .setColor(CONFIG_LS.corAusencia)
            .setTitle('🌴 REGISTRO DE AUSÊNCIA CONFIRMADO')
            .setDescription(
              `👤 **Mecânico:** <@${interaction.user.id}> (``${nome}``)
` +
              `🆔 **Passaporte:** ``${passaporte}``
` +
              `📅 **Duração:** ``${diasNum} Dia(s)``
` +
              `⏰ **Data Limite de Retorno:** ``${dataVencFormatada}``

` +
              `📝 **Motivo:** ${motivo}`
            )
            .setFooter({ text: 'Não esqueça de informar o retorno ao voltar!' })
            .setTimestamp();

          canalLogs.send({ embeds: [embed] });
        }

        return interaction.reply({
          content: `✅ **Ausência registrada com sucesso para ${diasNum} dia(s)!** Descanse e bom retorno.`,
          ephemeral: true
        });
      }
    }
  } catch (err) {
    console.error('Erro na interação Discord:', err);
    if (interaction.isRepliable() && !interaction.replied) {
      interaction.reply({ content: '❌ Ocorreu um erro interno ao processar esta ação.', ephemeral: true }).catch(() => null);
    }
  }
});

// ==========================================
// 🎨 HELPERS DE EMBEDS (TABELA & RÁDIO)
// ==========================================
function criarEmbedTabela() {
  return new EmbedBuilder()
    .setColor(CONFIG_LS.corLS)
    .setTitle('🔧 TABELA OFICIAL DE PREÇOS — LOS SANTOS CUSTOMS')
    .setDescription('Confira os valores oficiais padronizados para serviços de mecânica e customização.')
    .addFields(
      {
        name: '🔩 Manutenção & Reparos',
        value: 
          '• **Reparo Completo (Kit Mecânico):** R$ 2.500\n' +
          '• **Troca de Óleo e Filtros:** R$ 1.200\n' +
          '• **Alinhamento & Balanceamento:** R$ 1.500\n' +
          '• **Limpeza & Higienização:** R$ 800',
        inline: false
      },
      {
        name: '⚡ Performance & Motor',
        value: 
          '• **Upgrade Motor Nível 1 ao 4:** R$ 15.000 a R$ 45.000\n' +
          '• **Instalação de Turbo Compressor:** R$ 35.000\n' +
          '• **Transmissão Esportiva / Corrida:** R$ 20.000\n' +
          '• **Freios de Cerâmica:** R$ 18.000',
        inline: false
      },
      {
        name: '🛡️ Blindagem & Proteção',
        value: 
          '• **Blindagem Nível 1 (20%):** R$ 25.000\n' +
          '• **Blindagem Nível 5 (100% Máxima):** R$ 85.000\n' +
          '• **Pneus à Prova de Balas:** R$ 30.000',
        inline: false
      },
      {
        name: '🎨 Customização & Estética',
        value: 
          '• **Pintura Primária/Secundária Especial:** R$ 5.000\n' +
          '• **Suspensão a Ar / Hidráulica:** R$ 22.000\n' +
          '• **Kits Aerodinâmicos (Spoilers):** R$ 12.000\n' +
          '• **Faróis Xênon & Neon:** R$ 7.500',
        inline: false
      }
    )
    .setImage(CONFIG_LS.bannerUrl)
    .setFooter({ text: CONFIG_LS.rodape })
    .setTimestamp();
}

function criarEmbedRadio() {
  return new EmbedBuilder()
    .setColor('#3B82F6')
    .setTitle('📻 FREQUÊNCIAS DE RÁDIO & CÓDIGO Q — LS CUSTOMS')
    .setDescription('Padronização de comunicação via rádio para todos os mecânicos em serviço.')
    .addFields(
      {
        name: '📡 Frequências Oficiais',
        value: 
          '• **105.1 MHz** — Rádio Principal (Oficina e Atendimentos Gerais)\n' +
          '• **105.2 MHz** — Rádio Pista / Guincho Externo e Resgate\n' +
          '• **105.9 MHz** — Rádio Liderança e Reuniões Disciplinares\n' +
          '• **100.0 MHz** — Frequência Geral Integrada',
        inline: false
      },
      {
        name: '🗣️ Códigos de Comunicação Mais Usados',
        value: 
          '• **QAP:** Na escuta / Pronto para receber transmissão\n' +
          '• **QRV:** À disposição para atendimento / serviço\n' +
          '• **QSL:** Entendido e confirmado\n' +
          '• **QTH:** Localização atual do mecânico / veículo\n' +
          '• **QTR:** Horário exato\n' +
          '• **TKS:** Obrigado / Agradecido',
        inline: false
      }
    )
    .setFooter({ text: CONFIG_LS.rodape })
    .setTimestamp();
}

// Iniciar Bot
client.login(DISCORD_TOKEN);
