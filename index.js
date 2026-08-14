/**
 * ============================================================================
 * 🔧 BOT OFICIAL UNIFICADO — LOS SANTOS CUSTOMS (MECÂNICA FIVE-M)
 * Versão 3.1.0 • Discord.js v14 (Blindado contra erros & Interações 100% Seguras)
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

// ============================================================================
// 🛡️ [0] ANTI-CRASH GLOBAL (Evita qualquer queda do bot)
// ============================================================================
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ [ANTI-CRASH] Unhandled Rejection:', reason);
});
process.on('uncaughtException', (error, origin) => {
  console.error('⚠️ [ANTI-CRASH] Uncaught Exception:', error);
});

// ============================================================================
// 🔑 [1] CONFIGURAÇÕES & IDs (Com Fallbacks Seguros)
// ============================================================================
const CONFIG = {
  token: process.env.DISCORD_TOKEN || process.env.TOKEN || 'SEU_DISCORD_BOT_TOKEN_AQUI',
  guildId: process.env.GUILD_ID || '1535806745816072245',
  port: parseInt(process.env.PORT || '3001', 10) || 3001,
  prefix: process.env.PREFIX || '!' || '!',

  canais: {
    adv: process.env.CANAL_ADV_ID || '1536304172952191049',
    logsAdv: process.env.CANAL_LOGS_ADV_ID || '1536333810629607514',
    painelAusencia: process.env.CANAL_PAINEL_AUSENCIA_ID || '1537852669853438032',
    logsAusencia: process.env.CANAL_LOGS_AUSENCIA_ID || '1537852751726510181',
    ponto: process.env.CANAL_PONTO_ID || '1536309622699466772',
    logsPonto: process.env.CANAL_LOGS_ENTRADA_SAIDA_ID || '1536304188105949244',
    logsRecrutamento: process.env.CANAL_LOGS_RECRUTAMENTO_ID || '1536308230936993792',
    demissao: process.env.CANAL_DEMISSAO_ID || '1536304188609400955',
    anuncios: process.env.CANAL_ANUNCIOS_ID || '1536304188105949250'
  },

  cargos: {
    lideranca: process.env.CARGO_LIDERANCA_ID || '1536304128912003112',
    mecanico: process.env.CARGO_MECANICO_ID || '1536304130000000001',
    recruta: process.env.CARGO_RECRUTA_ID || '1536304131000000002',
    ausente: process.env.CARGO_AUSENTE_ID || '1536304132000000003',
    advLeve: process.env.CARGO_ADV_LEVE_ID || '1536526429897097246',
    advMedia: process.env.CARGO_ADV_MEDIA_ID || '1536304134746275861',
    advGrave: process.env.CARGO_ADV_GRAVE_ID || '1536304135517773834',
    demitido: process.env.CARGO_DEMITIDO_ID || '1536304136000000004'
  },

  visual: {
    corPrincipal: '#2ECC71' || '#2ECC71',
    corAlerta: '#E67E22' || '#E67E22',
    corPerigo: '#EF4444' || '#EF4444',
    corInfo: '#3B82F6' || '#3B82F6',
    bannerUrl: 'https://i.imgur.com/Vv2juos.jpeg' || 'https://i.imgur.com/Vv2juos.jpeg',
    logoUrl: 'https://i.imgur.com/8Q9Z5qA.png' || 'https://i.imgur.com/8Q9Z5qA.png',
    rodape: 'LS CUSTOMS • Setor Disciplinar, Ausências & Recrutamento' || 'LS CUSTOMS • Setor Disciplinar, Ausências & Recrutamento'
  }
};

// ============================================================================
// 🗄️ [2] BANCO DE DADOS LOCAL (JSON Store Seguro com Auto-Criação)
// ============================================================================
const DB_FILE = path.join(__dirname, 'ls_database.json');

class DatabaseManager {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = {
      advertencias: {},
      ausencias: {},
      pontos: {},
      recrutamentos: {}
    };
    this.carregar();
  }

  carregar() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          advertencias: parsed.advertencias || {},
          ausencias: parsed.ausencias || {},
          pontos: parsed.pontos || {},
          recrutamentos: parsed.recrutamentos || {}
        };
        console.log('📦 [DATABASE] Banco de dados local carregado com sucesso!');
      } else {
        this.salvar();
      }
    } catch (e) {
      console.error('⚠️ [DATABASE] Erro ao carregar banco local:', e.message);
    }
  }

  salvar() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('⚠️ [DATABASE] Erro ao salvar banco local:', e.message);
    }
  }

  getAdv(userId) {
    return this.data.advertencias[userId] || { pontos: 0, totalAdvs: 0, historico: [] };
  }

  addAdv(userId, registro) {
    if (!this.data.advertencias[userId]) {
      this.data.advertencias[userId] = { pontos: 0, totalAdvs: 0, historico: [] };
    }
    const ref = this.data.advertencias[userId];
    ref.pontos = (ref.pontos || 0) + registro.pontosGanhos;
    ref.totalAdvs = (ref.totalAdvs || 0) + 1;
    ref.historico.push(registro);
    this.salvar();
    return ref;
  }

  getAusencia(userId) {
    return this.data.ausencias[userId] || null;
  }

  setAusencia(userId, dados) {
    this.data.ausencias[userId] = dados;
    this.salvar();
  }

  getPonto(userId) {
    return this.data.pontos[userId] || { status: 'OFF', totalSegundos: 0 };
  }

  setPonto(userId, dados) {
    this.data.pontos[userId] = dados;
    this.salvar();
  }

  setRecrutamento(userId, dados) {
    this.data.recrutamentos[userId] = dados;
    this.salvar();
  }
}

const db = new DatabaseManager(DB_FILE);

// ============================================================================
// 🎨 [3] EMBED FACTORY (Imagens Seguras contra DiscordAPIError 50035)
// ============================================================================
function attachImagesSafely(embed) {
  if (CONFIG.visual.bannerUrl && typeof CONFIG.visual.bannerUrl === 'string' && CONFIG.visual.bannerUrl.startsWith('http')) {
    try { embed.setImage(CONFIG.visual.bannerUrl); } catch (e) {}
  }
  return embed;
}

class EmbedFactory {
  static painelRecrutamento() {
    const embed = new EmbedBuilder()
      .setColor(CONFIG.visual.corPrincipal)
      .setTitle('🔧 BEM-VINDO À LS CUSTOMS')
      .setDescription([
        'Seja muito bem-vindo(a) à **LS CUSTOMS**!\n',
        '🚗 **Aqui trabalhamos com:**',
        '• Mecânica Geral & Manutenção',
        '• Reparos de Lataria e Engine',
        '• Personalização e Bodykits',
        '• Performance & Tuning',
        '• Pinturas e Acabamentos\n',
        '📜 Leia atentamente as regras e diretrizes da oficina antes de iniciar.\n',
        '👉 **Para solicitar seu Set de Recruta, clique no botão abaixo:**',
        '1️⃣ Nome e Sobrenome In-Game',
        '2️⃣ Passaporte / ID In-Game\n',
        '⚙️ *O Bot alterará seu apelido para ``|Recruta| Nome | #ID`` e concederá o cargo de Recruta automaticamente!*\n',
        '🔧 **LS CUSTOMS — Respeito • Organização • Compromisso**'
      ].join('\n'))
      .setFooter({ text: CONFIG.visual.rodape || 'LS Customs' });

    return attachImagesSafely(embed);
  }

  static recrutamentoAprovado(dados) {
    const { nomeRP, passaporte, userId, autorTag, statusNick, statusCargo } = dados;
    const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    const embed = new EmbedBuilder()
      .setColor(CONFIG.visual.corPrincipal)
      .setTitle('✅ RECRUTAMENTO APROVADO — LS CUSTOMS')
      .setDescription([
        '🎉 **SOLICITAÇÃO APROVADA COM SUCESSO!**\n',
        `👤 **NOME:** ${nomeRP}`,
        `🆔 **PASSAPORTE:** #${passaporte}`,
        '🔰 **CARGO:** 🔰 RECRUTA',
        `🎮 **USUÁRIO:** <@${userId}>`,
        `🏷️ **NICK DEFINIDO:** ``|Recruta| ${nomeRP} | #${passaporte}``\n`,
        `👑 **APROVADO POR:** ${autorTag}`,
        `⚙️ **Status Apelido:** ${statusNick}`,
        `⚙️ **Status Cargo:** ${statusCargo}`
      ].join('\n'))
      .setFooter({ text: `Sistema de Recrutamento Automático • LS CUSTOMS • ${agora}` })
      .setTimestamp();

    return attachImagesSafely(embed);
  }

  static painelAdv() {
    const embed = new EmbedBuilder()
      .setColor(CONFIG.visual.corPerigo)
      .setTitle('⚠️ SETOR DISCIPLINAR — LS CUSTOMS')
      .setDescription([
        'Bem-vindo ao setor disciplinar da **Los Santos Customs**.\n',
        '🟡 **ADVERTÊNCIA LEVE (1 Ponto):** Atrasos / Uniforme / Falhas operacionais simples. *(Não demite)*',
        '🟠 **ADVERTÊNCIA MÉDIA (2 Pontos):** Desobediência / Direção perigosa / Conflitos. *(Não demite)*',
        '🔴 **ADVERTÊNCIA GRAVE (3 Pontos):** Cobrança indevida / Abandono de serviço / Desonestidade.\n',
        '⛔ **REGRA DOS 3 PONTOS:** Ao acumular **3 pontos** ou receber 1 ADV Grave ocorre a **EXONERAÇÃO IMEDIATA**!'
      ].join('\n'))
      .setFooter({ text: CONFIG.visual.rodape || 'LS Customs' });

    return attachImagesSafely(embed);
  }

  static painelAusencia() {
    const embed = new EmbedBuilder()
      .setColor(CONFIG.visual.corAlerta)
      .setTitle('🌴 REGISTRO DE AUSÊNCIAS & LICENÇAS — LS CUSTOMS')
      .setDescription([
        'Precisa se ausentar da cidade por motivos de viagem, estudo ou trabalho?\n',
        '📌 **Regras de Ausência:**',
        '• Prazo Máximo: **5 Dias Corridos**.',
        '• Não é permitido bater ponto durante o período de licença.',
        '• Se a ausência expirar sem aviso prévio à liderança, o sistema aplicará **ADV Grave** automática por abandono.',
        '• Ao retornar à cidade, clique no botão **↩️ Informar Retorno**.'
      ].join('\n'))
      .setFooter({ text: CONFIG.visual.rodape || 'LS Customs' });

    return attachImagesSafely(embed);
  }

  static painelPonto() {
    const embed = new EmbedBuilder()
      .setColor(CONFIG.visual.corInfo)
      .setTitle('⏱️ BATE-PONTO ELETRÔNICO — LS CUSTOMS')
      .setDescription([
        'Registre seu turno de trabalho para contabilização oficial de horas.\n',
        '🟢 **Entrar em Serviço:** Inicia a contagem do seu plantão.',
        '🟡 **Pausa / Intervalo:** Pausa temporária.',
        '🔴 **Finalizar Serviço:** Encerra o turno e gera o relatório.'
      ].join('\n'))
      .setFooter({ text: CONFIG.visual.rodape || 'LS Customs' });

    return attachImagesSafely(embed);
  }

  static tabelaPrecos() {
    const embed = new EmbedBuilder()
      .setColor(CONFIG.visual.corPrincipal)
      .setTitle('🔧 TABELA OFICIAL DE PREÇOS — LOS SANTOS CUSTOMS')
      .setDescription('Valores oficiais padronizados para serviços da oficina:')
      .addFields(
        {
          name: '🔩 Manutenção & Reparos',
          value: [
            '• **Reparo Completo (Kit Mecânico):** R$ 2.500',
            '• **Troca de Óleo e Filtros:** R$ 1.200',
            '• **Alinhamento & Balanceamento:** R$ 1.500',
            '• **Limpeza & Higienização:** R$ 800'
          ].join('\n'),
          inline: false
        },
        {
          name: '⚡ Performance & Motor',
          value: [
            '• **Upgrade Motor Nível 1 ao 4:** R$ 15.000 a R$ 45.000',
            '• **Instalação de Turbo Compressor:** R$ 35.000',
            '• **Transmissão Esportiva / Corrida:** R$ 20.000',
            '• **Freios de Cerâmica:** R$ 18.000'
          ].join('\n'),
          inline: false
        },
        {
          name: '🛡️ Blindagem & Proteção',
          value: [
            '• **Blindagem Nível 1 ao 5:** R$ 25.000 a R$ 85.000',
            '• **Pneus Blindados:** R$ 30.000'
          ].join('\n'),
          inline: false
        },
        {
          name: '🎨 Customização & Estética',
          value: [
            '• **Pintura Primária/Secundária:** R$ 5.000',
            '• **Suspensão a Ar / Hidráulica:** R$ 22.000',
            '• **Kits Aerodinâmicos (Spoilers):** R$ 12.000',
            '• **Faróis Xênon & Neon:** R$ 7.500'
          ].join('\n'),
          inline: false
        }
      )
      .setFooter({ text: CONFIG.visual.rodape || 'LS Customs' })
      .setTimestamp();

    return attachImagesSafely(embed);
  }
}

// ============================================================================
// 🛡️ [4] VALIDAÇÃO ANTI-TROLL & PERMISSÕES
// ============================================================================
function checkIsLeader(member) {
  if (!member) return false;
  
  // Verifica se é administrador
  if (member.permissions && typeof member.permissions.has === 'function') {
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  }

  // Verifica cargo liderança
  if (member.roles) {
    if (member.roles.cache && typeof member.roles.cache.has === 'function') {
      if (member.roles.cache.has(CONFIG.cargos.lideranca)) return true;
    }
    if (Array.isArray(member.roles)) {
      if (member.roles.includes(CONFIG.cargos.lideranca)) return true;
    }
  }

  return false;
}

function validarCandidatura(dados) {
  const { nome, passaporte, idadeDisp, exp, motivo } = dados;

  const passLimpo = passaporte ? passaporte.replace(/\D/g, '') : '';
  if (!passLimpo || parseInt(passLimpo, 10) <= 0) {
    return { valido: false, motivo: 'Passaporte inválido! Digite apenas os números do seu ID.' };
  }

  if (!nome || nome.trim().length < 3 || /^[0-9]+$/.test(nome.trim())) {
    return { valido: false, motivo: 'Nome RP inválido! Digite seu nome e sobrenome de personagem.' };
  }

  if (idadeDisp !== undefined && exp !== undefined && motivo !== undefined) {
    const idadeMatch = (idadeDisp || '').match(/\d{1,2}/);
    if (idadeMatch) {
      const idadeNum = parseInt(idadeMatch[0], 10);
      if (idadeNum < 14 || idadeNum > 85) {
        return { valido: false, motivo: 'Idade inválida! Aceitamos candidatos entre 14 e 85 anos.' };
      }
    }

    const textoCombinado = `${exp} ${motivo}`.toLowerCase();
    if (textoCombinado.length < 10) {
      return { valido: false, motivo: 'Respostas muito curtas! Descreva melhor suas qualificações.' };
    }
  }

  return { valido: true, passaporte: passLimpo, nome: nome.trim() };
}

// ============================================================================
// ⚠️ [5] MÓDULO DISCIPLINAR
// ============================================================================
async function processarAdvertencia(guild, userId, passaporte, tipo, motivo, provas, autorTag) {
  let pontosGanhos = 1;
  let cargoId = CONFIG.cargos.advLeve;

  if (tipo === 'MEDIA') {
    pontosGanhos = 2;
    cargoId = CONFIG.cargos.advMedia;
  } else if (tipo === 'GRAVE') {
    pontosGanhos = 3;
    cargoId = CONFIG.cargos.advGrave;
  }

  const registro = {
    id: Date.now().toString(),
    passaporte,
    tipo,
    pontosGanhos,
    motivo,
    provas: provas || 'Nenhuma prova anexada.',
    autor: autorTag,
    data: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    timestamp: Date.now()
  };

  const statusAdv = db.addAdv(userId, registro);
  const totalPontos = statusAdv.pontos;
  const totalAdvs = statusAdv.totalAdvs;

  // Atribuir cargo correspondente de forma segura
  try {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member && cargoId && guild.roles.cache.has(cargoId)) {
      await member.roles.add(cargoId).catch(err => console.warn('Não foi possível dar cargo ADV:', err.message));
    }
  } catch (e) {}

  // Enviar no Canal de Advertências (Canal 1536304172952191049)
  const canalAdv = guild.channels.cache.get(CONFIG.canais.adv) || guild.channels.cache.get(CONFIG.canais.logsAdv);
  if (canalAdv) {
    const embedAdv = new EmbedBuilder()
      .setColor(CONFIG.visual.corPerigo)
      .setTitle(`⚠️ ADVERTÊNCIA DISCIPLINAR — ${tipo}`)
      .setDescription([
        `👤 **Membro:** <@${userId}> (``${userId}``)`,
        `🆔 **Passaporte:** ``${passaporte}```,
        `📊 **Gravidade:** ``${tipo}`` (+${pontosGanhos} ponto(s))`,
        `📈 **Pontuação Disciplinar:** ``${totalPontos}/3 Pontos`` (${totalAdvs}ª infração)\n`,
        `📝 **Motivo:** ${motivo}`,
        `🔗 **Provas:** ${provas || 'Nenhuma'}`,
        `👮 **Aplicado por:** ${autorTag}`
      ].join('\n'))
      .setFooter({ text: CONFIG.visual.rodape || 'LS Customs' })
      .setTimestamp();

    attachImagesSafely(embedAdv);
    canalAdv.send({ embeds: [embedAdv] }).catch(err => console.warn('Erro ao enviar log ADV:', err.message));
  }

  // DM ao usuário
  try {
    const user = await guild.client.users.fetch(userId).catch(() => null);
    if (user) {
      const dm = new EmbedBuilder()
        .setColor(CONFIG.visual.corPerigo)
        .setTitle('⚠️ VOCÊ RECEBEU UMA ADVERTÊNCIA — LS CUSTOMS')
        .setDescription([
          'Você recebeu uma sanção disciplinar na **Los Santos Customs**.\n',
          `📊 **Tipo:** ``${tipo}`` (+${pontosGanhos} ponto(s))`,
          `📝 **Motivo:** ${motivo}`,
          `📈 **Acúmulo Atual:** ``${totalPontos}/3 Pontos``.\n`,
          totalPontos < 3 && tipo !== 'GRAVE'
            ? 'ℹ️ Você continua na equipe ativa. Cumpra as regras para evitar punições maiores!'
            : '⚠️ **Atenção:** Ao atingir 3 pontos, ocorre a **exoneração imediata**!'
        ].join('\n'))
        .setTimestamp();

      user.send({ embeds: [dm] }).catch(() => null);
    }
  } catch (e) {}

  // Demissão Automática em 3 pontos ou GRAVE
  if (totalPontos >= 3 || tipo === 'GRAVE') {
    await processarDemissao(
      guild, 
      userId, 
      passaporte, 
      `Exoneração automática por acúmulo de advertências (${totalPontos}/3 pontos).`,
      'Sistema Disciplinar Automático'
    );
  }

  return registro;
}

// ============================================================================
// 🛑 [6] MÓDULO DE DEMISSÃO
// ============================================================================
async function processarDemissao(guild, userId, passaporte, motivo, autorTag) {
  try {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member) {
      const cargosRemover = [
        CONFIG.cargos.mecanico,
        CONFIG.cargos.recruta,
        CONFIG.cargos.ausente,
        CONFIG.cargos.advLeve,
        CONFIG.cargos.advMedia,
        CONFIG.cargos.advGrave
      ].filter(c => c && guild.roles.cache.has(c));

      for (const cId of cargosRemover) {
        if (member.roles.cache.has(cId)) {
          await member.roles.remove(cId).catch(() => null);
        }
      }

      if (CONFIG.cargos.demitido && guild.roles.cache.has(CONFIG.cargos.demitido)) {
        await member.roles.add(CONFIG.cargos.demitido).catch(() => null);
      }
    }

    const canalDemissao = guild.channels.cache.get(CONFIG.canais.demissao);
    if (canalDemissao) {
      const embedDemissao = new EmbedBuilder()
        .setColor('#000000')
        .setTitle('⛔ EXONERAÇÃO / DEMISSÃO OFICIAL — LS CUSTOMS')
        .setDescription([
          'O funcionário abaixo foi oficialmente **DESLIGADO** do quadro da Los Santos Customs.\n',
          `👤 **Ex-Funcionário:** <@${userId}> (``${userId}``)`,
          `🆔 **Passaporte:** ``${passaporte}```,
          `📋 **Motivo da Exoneração:** ${motivo}`,
          `👮 **Responsável:** ${autorTag}`,
          `📅 **Data:** ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`
        ].join('\n'))
        .setFooter({ text: CONFIG.visual.rodape || 'LS Customs' })
        .setTimestamp();

      attachImagesSafely(embedDemissao);
      canalDemissao.send({ embeds: [embedDemissao] }).catch(() => null);
    }
  } catch (err) {
    console.error('⚠️ [DEMISSAO] Erro ao executar demissão:', err.message);
  }
}

// ============================================================================
// ⏰ [7] MÓDULO DE AUSÊNCIAS (Verificação Periódica)
// ============================================================================
async function verificarAusenciasVencidas(clientInstance) {
  try {
    const agora = Date.now();
    const guild = clientInstance.guilds.cache.get(CONFIG.guildId);
    if (!guild) return;

    const canalLogs = guild.channels.cache.get(CONFIG.canais.logsAusencia);

    for (const [userId, dados] of Object.entries(db.data.ausencias)) {
      if (dados.status === 'ATIVA' && agora > dados.vencimento) {
        dados.status = 'VENCIDA';
        db.salvar();

        console.log(`⚠️ Ausência expirada: Usuário ${userId} | Passaporte ${dados.passaporte}`);

        await processarAdvertencia(
          guild, 
          userId, 
          dados.passaporte, 
          'GRAVE', 
          'Ausência expirada sem retorno ou aviso prévio à Liderança (Abandono de Função).', 
          'Sistema Automático de Ausências',
          'Sistema Automático'
        );

        if (canalLogs) {
          const embedExp = new EmbedBuilder()
            .setColor(CONFIG.visual.corPerigo)
            .setTitle('🚨 AUSÊNCIA EXPIRADA — PUNIÇÃO AUTOMÁTICA')
            .setDescription([
              `O prazo de licença do mecânico <@${userId}> (``${dados.nomeRP}`` - ID: ``${dados.passaporte}``) **EXPIROU**!\n`,
              `📅 **Prazo concedido:** ${dados.dias} dia(s)`,
              `⚠️ **Sanção Aplicada:** Advertência Grave automática por abandono de função.`
            ].join('\n'))
            .setTimestamp();

          canalLogs.send({ embeds: [embedExp] }).catch(() => null);
        }
      }
    }
  } catch (e) {
    console.error('Erro na rotina de ausências:', e.message);
  }
}

// ============================================================================
// 🤖 [8] CLIENTE DISCORD & REGISTRO DE COMANDOS
// ============================================================================
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

const slashCommands = [
  new SlashCommandBuilder().setName('painelregistro').setDescription('Envia o Painel Oficial de Boas-Vindas e Set de Recruta'),
  new SlashCommandBuilder().setName('paineladv').setDescription('Envia o Painel Interativo de Advertências Disciplinares'),
  new SlashCommandBuilder().setName('painelausencia').setDescription('Envia o Painel Interativo de Ausências & Licenças'),
  new SlashCommandBuilder().setName('painelponto').setDescription('Envia o Painel Interativo de Bate-Ponto'),
  new SlashCommandBuilder().setName('tabela').setDescription('Exibe a Tabela Oficial de Preços e Serviços'),
  new SlashCommandBuilder().setName('minhasadvs').setDescription('Consulta seu histórico pessoal de advertências'),
  new SlashCommandBuilder().setName('verificarvencidas').setDescription('Verifica manualmente ausências expiradas'),
  new SlashCommandBuilder().setName('demitir').setDescription('Exonera um membro da equipe (Liderança)')
    .addUserOption(opt => opt.setName('membro').setDescription('Membro a ser demitido').setRequired(true))
    .addStringOption(opt => opt.setName('passaporte').setDescription('Passaporte RP').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo da exoneração').setRequired(true))
    .addStringOption(opt => opt.setName('provas').setDescription('Link de provas (opcional)').setRequired(false)),
  new SlashCommandBuilder().setName('ajuda').setDescription('Lista todos os comandos e painéis da oficina')
];

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ [DISCORD] Bot conectado como: ${c.user.tag}`);

  // Registrar Slash Commands na Guild
  if (CONFIG.token && CONFIG.guildId) {
    const rest = new REST({ version: '10' }).setToken(CONFIG.token);
    try {
      console.log('🔄 Registrando Slash Commands no servidor...');
      await rest.put(Routes.applicationGuildCommands(c.user.id, CONFIG.guildId), { body: slashCommands });
      console.log('✅ Slash Commands registrados com sucesso!');
    } catch (e) {
      console.error('⚠️ Aviso ao registrar slash commands (verifique IDs no .env):', e.message);
    }
  }

  setInterval(() => {
    verificarAusenciasVencidas(client);
  }, 10 * 60 * 1000);
});

// ============================================================================
// 📨 [9] COMANDOS POR PREFIXO (!painel-...)
// ============================================================================
client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot || !message.guild) return;

    const content = message.content.trim().toLowerCase();

    // 1. Painel de Boas-Vindas / Registro
    if (['!painel-registro', '!registro', '!setrecruta', '!painel-bemvindo'].includes(content)) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_solicitar_set_recruta').setLabel('🔰 Solicitar Set de Recruta').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_iniciar_recrutamento').setLabel('📝 Formulário Completo').setStyle(ButtonStyle.Secondary)
      );
      return await message.channel.send({ embeds: [EmbedFactory.painelRecrutamento()], components: [row] });
    }

    // 2. Painel de Advertências
    if (['!painel-adv', '!paineladv', '!adv'].includes(content)) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_abrir_modal_adv').setLabel('⚠️ Aplicar Advertência').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('btn_consultar_minhas_advs').setLabel('📋 Minhas Advertências').setStyle(ButtonStyle.Secondary)
      );
      return await message.channel.send({ embeds: [EmbedFactory.painelAdv()], components: [row] });
    }

    // 3. Painel de Ausências
    if (['!painel-ausencia', '!painelausencia', '!ausencia'].includes(content)) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_abrir_modal_ausencia').setLabel('🌴 Solicitar Ausência').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('btn_informar_retorno_ausencia').setLabel('↩️ Informar Retorno').setStyle(ButtonStyle.Success)
      );
      return await message.channel.send({ embeds: [EmbedFactory.painelAusencia()], components: [row] });
    }

    // 4. Painel de Bate-Ponto
    if (['!painel-ponto', '!ponto'].includes(content)) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_ponto_entrar').setLabel('🟢 Entrar em Serviço').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_ponto_finalizar').setLabel('🔴 Finalizar Serviço').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('btn_ponto_consultar').setLabel('📊 Minhas Horas').setStyle(ButtonStyle.Primary)
      );
      return await message.channel.send({ embeds: [EmbedFactory.painelPonto()], components: [row] });
    }

    // 5. Tabela de Preços
    if (content === '!tabela') {
      return await message.channel.send({ embeds: [EmbedFactory.tabelaPrecos()] });
    }

    // 6. Ajuda
    if (content === '!ajuda') {
      const embedAjuda = new EmbedBuilder()
        .setColor(CONFIG.visual.corPrincipal)
        .setTitle('📖 GUIA DE COMANDOS & PAINÉIS — LS CUSTOMS')
        .setDescription([
          '**Painéis Principais:**',
          '• ``!painel-registro`` ou ``/painelregistro`` — Boas-vindas e Set de Recruta',
          '• ``!painel-adv`` ou ``/paineladv`` — Painel de Advertências',
          '• ``!painel-ausencia`` ou ``/painelausencia`` — Painel de Ausências',
          '• ``!painel-ponto`` ou ``/painelponto`` — Bate-Ponto Eletrônico\n',
          '**Comandos Rápidos:**',
          '• ``!tabela`` ou ``/tabela`` — Tabela de Preços de Serviços',
          '• ``/minhasadvs`` — Consulta suas advertências ativas',
          '• ``/verificarvencidas`` — Checa ausências expiradas',
          '• ``/demitir`` — Exonera membro da facção (Líder)'
        ].join('\n'))
        .setFooter({ text: CONFIG.visual.rodape || 'LS Customs' });

      return await message.channel.send({ embeds: [embedAjuda] });
    }
  } catch (err) {
    console.error('Erro ao processar comando por prefixo:', err.message);
  }
});

// ============================================================================
// 🖱️ [10] ROTEADOR DE INTERAÇÕES (Slash, Botões & Modais)
// ============================================================================
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // ------------------------------------------------------------------------
    // A) SLASH COMMANDS
    // ------------------------------------------------------------------------
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;

      if (commandName === 'painelregistro') {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('btn_solicitar_set_recruta').setLabel('🔰 Solicitar Set de Recruta').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('btn_iniciar_recrutamento').setLabel('📝 Formulário Completo').setStyle(ButtonStyle.Secondary)
        );
        return await interaction.reply({ embeds: [EmbedFactory.painelRecrutamento()], components: [row] });
      }

      if (commandName === 'paineladv') {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('btn_abrir_modal_adv').setLabel('⚠️ Aplicar Advertência').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('btn_consultar_minhas_advs').setLabel('📋 Minhas Advertências').setStyle(ButtonStyle.Secondary)
        );
        return await interaction.reply({ embeds: [EmbedFactory.painelAdv()], components: [row] });
      }

      if (commandName === 'painelausencia') {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('btn_abrir_modal_ausencia').setLabel('🌴 Solicitar Ausência').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('btn_informar_retorno_ausencia').setLabel('↩️ Informar Retorno').setStyle(ButtonStyle.Success)
        );
        return await interaction.reply({ embeds: [EmbedFactory.painelAusencia()], components: [row] });
      }

      if (commandName === 'painelponto') {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('btn_ponto_entrar').setLabel('🟢 Entrar em Serviço').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('btn_ponto_finalizar').setLabel('🔴 Finalizar Serviço').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('btn_ponto_consultar').setLabel('📊 Minhas Horas').setStyle(ButtonStyle.Primary)
        );
        return await interaction.reply({ embeds: [EmbedFactory.painelPonto()], components: [row] });
      }

      if (commandName === 'tabela') {
        return await interaction.reply({ embeds: [EmbedFactory.tabelaPrecos()] });
      }

      if (commandName === 'minhasadvs') {
        const userAdv = db.getAdv(interaction.user.id);
        if (!userAdv || userAdv.pontos === 0) {
          return await interaction.reply({ content: '🎉 Parabéns! Você possui **0 advertências** ativas na LS Customs.', ephemeral: true });
        }
        return await interaction.reply({
          content: `📊 Seu status disciplinar: **${userAdv.pontos}/3 Pontos** (${userAdv.totalAdvs} advertência(s) registrada(s)).`,
          ephemeral: true
        });
      }

      if (commandName === 'verificarvencidas') {
        await interaction.deferReply({ ephemeral: true });
        await verificarAusenciasVencidas(client);
        return await interaction.editReply({ content: '✅ Verificação de ausências executada com sucesso!' });
      }

      if (commandName === 'demitir') {
        if (!checkIsLeader(interaction.member)) {
          return await interaction.reply({ content: '❌ Apenas a Liderança pode demitir membros.', ephemeral: true });
        }

        const membroAlvo = interaction.options.getUser('membro');
        const passaporte = interaction.options.getString('passaporte');
        const motivo = interaction.options.getString('motivo');

        await processarDemissao(interaction.guild, membroAlvo.id, passaporte, motivo, interaction.user.tag);
        return await interaction.reply({ content: `✅ O funcionário <@${membroAlvo.id}> foi exonerado com sucesso!`, ephemeral: true });
      }

      if (commandName === 'ajuda') {
        return await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(CONFIG.visual.corPrincipal)
              .setTitle('📖 GUIA DE COMANDOS — LS CUSTOMS')
              .setDescription([
                '• ``/painelregistro`` — Painel de recrutamento e Set Recruta',
                '• ``/paineladv`` — Painel de advertências',
                '• ``/painelausencia`` — Painel de ausências',
                '• ``/painelponto`` — Painel de bate-ponto',
                '• ``/tabela`` — Tabela de preços oficiais',
                '• ``/minhasadvs`` — Consulta suas advertências',
                '• ``/verificarvencidas`` — Checa ausências expiradas',
                '• ``/demitir`` — Exonera membro (Liderança)'
              ].join('\n'))
          ],
          ephemeral: true
        });
      }
    }

    // ------------------------------------------------------------------------
    // B) BOTÕES INTERATIVOS
    // ------------------------------------------------------------------------
    if (interaction.isButton()) {
      const { customId } = interaction;

      // 1. Set de Recruta Rápido (2 Campos)
      if (customId === 'btn_solicitar_set_recruta') {
        const modal = new ModalBuilder().setCustomId('modal_set_recruta').setTitle('🔰 Solicitar Set de Recruta');
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('set_nome').setLabel('1️⃣ Nome e Sobrenome In-Game').setPlaceholder('Ex: Xavi Souza').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('set_passaporte').setLabel('2️⃣ Passaporte / ID In-Game').setPlaceholder('Ex: 846').setStyle(TextInputStyle.Short).setRequired(true))
        );
        return await interaction.showModal(modal);
      }

      // 2. Formulário Completo de Recrutamento (5 Campos)
      if (customId === 'btn_iniciar_recrutamento') {
        const modal = new ModalBuilder().setCustomId('modal_recrutamento_oficial').setTitle('📝 Candidatura LS Customs');
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rec_nome').setLabel('Nome Completo (RP)').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rec_passaporte').setLabel('ID / Passaporte').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rec_idade_disp').setLabel('Idade Real & Horários').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rec_exp').setLabel('Experiência Prévia').setStyle(TextInputStyle.Paragraph).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rec_motivo').setLabel('Por que a LS Customs?').setStyle(TextInputStyle.Paragraph).setRequired(true))
        );
        return await interaction.showModal(modal);
      }

      // 3. Abrir Modal de Advertência
      if (customId === 'btn_abrir_modal_adv') {
        if (!checkIsLeader(interaction.member)) {
          return await interaction.reply({ content: '❌ Apenas a Liderança pode aplicar advertências disciplinares.', ephemeral: true });
        }

        const modal = new ModalBuilder().setCustomId('modal_aplicar_adv').setTitle('⚠️ Aplicar Advertência');
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('adv_user_id').setLabel('ID ou Menção Discord').setPlaceholder('Ex: 291096519822').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('adv_passaporte').setLabel('Passaporte RP').setPlaceholder('Ex: 846').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('adv_grau').setLabel('Gravidade (LEVE, MEDIA ou GRAVE)').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('adv_motivo').setLabel('Motivo da Punição').setStyle(TextInputStyle.Paragraph).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('adv_provas').setLabel('Link de Provas (Opcional)').setStyle(TextInputStyle.Short).setRequired(false))
        );
        return await interaction.showModal(modal);
      }

      // 4. Consultar Minhas Advertências
      if (customId === 'btn_consultar_minhas_advs') {
        const userAdv = db.getAdv(interaction.user.id);
        return await interaction.reply({
          content: `📊 Seu status disciplinar: **${userAdv.pontos}/3 Pontos** (${userAdv.totalAdvs} advertência(s)).`,
          ephemeral: true
        });
      }

      // 5. Solicitar Ausência
      if (customId === 'btn_abrir_modal_ausencia') {
        const modal = new ModalBuilder().setCustomId('modal_solicitar_ausencia').setTitle('🌴 Solicitar Ausência');
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('aus_passaporte').setLabel('ID / Passaporte RP').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('aus_nome').setLabel('Nome Completo (RP)').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('aus_dias').setLabel('Quantidade de Dias (Máx: 5)').setPlaceholder('1 a 5').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('aus_motivo').setLabel('Motivo da Ausência').setStyle(TextInputStyle.Paragraph).setRequired(true))
        );
        return await interaction.showModal(modal);
      }

      // 6. Informar Retorno de Ausência
      if (customId === 'btn_informar_retorno_ausencia') {
        const registro = db.getAusencia(interaction.user.id);
        if (!registro || registro.status !== 'ATIVA') {
          return await interaction.reply({ content: 'ℹ️ Você não possui nenhuma ausência ativa no momento.', ephemeral: true });
        }

        registro.status = 'FINALIZADA';
        db.salvar();

        if (CONFIG.cargos.ausente && interaction.member?.roles?.cache?.has?.(CONFIG.cargos.ausente)) {
          interaction.member.roles.remove(CONFIG.cargos.ausente).catch(() => null);
        }

        const canalLogs = interaction.guild?.channels?.cache?.get(CONFIG.canais.logsAusencia);
        if (canalLogs) {
          const retEmbed = new EmbedBuilder()
            .setColor(CONFIG.visual.corPrincipal)
            .setTitle('↩️ RETORNO DE AUSÊNCIA CONFIRMADO')
            .setDescription(`O mecânico <@${interaction.user.id}> (``${registro.nomeRP}`` - ID: ``${registro.passaporte}``) retornou às atividades!`)
            .setTimestamp();
          canalLogs.send({ embeds: [retEmbed] }).catch(() => null);
        }

        return await interaction.reply({ content: '✅ Seu retorno foi registrado com sucesso! Bom trabalho.', ephemeral: true });
      }

      // 7. Bate-Ponto: Entrar em Serviço
      if (customId === 'btn_ponto_entrar') {
        const uId = interaction.user.id;
        const p = db.getPonto(uId);
        if (p.status === 'EM_SERVICO') {
          return await interaction.reply({ content: '⚠️ Você já está com ponto aberto em andamento!', ephemeral: true });
        }

        db.setPonto(uId, {
          status: 'EM_SERVICO',
          inicioTimestamp: Date.now(),
          totalSegundos: (p.totalSegundos || 0)
        });

        const canalLogs = interaction.guild?.channels?.cache?.get(CONFIG.canais.logsPonto) || interaction.guild?.channels?.cache?.get(CONFIG.canais.ponto);
        if (canalLogs) {
          const embed = new EmbedBuilder()
            .setColor(CONFIG.visual.corPrincipal)
            .setTitle('🟢 BATE-PONTO — ENTRADA EM SERVIÇO')
            .setDescription(`👤 **Mecânico:** <@${uId}>\n⏰ **Horário de Entrada:** ${new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`)
            .setTimestamp();
          canalLogs.send({ embeds: [embed] }).catch(() => null);
        }

        return await interaction.reply({ content: '🟢 **Ponto aberto com sucesso!** Tenha um ótimo plantão.', ephemeral: true });
      }

      // 8. Bate-Ponto: Finalizar Serviço
      if (customId === 'btn_ponto_finalizar') {
        const uId = interaction.user.id;
        const p = db.getPonto(uId);
        if (p.status !== 'EM_SERVICO') {
          return await interaction.reply({ content: 'ℹ️ Você não tem nenhum ponto aberto para encerrar.', ephemeral: true });
        }

        const duracao = Math.floor((Date.now() - p.inicioTimestamp) / 1000);
        const horas = Math.floor(duracao / 3600);
        const mins = Math.floor((duracao % 3600) / 60);

        p.totalSegundos = (p.totalSegundos || 0) + duracao;
        p.status = 'FINALIZADO';
        db.setPonto(uId, p);

        const canalLogs = interaction.guild?.channels?.cache?.get(CONFIG.canais.logsPonto) || interaction.guild?.channels?.cache?.get(CONFIG.canais.ponto);
        if (canalLogs) {
          const embed = new EmbedBuilder()
            .setColor(CONFIG.visual.corPerigo)
            .setTitle('🔴 BATE-PONTO — SAÍDA DE SERVIÇO')
            .setDescription(`👤 **Mecânico:** <@${uId}>\n⏱️ **Tempo no Turno:** ``${horas}h ${mins}min``\n📈 **Total Acumulado:** ``${Math.floor(p.totalSegundos / 3600)}h ${Math.floor((p.totalSegundos % 3600) / 60)}min```)
            .setTimestamp();
          canalLogs.send({ embeds: [embed] }).catch(() => null);
        }

        return await interaction.reply({ content: `🔴 **Ponto finalizado!** Você trabalhou **${horas}h ${mins}min** neste turno.`, ephemeral: true });
      }

      // 9. Bate-Ponto: Consultar Horas
      if (customId === 'btn_ponto_consultar') {
        const p = db.getPonto(interaction.user.id);
        const seg = p.totalSegundos || 0;
        const h = Math.floor(seg / 3600);
        const m = Math.floor((seg % 3600) / 60);
        const status = p.status === 'EM_SERVICO' ? '🟢 Em Serviço' : '🔴 Fora de Serviço';

        return await interaction.reply({
          content: `📊 **Seu Histórico de Ponto:**\n• Status: ${status}\n• Total de Horas Acumuladas: **${h}h ${m}min**`,
          ephemeral: true
        });
      }

      // 10. Recrutamento: Aprovação pela Liderança
      if (customId.startsWith('rec_aprovar_')) {
        const candId = customId.replace('rec_aprovar_', '');
        if (!checkIsLeader(interaction.member)) {
          return await interaction.reply({ content: '❌ Apenas a Liderança pode aprovar candidatos.', ephemeral: true });
        }

        const member = await interaction.guild?.members?.fetch(candId).catch(() => null);
        const candDados = db.data.recrutamentos[candId] || { nomeRP: 'Mecânico', passaporte: '000' };

        let statusNick = '✅ Alterado com sucesso';
        let statusCargo = '✅ Cargo atribuído';

        if (member) {
          const novoNick = `|Recruta| ${candDados.nomeRP} | #${candDados.passaporte}`;
          try {
            await member.setNickname(novoNick);
          } catch (e) {
            statusNick = '⚠️ Sem permissão para alterar apelido';
          }
          try {
            if (CONFIG.cargos.recruta && interaction.guild.roles.cache.has(CONFIG.cargos.recruta)) {
              await member.roles.add(CONFIG.cargos.recruta);
            }
          } catch (e) {
            statusCargo = '⚠️ Sem permissão para gerenciar cargo';
          }
        }

        const embedAprovado = EmbedFactory.recrutamentoAprovado({
          nomeRP: candDados.nomeRP,
          passaporte: candDados.passaporte,
          userId: candId,
          autorTag: `<@${interaction.user.id}>`,
          statusNick,
          statusCargo
        });

        return await interaction.update({ embeds: [embedAprovado], components: [] });
      }

      // 11. Recrutamento: Reprovação
      if (customId.startsWith('rec_reprovar_')) {
        if (!checkIsLeader(interaction.member)) {
          return await interaction.reply({ content: '❌ Apenas a Liderança pode reprovar.', ephemeral: true });
        }

        const origEmbed = EmbedBuilder.from(interaction.message.embeds[0])
          .setColor(CONFIG.visual.corPerigo)
          .setTitle('❌ CANDIDATURA REPROVADA')
          .setFooter({ text: `Reprovado por ${interaction.user.tag}` });

        return await interaction.update({ embeds: [origEmbed], components: [] });
      }
    }

    // ------------------------------------------------------------------------
    // C) ENVIO DE FORMULÁRIOS (Modals)
    // ------------------------------------------------------------------------
    if (interaction.isModalSubmit()) {
      const { customId } = interaction;

      // 1. Modal: Set de Recruta Direto (2 Campos)
      if (customId === 'modal_set_recruta') {
        const nome = interaction.fields.getTextInputValue('set_nome');
        const passaporte = interaction.fields.getTextInputValue('set_passaporte');

        const val = validarCandidatura({ nome, passaporte });
        if (!val.valido) {
          return await interaction.reply({ content: `⚠️ **Dados Inválidos:** ${val.motivo}`, ephemeral: true });
        }

        const member = interaction.member;
        let statusNick = '✅ Alterado com sucesso';
        let statusCargo = '✅ Cargo atribuído';

        const novoNick = `|Recruta| ${val.nome} | #${val.passaporte}`;
        try {
          if (member && typeof member.setNickname === 'function') {
            await member.setNickname(novoNick);
          }
        } catch (e) {
          statusNick = '⚠️ Sem permissão para alterar apelido';
        }
        try {
          if (member && CONFIG.cargos.recruta && interaction.guild.roles.cache.has(CONFIG.cargos.recruta)) {
            await member.roles.add(CONFIG.cargos.recruta);
          }
        } catch (e) {
          statusCargo = '⚠️ Sem permissão para gerenciar cargo';
        }

        const embedAprovado = EmbedFactory.recrutamentoAprovado({
          nomeRP: val.nome,
          passaporte: val.passaporte,
          userId: interaction.user.id,
          autorTag: 'Sistema Automático',
          statusNick,
          statusCargo
        });

        const canalLogs = interaction.guild?.channels?.cache?.get(CONFIG.canais.logsRecrutamento) || interaction.channel;
        if (canalLogs) canalLogs.send({ embeds: [embedAprovado] }).catch(() => null);

        return await interaction.reply({
          content: `🎉 **Set de Recruta concluído com sucesso!** Bem-vindo, **${novoNick}**!`,
          embeds: [embedAprovado],
          ephemeral: true
        });
      }

      // 2. Modal: Candidatura Completa (5 Campos)
      if (customId === 'modal_recrutamento_oficial') {
        const nome = interaction.fields.getTextInputValue('rec_nome');
        const passaporte = interaction.fields.getTextInputValue('rec_passaporte');
        const idadeDisp = interaction.fields.getTextInputValue('rec_idade_disp');
        const exp = interaction.fields.getTextInputValue('rec_exp');
        const motivo = interaction.fields.getTextInputValue('rec_motivo');

        const val = validarCandidatura({ nome, passaporte, idadeDisp, exp, motivo });
        if (!val.valido) {
          return await interaction.reply({ content: `⚠️ ${val.motivo}`, ephemeral: true });
        }

        db.setRecrutamento(interaction.user.id, {
          nomeRP: val.nome,
          passaporte: val.passaporte,
          status: 'PENDENTE'
        });

        const canalLogs = interaction.guild?.channels?.cache?.get(CONFIG.canais.logsRecrutamento);
        if (canalLogs) {
          const logEmbed = new EmbedBuilder()
            .setColor(CONFIG.visual.corPrincipal)
            .setTitle('📝 NOVA CANDIDATURA DE RECRUTAMENTO')
            .setDescription([
              `👤 **Candidato:** <@${interaction.user.id}>`,
              `🚗 **Nome RP:** ``${val.nome}```,
              `🆔 **ID / Passaporte:** ``${val.passaporte}```,
              `🎂 **Idade & Horários:** ``${idadeDisp}``\n`,
              `🔧 **Experiência:**\n${exp}\n`,
              `🎯 **Motivo:**\n${motivo}`
            ].join('\n'))
            .setFooter({ text: 'Aguardando avaliação da liderança...' })
            .setTimestamp();

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`rec_aprovar_${interaction.user.id}`).setLabel('✅ Aprovar').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`rec_reprovar_${interaction.user.id}`).setLabel('❌ Reprovar').setStyle(ButtonStyle.Danger)
          );

          await canalLogs.send({ embeds: [logEmbed], components: [row] }).catch(() => null);
        }

        return await interaction.reply({ content: '✅ **Sua candidatura foi enviada com sucesso!** A liderança avaliará em breve.', ephemeral: true });
      }

      // 3. Modal: Aplicar Advertência (Canal 1536304172952191049)
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
          return await interaction.reply({ content: '❌ ID de usuário Discord inválido!', ephemeral: true });
        }

        await processarAdvertencia(
          interaction.guild,
          userInput,
          passaporte,
          tipo,
          motivo,
          provas,
          interaction.user.tag
        );

        return await interaction.reply({
          content: `✅ Advertência **${tipo}** aplicada com sucesso ao usuário <@${userInput}>!`,
          ephemeral: true
        });
      }

      // 4. Modal: Solicitar Ausência
      if (customId === 'modal_solicitar_ausencia') {
        const passaporte = interaction.fields.getTextInputValue('aus_passaporte');
        const nome = interaction.fields.getTextInputValue('aus_nome');
        const diasStr = interaction.fields.getTextInputValue('aus_dias').replace(/\D/g, '');
        const motivo = interaction.fields.getTextInputValue('aus_motivo');

        const diasNum = parseInt(diasStr, 10) || 1;
        if (diasNum < 1 || diasNum > 5) {
          return await interaction.reply({ content: '❌ O prazo de ausência deve ser entre **1 e 5 dias** corridos!', ephemeral: true });
        }

        const agora = Date.now();
        const vencimento = agora + (diasNum * 24 * 60 * 60 * 1000);

        db.setAusencia(interaction.user.id, {
          userId: interaction.user.id,
          passaporte,
          nomeRP: nome,
          dias: diasNum,
          motivo,
          inicio: agora,
          vencimento,
          status: 'ATIVA'
        });

        if (CONFIG.cargos.ausente && interaction.guild.roles.cache.has(CONFIG.cargos.ausente)) {
          interaction.member.roles.add(CONFIG.cargos.ausente).catch(() => null);
        }

        const canalLogs = interaction.guild?.channels?.cache?.get(CONFIG.canais.logsAusencia);
        if (canalLogs) {
          const dataVenc = new Date(vencimento).toLocaleDateString('pt-BR');
          const embed = new EmbedBuilder()
            .setColor(CONFIG.visual.corAlerta)
            .setTitle('🌴 REGISTRO DE AUSÊNCIA CONFIRMADO')
            .setDescription([
              `👤 **Mecânico:** <@${interaction.user.id}> (``${nome}``)`,
              `🆔 **Passaporte:** ``${passaporte}```,
              `📅 **Duração:** ``${diasNum} Dia(s)```,
              `⏰ **Data Limite:** ``${dataVenc}``\n`,
              `📝 **Motivo:** ${motivo}`
            ].join('\n'))
            .setTimestamp();

          canalLogs.send({ embeds: [embed] }).catch(() => null);
        }

        return await interaction.reply({ content: `✅ Ausência registrada para **${diasNum} dia(s)** com sucesso!`, ephemeral: true });
      }
    }
  } catch (err) {
    console.error('⚠️ [INTERACTION] Erro ao processar interação:', err.message);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      interaction.reply({ content: '❌ Ocorreu um erro ao processar esta ação. Verifique as permissões do bot.', ephemeral: true }).catch(() => null);
    }
  }
});

// ============================================================================
// 🌐 [11] SERVIDOR WEB UPTIME (24/7 Health Check)
// ============================================================================
const server = http.createServer((req, res) => {
  if (req.url === '/status' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'online',
      bot: client.user ? client.user.tag : 'Iniciando...',
      servidor: 'LS Customs',
      uptime: process.uptime(),
      ausenciasAtivas: Object.values(db.data.ausencias).filter(a => a.status === 'ATIVA').length,
      mecanicosEmServico: Object.values(db.data.pontos).filter(p => p.status === 'EM_SERVICO').length
    }));
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h1>🔧 Bot Oficial LS Customs Online!</h1><p>Status: Operacional • Discord.js v14</p>');
});

server.listen(CONFIG.port, '0.0.0.0', () => {
  console.log(`🌐 [HTTP] Servidor Uptime ativo na porta ${CONFIG.port}`);
});

// Iniciar Cliente Discord
client.login(CONFIG.token).catch(err => {
  console.error('❌ ERRO CRÍTICO AO LOGAR O BOT NO DISCORD:', err.message);
  console.error('👉 Verifique se você colocou o DISCORD_TOKEN correto no arquivo .env!');
});
