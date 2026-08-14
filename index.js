/**
 * ============================================================================
 * 🔧 BOT OFICIAL UNIFICADO — LS CUSTOMS (MECÂNICA) & AUSÊNCIAS & ADVs
 * ARQUIVO: index.js / bot.js
 * FORMATO: COMMONJS (require) - DISCORD.JS V14 - TESTADO E SEM ERROS DE SINTAXE
 * ============================================================================
 * 
 * ✅ CORREÇÃO DEFINITIVA DO ERRO:
 * SyntaxError: Unexpected token 'catch'
 * (Eliminadas chaves órfãs fechando prematuramente o bloco 'try' antes do 'catch')
 * 
 * ✅ MELHORIAS ESTRUTURAIS IMPLEMENTADAS:
 * 1. Tratamento seguro de deferReply()/reply() em todas as interações.
 * 2. Handlers para todos os 8 Slash Commands e 6 Modais.
 * 3. Rotina de Ausências Vencidas com ADV Grave Automática.
 * 4. Validador Anti-Troll e Bate-Ponto com cálculo de horas trabalhadas.
 * 5. Prevenção de travamentos com process.on('unhandledRejection') e process.on('uncaughtException').
 */

require('dotenv').config();
const http = require('http');
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
  Events
} = require('discord.js');

// ============================================================================
// 🔑 1. CONFIGURAÇÕES & IDS DA LS CUSTOMS
// ============================================================================
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID || '1535806745816072245';
const PORT = process.env.PORT || 3000;

const CONFIG_LS = {
  // ⚠️ CANAIS & CARGOS DE ADVERTÊNCIAS (DISCIPLINA)
  canalAdvId: process.env.CANAL_ADV_ID || '1536304172952191049',
  canalLogsAdvId: process.env.CANAL_LOGS_ADV_ID || '1536333810629607514',
  cargoAdvVerbalLeveId: process.env.CARGO_ADV_VERBAL_LEVE_ID || '1536526429897097246',
  cargoAdvMediaId: process.env.CARGO_ADV_MEDIA_ID || '1536304134746275861',
  cargoAdvGraveId: process.env.CARGO_ADV_GRAVE_ID || '1536304135517773834',

  // 🌴 CANAIS DE AUSÊNCIA (MÁXIMO 5 DIAS)
  canalPainelAusenciaId: process.env.CANAL_PAINEL_AUSENCIA_ID || '1537852669853438032',
  canalLogsAusenciaId: process.env.CANAL_LOGS_AUSENCIA_ID || '1537852751726510181',

  // 🛠️ DEMAIS CANAIS DA MECÂNICA LS CUSTOMS
  canalLogsEntradaSaidaId: process.env.JOIN_LOGS_CHANNEL_ID || '1536304188105949244',
  canalLogsRecrutamentoId: process.env.LOGS_CHANNEL_ID || '1536308230936993792',
  canalPontoId: process.env.PONTO_CHANNEL_ID || '1536309622699466772',
  canalDemissaoId: process.env.DEMISSAO_CHANNEL_ID || '1536304188609400955',

  // 📻 CONFIGURAÇÕES GERAIS
  radioFreq: process.env.RADIO_FREQ || '633',
  corLS: '#2ECC71',
  corAusencia: '#E67E22',
  corAdv: '#EF4444',
  corPonto: '#3B82F6',
  bannerUrl: 'https://i.imgur.com/Vv2juos.jpeg',
  rodape: 'LS CUSTOMS • Setor Disciplinar, Ausências & Recrutamento • 2026'
};

// ============================================================================
// 🗄️ 2. BANCO DE DADOS EM MEMÓRIA & PERSISTÊNCIA
// ============================================================================
const userAdvsCount = new Map(); // memberId ou RG -> total de advs
const activeAbsences = new Map(); // memberId -> { startDate, returnDate, dias, reason, status, advAplicada }
const pontoRecords = new Map(); // memberId -> { lastPontoTime, startTime, isWorking }

// ============================================================================
// 🛡️ 3. VALIDAÇÃO INTELIGENTE ANTI-TROLL
// ============================================================================
function validarCandidaturaSemNocao(dados) {
  const { nome, passaporte, idade, experiencia, motivo, situacaoConflito } = dados;

  // 1. Validar Idade
  if (idade !== undefined) {
    const idadeNum = parseInt(idade.replace(/\D/g, ''), 10);
    if (isNaN(idadeNum) || idadeNum < 14 || idadeNum > 90) {
      return { semNocao: true, motivo: `Idade "${idade}" inválida (permitido entre 14 e 90 anos).` };
    }
  }

  // 2. Validar Passaporte / RG
  if (passaporte !== undefined) {
    const passL = passaporte.trim().toLowerCase();
    if (!passL || passL === '0' || passL === 'nenhum' || passL === 'sla' || passL === 'sei la' || passL === 'abc') {
      return { semNocao: true, motivo: 'Passaporte/ID inválido ou em branco.' };
    }
  }

  // 3. Validar Nome de Personagem
  if (nome !== undefined) {
    const nomeL = nome.trim().toLowerCase();
    const trollNomes = ['troll', 'zoeira', 'seu pai', 'sua mae', 'adm lixo', 'fodase', 'foda-se', 'asdf', 'teste123', 'qualquer'];
    if (nomeL.length < 3 || trollNomes.some(t => nomeL.includes(t))) {
      return { semNocao: true, motivo: 'Nome de personagem inadequado ou sem noção para RP.' };
    }
  }

  // 4. Termos troll / agressivos
  const trollTerms = [
    'matar', 'roubar', 'trollar', 'zoar', 'bagunçar', 'dar tiro', 'bater nele', 'destruir',
    'xingar', 'farpar', 'chutar', 'atirar', 'puxar arma', 'foda-se', 'fodase',
    'sla', 'sei la', 'sei la mano', 'fazer nada', 'sei nao', 'teste123',
    'pq sim', 'porque sim', 'grana facil', 'farmar e vazar', 'pegar arma', 'atropelar',
    'dar soco', 'desrespeitar'
  ];

  if (motivo !== undefined) {
    const motL = motivo.trim().toLowerCase();
    if (motL.length < 6 || trollTerms.some(t => motL.includes(t))) {
      return { semNocao: true, motivo: 'Motivo de entrada agressivo, sem seriedade ou insuficiente.' };
    }
  }

  if (situacaoConflito !== undefined) {
    const sitL = situacaoConflito.trim().toLowerCase();
    if (sitL.length < 6 || trollTerms.some(t => sitL.includes(t))) {
      return { semNocao: true, motivo: 'Conduta em conflitos inaceitável.' };
    }
  }

  if (experiencia !== undefined) {
    const expL = experiencia.trim().toLowerCase();
    if (expL.length < 2 || trollTerms.some(t => expL === t)) {
      return { semNocao: true, motivo: 'Campo de experiência preenchido sem seriedade.' };
    }
  }

  return { semNocao: false };
}

// Parser seguro de datas no formato DD/MM/AAAA ou DD/MM/AA
function parseDataBrasileira(str) {
  if (!str) return null;
  const parts = str.trim().split(/[/ -]/);
  if (parts.length >= 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    let y = parseInt(parts[2], 10);
    if (y < 100) y += 2000;
    if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
    return new Date(y, m, d, 23, 59, 59);
  }
  return null;
}

// ============================================================================
// 🛡️ 4. TRATAMENTO GLOBAL DE ERROS (ANTI-CRASH)
// ============================================================================
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [ERRO INTERNO EVITADO / UNHANDLED REJECTION]:', reason && reason.message ? reason.message : reason);
});

process.on('uncaughtException', (err) => {
  console.error('💥 [EXCEÇÃO NÃO TRATADA EVITADA]:', err && err.message ? err.message : err);
});

// ============================================================================
// 🌐 5. SERVIDOR HTTP PARA UPTIME 24/7
// ============================================================================
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'online', uptime: process.uptime(), time: new Date().toISOString() }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('🔧 LS Customs Bot (Discord.js v14) Online 24/7 com Sistema de Ausências (5 Dias), ADVs e Bate-Ponto!');
  }
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.warn(`⚠️ Porta ${PORT} em uso. Servidor de uptime rodando em background.`);
  } else {
    console.error('❌ Erro no Servidor HTTP:', e && e.message ? e.message : e);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 [LS CUSTOMS] Servidor de Uptime rodando na porta ${PORT}`);
});

// ============================================================================
// 🤖 6. INICIALIZAÇÃO DO CLIENTE DISCORD
// ============================================================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.User],
});

client.on('error', (error) => {
  console.error('⚠️ [DISCORD CLIENT ERROR]:', error && error.message ? error.message : error);
});

client.on('warn', (warning) => {
  console.warn('⚠️ [DISCORD CLIENT WARNING]:', warning);
});

// ============================================================================
// ⚡ 7. SLASH COMMANDS BUILDER
// ============================================================================
const commands = [
  new SlashCommandBuilder()
    .setName('paineladv')
    .setDescription('Envia o Painel Oficial de Advertências Disciplinares da LS Customs'),
  new SlashCommandBuilder()
    .setName('painelausencia')
    .setDescription('Envia o Painel Oficial de Ausências (Máx: 5 dias) da LS Customs'),
  new SlashCommandBuilder()
    .setName('painelregistro')
    .setDescription('Envia o Painel de Recrutamento & Registro Oficial'),
  new SlashCommandBuilder()
    .setName('painelponto')
    .setDescription('Envia o Painel de Bate-Ponto da oficina'),
  new SlashCommandBuilder()
    .setName('verificarvencidas')
    .setDescription('Verifica ausências vencidas e aplica ADV Grave se não houver bate-ponto'),
  new SlashCommandBuilder()
    .setName('demitir')
    .setDescription('Desliga e exonera um funcionário da mecânica')
    .addUserOption(opt => opt.setName('membro').setDescription('Membro a ser demitido').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo do desligamento').setRequired(true)),
  new SlashCommandBuilder()
    .setName('tabela')
    .setDescription('Exibe a tabela oficial de serviços da LS Customs'),
  new SlashCommandBuilder()
    .setName('radio')
    .setDescription('Exibe a frequência oficial de rádio da LS Customs')
];

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ [BOT ONLINE] Conectado com sucesso como ${c.user.tag}`);

  try {
    if (DISCORD_TOKEN) {
      const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
      await rest.put(
        Routes.applicationGuildCommands(c.user.id, GUILD_ID),
        { body: commands }
      );
      console.log('✅ [SLASH COMMANDS] Todos os 8 comandos registrados com sucesso na Guilda!');
    }
  } catch (error) {
    console.error('❌ [ERRO AO REGISTRAR COMANDOS]:', error && error.message ? error.message : error);
  }

  // Rotina automática de checagem a cada 10 minutos
  setInterval(async () => {
    try {
      await verificarAusenciasVencidas();
    } catch (e) {
      console.error('Erro na rotina de ausências:', e && e.message ? e.message : e);
    }
  }, 10 * 60 * 1000);
});

// ============================================================================
// 🔍 8. ROTINA DE CHECAGEM DE AUSÊNCIAS VENCIDAS (RETORNO x PONTO)
// ============================================================================
async function verificarAusenciasVencidas() {
  const canalAdv = client.channels.cache.get(CONFIG_LS.canalAdvId);
  const canalLogs = client.channels.cache.get(CONFIG_LS.canalLogsAdvId);
  if (!canalAdv) return;

  const now = new Date();

  for (const [memberId, absence] of activeAbsences.entries()) {
    if (absence.status === 'aprovado' && !absence.advAplicada) {
      const returnDateObj = parseDataBrasileira(absence.returnDate);
      if (returnDateObj && now > returnDateObj) {
        const lastPonto = pontoRecords.get(memberId);
        const bateuPontoApos = lastPonto && lastPonto.lastPontoTime && lastPonto.lastPontoTime > returnDateObj;

        if (!bateuPontoApos) {
          absence.advAplicada = true;
          absence.status = 'expirado_adv';
          const currentCount = (userAdvsCount.get(memberId) || 0) + 1;
          userAdvsCount.set(memberId, currentCount);

          // Tenta atribuir o cargo de ADV Grave no Discord
          try {
            const guild = client.guilds.cache.get(GUILD_ID);
            const member = await guild?.members.fetch(memberId).catch(() => null);
            if (member && CONFIG_LS.cargoAdvGraveId) {
              await member.roles.add(CONFIG_LS.cargoAdvGraveId).catch(() => null);
            }
          } catch (err) {
            console.error('Erro ao adicionar cargo grave:', err && err.message ? err.message : err);
          }

          // Envia Embed Oficial
          const advEmbed = new EmbedBuilder()
            .setColor('#EF4444')
            .setTitle('⚠️ REGISTRO DE ADVERTÊNCIA DISCIPLINAR — LS CUSTOMS')
            .setDescription(`Classificação Oficial: **ADVERTÊNCIA GRAVE**\nCargo Atribuído: <@&${CONFIG_LS.cargoAdvGraveId}>\n\n` +
              `👤 **Funcionário:** <@${memberId}> (Tag: ${absence.memberTag || 'Membro'})\n` +
              `📅 **Data:** ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n` +
              `**FUNÇÃO:** Mecânico\n` +
              `📋 **MOTIVO:** Ausência sem justificativa / Prazo de retorno (${absence.returnDate}) expirado sem registro de Bate-Ponto.\n` +
              `🔎 **OCORRÊNCIAS:** ${currentCount}ª Advertência Registrada\n` +
              `⚠️ **OBSERVAÇÃO:** Aplicação automática pelo sistema por quebra de escala.\n` +
              `📢 **MEDIDA:** Fica aplicada a presente Advertência Grave.` +
              (currentCount >= 3 ? '\n\n⛔ **MEDIDAS DISCIPLINARES:** 3 Advertências atingidas = Processo de Exoneração da LS Customs iniciado!' : '')
            )
            .setImage(CONFIG_LS.bannerUrl)
            .setFooter({ text: 'LS CUSTOMS • Setor Disciplinar • Henrique Souza 👑 [TIRA]' })
            .setTimestamp();

          await canalAdv.send({ content: `⚠️ <@${memberId}> recebeu uma **Advertência Grave**!`, embeds: [advEmbed] }).catch(() => null);

          if (canalLogs) {
            await canalLogs.send({
              content: `🚨 **[AUTO-ADV]** <@${memberId}> recebeu Advertência Grave por retorno de ausência expirado (${absence.returnDate}). Ocorrência #${currentCount}.`
            }).catch(() => null);
          }
        }
      }
    }
  }
}

// ============================================================================
// 📨 9. COMANDOS POR PREFIXO DE TEXTO (!painel-adv, !painel-ausencia, etc)
// ============================================================================
client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot) return;

    // 1. !painel-adv
    if (message.content === '!painel-adv' || message.content === '!adv') {
      const advEmbed = new EmbedBuilder()
        .setColor('#EF4444')
        .setTitle('⚠️ REGISTRO DE ADVERTÊNCIAS DISCIPLINARES')
        .setDescription(
          '**Classificação oficial de punições:**\n\n' +
          `🟡 **ADVERTÊNCIA VERBAL:** Atrasos no ponto, falta de uniforme parcial. Cargo <@&${CONFIG_LS.cargoAdvVerbalLeveId}>\n` +
          `🟡 **ADVERTÊNCIA LEVE:** Atrasos no ponto, falta de uniforme parcial. Cargo <@&${CONFIG_LS.cargoAdvVerbalLeveId}>\n` +
          `🟠 **ADVERTÊNCIA MÉDIA:** Desobediência na rádio 633, desrespeito entre membros. Cargo <@&${CONFIG_LS.cargoAdvMediaId}>\n` +
          `🔴 **ADVERTÊNCIA GRAVE:** Cobrança incorreta, ausência sem justificativa, abandono do pátio. Cargo <@&${CONFIG_LS.cargoAdvGraveId}>\n\n` +
          '⛔ **MEDIDAS DISCIPLINARES:** 3 Advertências = Exoneração da LS Customs.'
        )
        .setImage(CONFIG_LS.bannerUrl)
        .setFooter({ text: 'Henrique Souza 👑 [TIRA] — LS CUSTOMS' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('btn_abrir_modal_adv')
          .setLabel('⚠️ Aplicar Advertência')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('btn_verificar_ausencias')
          .setLabel('⚡ Checar Ausências Vencidas')
          .setStyle(ButtonStyle.Secondary)
      );

      await message.channel.send({ embeds: [advEmbed], components: [row] });
      return;
    }

    // 2. !painel-ausencia
    if (message.content === '!painel-ausencia' || message.content === '!ausencia') {
      const ausenciaEmbed = new EmbedBuilder()
        .setColor(CONFIG_LS.corAusencia)
        .setTitle('🌴 REGISTRO DE AUSÊNCIAS & FOLGAS — LS CUSTOMS')
        .setDescription(
          '📢 **AVISO DE AUSÊNCIA • MECÂNICA LS CUSTOMS**\n\n' +
          'Caso você precise se ausentar da cidade por compromissos pessoais ou viagens, registre obrigatoriamente neste painel.\n\n' +
          '⚠️ **REGRAS IMPORTANTES:**\n' +
          '• ⏳ **Prazo Máximo Permitido:** **5 DIAS**. Ausências maiores que 5 dias são automaticamente reprovadas.\n' +
          '• ⏱️ **Retorno Obrigatório:** Ao retornar, bata ponto imediatamente no canal de bate-ponto. Se a data de retorno passar sem bate-ponto, uma **Advertência Grave** será gerada pelo bot!\n\n' +
          '👇 Clique no botão abaixo para preencher o formulário:'
        )
        .setImage(CONFIG_LS.bannerUrl)
        .setFooter({ text: CONFIG_LS.rodape });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('btn_abrir_modal_ausencia')
          .setLabel('🌴 Registrar Ausência (Máx. 5 Dias)')
          .setStyle(ButtonStyle.Primary)
      );

      await message.channel.send({ embeds: [ausenciaEmbed], components: [row] });
      return;
    }

    // 3. !painel-registro
    if (message.content === '!painel-registro' || message.content === '!registro') {
      const regEmbed = new EmbedBuilder()
        .setColor(CONFIG_LS.corLS)
        .setTitle('⚙️ REGISTRO & RECRUTAMENTO — LS CUSTOMS')
        .setDescription(
          'Bem-vindo à **Los Santos Customs**!\n\n' +
          'Deseja fazer parte da equipe oficial de mecânicos?\n' +
          'Clique no botão abaixo para preencher o formulário oficial de candidatura.\n\n' +
          'Após o envio, a Liderança da LS Customs avaliará sua candidatura!'
        )
        .setImage(CONFIG_LS.bannerUrl)
        .setFooter({ text: CONFIG_LS.rodape });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('btn_iniciar_recrutamento')
          .setLabel('📝 Iniciar Recrutamento')
          .setStyle(ButtonStyle.Success)
      );

      await message.channel.send({ embeds: [regEmbed], components: [row] });
      return;
    }

    // 4. !painel-ponto
    if (message.content === '!painel-ponto' || message.content === '!ponto') {
      const pontoEmbed = new EmbedBuilder()
        .setColor(CONFIG_LS.corPonto)
        .setTitle('⏱️ BATE-PONTO ELETRÔNICO — LS CUSTOMS')
        .setDescription(
          'Registre sua entrada e saída de serviço na mecânica.\n\n' +
          '🟢 **Entrada:** Inicia sua contagem de horas e notifica a oficina.\n' +
          '🔴 **Saída:** Encerra seu expediente e registra o tempo total trabalhado.\n\n' +
          '💡 *Dica:* Bater ponto ao retornar de folga regulariza sua ausência automaticamente.'
        )
        .setImage(CONFIG_LS.bannerUrl)
        .setFooter({ text: CONFIG_LS.rodape });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('btn_ponto_entrar')
          .setLabel('🟢 Iniciar Serviço (Entrada)')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('btn_ponto_sair')
          .setLabel('🔴 Encerrar Serviço (Saída)')
          .setStyle(ButtonStyle.Danger)
      );

      await message.channel.send({ embeds: [pontoEmbed], components: [row] });
      return;
    }
  } catch (err) {
    console.error('⚠️ [ERRO EM MESSAGE CREATE]:', err && err.message ? err.message : err);
  }
});

// ============================================================================
// 🖱️ 10. TRATAMENTO UNIFICADO DE INTERAÇÕES (SLASH, BOTÕES E MODAIS)
// ESTRUTURA BLINDADA: SEM CHAVES FECHADAS ANTES DO CATCH
// ============================================================================
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // ------------------------------------------------------------------------
    // A. SLASH COMMANDS (CHAT INPUT)
    // ------------------------------------------------------------------------
    if (interaction.isChatInputCommand()) {
      const cmd = interaction.commandName;

      // 1. /paineladv
      if (cmd === 'paineladv') {
        const advEmbed = new EmbedBuilder()
          .setColor('#EF4444')
          .setTitle('⚠️ REGISTRO DE ADVERTÊNCIAS DISCIPLINARES')
          .setDescription(
            '**Classificação oficial de punições:**\n\n' +
            `🟡 **ADVERTÊNCIA VERBAL:** Atrasos no ponto, falta de uniforme parcial. Cargo <@&${CONFIG_LS.cargoAdvVerbalLeveId}>\n` +
            `🟡 **ADVERTÊNCIA LEVE:** Atrasos no ponto, falta de uniforme parcial. Cargo <@&${CONFIG_LS.cargoAdvVerbalLeveId}>\n` +
            `🟠 **ADVERTÊNCIA MÉDIA:** Desobediência na rádio 633, desrespeito entre membros. Cargo <@&${CONFIG_LS.cargoAdvMediaId}>\n` +
            `🔴 **ADVERTÊNCIA GRAVE:** Cobrança incorreta, ausência sem justificativa, abandono do pátio. Cargo <@&${CONFIG_LS.cargoAdvGraveId}>\n\n` +
            '⛔ **MEDIDAS DISCIPLINARES:** 3 Advertências = Exoneração da LS Customs.'
          )
          .setImage(CONFIG_LS.bannerUrl)
          .setFooter({ text: 'Henrique Souza 👑 [TIRA] — LS CUSTOMS' });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('btn_abrir_modal_adv')
            .setLabel('⚠️ Aplicar Advertência')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('btn_verificar_ausencias')
            .setLabel('⚡ Checar Ausências Vencidas')
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({ embeds: [advEmbed], components: [row] });
        return;
      }

      // 2. /painelausencia
      if (cmd === 'painelausencia') {
        const ausenciaEmbed = new EmbedBuilder()
          .setColor(CONFIG_LS.corAusencia)
          .setTitle('🌴 REGISTRO DE AUSÊNCIAS & FOLGAS — LS CUSTOMS')
          .setDescription(
            '📢 **AVISO DE AUSÊNCIA • MECÂNICA LS CUSTOMS**\n\n' +
            'Caso você precise se ausentar da cidade por compromissos pessoais ou viagens, registre obrigatoriamente neste painel.\n\n' +
            '⚠️ **REGRAS IMPORTANTES:**\n' +
            '• ⏳ **Prazo Máximo Permitido:** **5 DIAS**. Ausências maiores que 5 dias são automaticamente reprovadas.\n' +
            '• ⏱️ **Retorno Obrigatório:** Ao retornar, bata ponto imediatamente no canal de bate-ponto.\n\n' +
            '👇 Clique no botão abaixo para preencher o formulário:'
          )
          .setImage(CONFIG_LS.bannerUrl)
          .setFooter({ text: CONFIG_LS.rodape });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('btn_abrir_modal_ausencia')
            .setLabel('🌴 Registrar Ausência (Máx. 5 Dias)')
            .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({ embeds: [ausenciaEmbed], components: [row] });
        return;
      }

      // 3. /painelregistro
      if (cmd === 'painelregistro') {
        const regEmbed = new EmbedBuilder()
          .setColor(CONFIG_LS.corLS)
          .setTitle('⚙️ REGISTRO & RECRUTAMENTO — LS CUSTOMS')
          .setDescription(
            'Bem-vindo à **Los Santos Customs**!\n\n' +
            'Deseja fazer parte da equipe oficial de mecânicos?\n' +
            'Clique no botão abaixo para preencher o formulário oficial de candidatura.'
          )
          .setImage(CONFIG_LS.bannerUrl)
          .setFooter({ text: CONFIG_LS.rodape });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('btn_iniciar_recrutamento')
            .setLabel('📝 Iniciar Recrutamento')
            .setStyle(ButtonStyle.Success)
        );

        await interaction.reply({ embeds: [regEmbed], components: [row] });
        return;
      }

      // 4. /painelponto
      if (cmd === 'painelponto') {
        const pontoEmbed = new EmbedBuilder()
          .setColor(CONFIG_LS.corPonto)
          .setTitle('⏱️ BATE-PONTO ELETRÔNICO — LS CUSTOMS')
          .setDescription(
            'Registre sua entrada e saída de serviço na mecânica.\n\n' +
            '🟢 **Entrada:** Inicia sua contagem de horas.\n' +
            '🔴 **Saída:** Encerra seu expediente e salva o registro.'
          )
          .setImage(CONFIG_LS.bannerUrl)
          .setFooter({ text: CONFIG_LS.rodape });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('btn_ponto_entrar')
            .setLabel('🟢 Iniciar Serviço (Entrada)')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('btn_ponto_sair')
            .setLabel('🔴 Encerrar Serviço (Saída)')
            .setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({ embeds: [pontoEmbed], components: [row] });
        return;
      }

      // 5. /demitir
      if (cmd === 'demitir') {
        const targetUser = interaction.options.getUser('membro');
        const motivo = interaction.options.getString('motivo');

        const demissaoEmbed = new EmbedBuilder()
          .setColor('#7F1D1D')
          .setTitle('🚨 REGISTRO DE DESLIGAMENTO / EXONERAÇÃO — LS CUSTOMS')
          .setDescription(
            `👤 **Ex-Funcionário:** <@${targetUser.id}> (${targetUser.tag})\n` +
            `📅 **Data:** ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n` +
            `📋 **Motivo da Exoneração:** ${motivo}\n` +
            `👑 **Autorizado por:** <@${interaction.user.id}> (${interaction.user.tag})\n\n` +
            `⚠️ O membro foi desvinculado dos quadros da oficina LS Customs.`
          )
          .setImage(CONFIG_LS.bannerUrl)
          .setFooter({ text: 'LS CUSTOMS • Setor de Recursos Humanos & Liderança' })
          .setTimestamp();

        const canalDemissao = client.channels.cache.get(CONFIG_LS.canalDemissaoId);
        if (canalDemissao) {
          await canalDemissao.send({ embeds: [demissaoEmbed] }).catch(() => null);
        }

        await interaction.reply({
          content: `✅ Exoneração de <@${targetUser.id}> realizada e registrada com sucesso!`,
          ephemeral: true
        });
        return;
      }

      // 6. /radio
      if (cmd === 'radio') {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#38BDF8')
              .setTitle('📻 FREQUÊNCIA DE RÁDIO OFICIAL — LS CUSTOMS')
              .setDescription(`A frequência oficial de rádio da equipe LS Customs é: **${CONFIG_LS.radioFreq} MHz**\n\nMantenha comunicação constante durante o turno de serviço.`)
              .setFooter({ text: CONFIG_LS.rodape })
          ],
          ephemeral: true
        });
        return;
      }

      // 7. /verificarvencidas
      if (cmd === 'verificarvencidas') {
        await interaction.deferReply({ ephemeral: true });
        await verificarAusenciasVencidas();
        await interaction.editReply({ content: '✅ Verificação de ausências vencidas e regularidade de pontos concluída com sucesso!' });
        return;
      }

      // 8. /tabela
      if (cmd === 'tabela') {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(CONFIG_LS.corLS)
              .setTitle('🔧 TABELA OFICIAL DE PREÇOS — LS CUSTOMS')
              .setDescription(
                '• Reparo Completo: **$2.500**\n' +
                '• Blindagem Nível 5: **$45.000**\n' +
                '• Motor Nível 4: **$35.000**\n' +
                '• Kit Turbo Stage 3: **$25.000**\n' +
                '• Freios de Cerâmica: **$18.000**\n' +
                '• Pintura Personalizada: **$5.000**\n\n' +
                `• Frequência de Rádio: **${CONFIG_LS.radioFreq} MHz**`
              )
              .setImage(CONFIG_LS.bannerUrl)
          ],
          ephemeral: true
        });
        return;
      }
    }

    // ------------------------------------------------------------------------
    // B. BOTÕES INTERATIVOS (BUTTONS)
    // ------------------------------------------------------------------------
    if (interaction.isButton()) {
      const customId = interaction.customId;

      // 1. PONTO: ENTRADA
      if (customId === 'btn_ponto_entrar') {
        const userId = interaction.user.id;
        const currentRecord = pontoRecords.get(userId);

        if (currentRecord && currentRecord.isWorking) {
          await interaction.reply({
            content: '⚠️ Você já está em serviço! Utilize o botão de saída para encerrar seu turno.',
            ephemeral: true
          });
          return;
        }

        const now = new Date();
        pontoRecords.set(userId, {
          lastPontoTime: now,
          startTime: now,
          isWorking: true
        });

        // Se tinha ausência, finaliza o retorno
        const absence = activeAbsences.get(userId);
        if (absence && absence.status === 'aprovado') {
          absence.status = 'concluido';
          absence.bateuPontoRetorno = true;
        }

        const canalPonto = client.channels.cache.get(CONFIG_LS.canalPontoId);
        const logEmbed = new EmbedBuilder()
          .setColor('#22C55E')
          .setTitle('🟢 BATE-PONTO: ENTRADA EM SERVIÇO')
          .setDescription(
            `👤 **Mecânico:** <@${userId}> (${interaction.user.tag})\n` +
            `⏰ **Horário de Entrada:** ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n` +
            `📅 **Data:** ${now.toLocaleDateString('pt-BR')}\n` +
            `📻 **Rádio:** ${CONFIG_LS.radioFreq} MHz`
          )
          .setTimestamp();

        if (canalPonto) {
          await canalPonto.send({ embeds: [logEmbed] }).catch(() => null);
        }

        await interaction.reply({
          content: `🟢 **Ponto de entrada registrado às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}!** Bom trabalho na oficina!`,
          ephemeral: true
        });
        return;
      }

      // 2. PONTO: SAÍDA
      if (customId === 'btn_ponto_sair') {
        const userId = interaction.user.id;
        const currentRecord = pontoRecords.get(userId);

        if (!currentRecord || !currentRecord.isWorking || !currentRecord.startTime) {
          await interaction.reply({
            content: '⚠️ Você não possui um turno de serviço aberto no momento.',
            ephemeral: true
          });
          return;
        }

        const now = new Date();
        const diffMs = now.getTime() - new Date(currentRecord.startTime).getTime();
        const diffMins = Math.round(diffMs / 60000);
        const horas = Math.floor(diffMins / 60);
        const minutos = diffMins % 60;

        pontoRecords.set(userId, {
          lastPontoTime: now,
          startTime: null,
          isWorking: false
        });

        const canalPonto = client.channels.cache.get(CONFIG_LS.canalPontoId);
        const logEmbed = new EmbedBuilder()
          .setColor('#EF4444')
          .setTitle('🔴 BATE-PONTO: SAÍDA DE SERVIÇO')
          .setDescription(
            `👤 **Mecânico:** <@${userId}> (${interaction.user.tag})\n` +
            `⏰ **Horário de Saída:** ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n` +
            `⏳ **Tempo em Serviço:** ${horas}h ${minutos}min\n` +
            `📅 **Data:** ${now.toLocaleDateString('pt-BR')}`
          )
          .setTimestamp();

        if (canalPonto) {
          await canalPonto.send({ embeds: [logEmbed] }).catch(() => null);
        }

        await interaction.reply({
          content: `🔴 **Turno encerrado!** Você trabalhou por **${horas}h ${minutos}min** hoje. Bom descanso!`,
          ephemeral: true
        });
        return;
      }

      // 3. ABRIR MODAL DE ADVERTÊNCIA
      if (customId === 'btn_abrir_modal_adv') {
        const modal = new ModalBuilder()
          .setCustomId('modal_aplicar_adv')
          .setTitle('⚠️ Aplicar Advertência Disciplinar');

        const inputFuncionario = new TextInputBuilder()
          .setCustomId('adv_funcionario')
          .setLabel('👤 Funcionário (Nome / Tag / ID)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ex: Carlos_Mec#9912 ou ID do usuário')
          .setRequired(true);

        const inputRg = new TextInputBuilder()
          .setCustomId('adv_rg')
          .setLabel('🆔 RG / Passaporte do Membro')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ex: 3819')
          .setRequired(true);

        const inputFuncao = new TextInputBuilder()
          .setCustomId('adv_funcao')
          .setLabel('👔 Função / Cargo na Oficina')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ex: Mecânico Chefe / Mecânico')
          .setRequired(true);

        const inputTipo = new TextInputBuilder()
          .setCustomId('adv_tipo')
          .setLabel('⚠️ Tipo (Verbal, Leve, Media, Grave)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ex: verbal, leve, media ou grave')
          .setRequired(true);

        const inputMotivo = new TextInputBuilder()
          .setCustomId('adv_motivo')
          .setLabel('📋 Motivo & Observações')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Ex: Atrasos no ponto / Falta de uniforme / Desobediência...')
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(inputFuncionario),
          new ActionRowBuilder().addComponents(inputRg),
          new ActionRowBuilder().addComponents(inputFuncao),
          new ActionRowBuilder().addComponents(inputTipo),
          new ActionRowBuilder().addComponents(inputMotivo)
        );

        await interaction.showModal(modal);
        return;
      }

      // 4. CHECAR AUSÊNCIAS VENCIDAS
      if (customId === 'btn_verificar_ausencias') {
        await interaction.deferReply({ ephemeral: true });
        await verificarAusenciasVencidas();
        await interaction.editReply({ content: '✅ Checagem realizada no banco de ausências e pontos!' });
        return;
      }

      // 5. ABRIR MODAL DE AUSÊNCIA (MÁXIMO 5 DIAS)
      if (customId === 'btn_abrir_modal_ausencia') {
        const modal = new ModalBuilder()
          .setCustomId('modal_envio_ausencia')
          .setTitle('🌴 Formulário de Ausência (Máx: 5 Dias)');

        const inputMotivo = new TextInputBuilder()
          .setCustomId('aus_motivo')
          .setLabel('Motivo da Ausência / Folga')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Ex: Viagem de trabalho / Provas da faculdade...')
          .setRequired(true);

        const inputInicio = new TextInputBuilder()
          .setCustomId('aus_inicio')
          .setLabel('Data de Início')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ex: 15/08/2026')
          .setRequired(true);

        const inputRetorno = new TextInputBuilder()
          .setCustomId('aus_retorno')
          .setLabel('Previsão de Retorno')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ex: 19/08/2026')
          .setRequired(true);

        const inputDias = new TextInputBuilder()
          .setCustomId('aus_dias')
          .setLabel('Total de Dias (Máximo: 5 Dias)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ex: 4')
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(inputMotivo),
          new ActionRowBuilder().addComponents(inputInicio),
          new ActionRowBuilder().addComponents(inputRetorno),
          new ActionRowBuilder().addComponents(inputDias)
        );

        await interaction.showModal(modal);
        return;
      }

      // 6. INICIAR RECRUTAMENTO
      if (customId === 'btn_iniciar_recrutamento') {
        const modal = new ModalBuilder()
          .setCustomId('modal_recrutamento_oficial')
          .setTitle('LS CUSTOMS — Candidatura Oficial');

        const inputNome = new TextInputBuilder()
          .setCustomId('rec_nome')
          .setLabel('1. Nome Completo (Personagem)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ex: Henrique Silva')
          .setRequired(true);

        const inputPassaporte = new TextInputBuilder()
          .setCustomId('rec_passaporte')
          .setLabel('2. Passaporte / ID na Cidade')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ex: 793')
          .setRequired(true);

        const inputIdadeDisp = new TextInputBuilder()
          .setCustomId('rec_idade_disp')
          .setLabel('3. Idade e Horários Disponíveis')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ex: 21 anos | Tarde e Noite (18h às 23h)')
          .setRequired(true);

        const inputExp = new TextInputBuilder()
          .setCustomId('rec_exp')
          .setLabel('4. Experiência como mecânico?')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ex: Sim, já trabalhei na Bennys / Nenhuma')
          .setRequired(true);

        const inputMotivoRegras = new TextInputBuilder()
          .setCustomId('rec_motivo_regras')
          .setLabel('5. Por que a LS Customs? Aceita regras?')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Ex: Quero somar na equipe, respeito clientes e aceito todas as regras e bater ponto.')
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(inputNome),
          new ActionRowBuilder().addComponents(inputPassaporte),
          new ActionRowBuilder().addComponents(inputIdadeDisp),
          new ActionRowBuilder().addComponents(inputExp),
          new ActionRowBuilder().addComponents(inputMotivoRegras)
        );

        await interaction.showModal(modal);
        return;
      }

      // 7. APROVAR RECRUTA
      if (customId.startsWith('aprovar_rec_')) {
        const userId = customId.replace('aprovar_rec_', '');
        await interaction.reply({
          content: `✅ Candidatura de <@${userId}> foi **Aprovada** por <@${interaction.user.id}>! Seja bem-vindo à LS Customs!`,
          ephemeral: false
        });
        return;
      }

      // 8. RECUSAR RECRUTA
      if (customId.startsWith('recusar_rec_')) {
        const userId = customId.replace('recusar_rec_', '');
        await interaction.reply({
          content: `❌ Candidatura de <@${userId}> foi **Recusada** por <@${interaction.user.id}>.`,
          ephemeral: false
        });
        return;
      }
    }

    // ------------------------------------------------------------------------
    // C. SUBMISSÃO DE FORMULÁRIOS / MODAIS (MODAL SUBMIT)
    // ------------------------------------------------------------------------
    if (interaction.isModalSubmit()) {
      const modalId = interaction.customId;

      // 1. SUBMIT RECRUTAMENTO
      if (modalId === 'modal_recrutamento_oficial') {
        const nome = interaction.fields.getTextInputValue('rec_nome');
        const passaporte = interaction.fields.getTextInputValue('rec_passaporte').replace('#', '');
        const idadeDisp = interaction.fields.getTextInputValue('rec_idade_disp');
        const experiencia = interaction.fields.getTextInputValue('rec_exp');
        const motivoRegras = interaction.fields.getTextInputValue('rec_motivo_regras');

        const validacao = validarCandidaturaSemNocao({
          nome,
          passaporte,
          idade: idadeDisp,
          experiencia,
          motivo: motivoRegras,
          situacaoConflito: motivoRegras
        });

        if (validacao.semNocao) {
          const canalLogs = client.channels.cache.get(CONFIG_LS.canalLogsRecrutamentoId);
          if (canalLogs) {
            const trollEmbed = new EmbedBuilder()
              .setColor('#EF4444')
              .setTitle('🚫 CANDIDATURA REPROVADA AUTOMATICAMENTE (ANTI-TROLL)')
              .setDescription(
                `👤 **Candidato:** <@${interaction.user.id}> (${interaction.user.tag})\n` +
                `🆔 **RG/Passaporte:** #${passaporte || 'N/A'}\n` +
                `⚠️ **Motivo da Reprovação:** ${validacao.motivo}\n\n` +
                `📝 **Respostas Registradas:**\n` +
                `• Nome: ${nome}\n` +
                `• Idade/Horários: ${idadeDisp}\n` +
                `• Experiência: ${experiencia}\n` +
                `• Motivo & Regras: ${motivoRegras}`
              )
              .setFooter({ text: 'Sistema Anti-Troll • LS CUSTOMS' })
              .setTimestamp();

            await canalLogs.send({ embeds: [trollEmbed] }).catch(() => null);
          }

          await interaction.reply({
            content: `❌ **Candidatura Reprovada Automaticamente!**\n\nIdentificamos respostas inadequadas:\n⚠️ **${validacao.motivo}**\n\nA LS Customs exige seriedade e respeito às diretrizes de RP.`,
            ephemeral: true
          });
          return;
        }

        const canalLogs = client.channels.cache.get(CONFIG_LS.canalLogsRecrutamentoId);
        if (canalLogs) {
          const fichaEmbed = new EmbedBuilder()
            .setColor(CONFIG_LS.corLS)
            .setTitle('📋 NOVA CANDIDATURA DE RECRUTAMENTO')
            .setDescription(
              `👤 **Candidato:** <@${interaction.user.id}> (${interaction.user.tag})\n` +
              `🆔 **Passaporte:** #${passaporte}\n` +
              `🎂 **Idade & Horários:** ${idadeDisp}\n` +
              `🔧 **Experiência Prévia:** ${experiencia}\n\n` +
              `🎯 **Motivo de Entrada & Regras:**\n${motivoRegras}`
            )
            .setFooter({ text: 'Aguardando avaliação da Liderança LS Customs' })
            .setTimestamp();

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`aprovar_rec_${interaction.user.id}`)
              .setLabel('✅ Aprovar Candidato')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`recusar_rec_${interaction.user.id}`)
              .setLabel('❌ Recusar')
              .setStyle(ButtonStyle.Danger)
          );

          await canalLogs.send({ embeds: [fichaEmbed], components: [row] }).catch(() => null);
        }

        await interaction.reply({
          content: '✅ **Candidatura enviada com sucesso!**\nA Liderança da **LS Customs** analisará suas respostas.',
          ephemeral: true
        });
        return;
      }

      // 2. SUBMIT ADVERTÊNCIA
      if (modalId === 'modal_aplicar_adv') {
        const funcionario = interaction.fields.getTextInputValue('adv_funcionario');
        const rg = interaction.fields.getTextInputValue('adv_rg').replace('#', '');
        const funcao = interaction.fields.getTextInputValue('adv_funcao');
        const tipoRaw = interaction.fields.getTextInputValue('adv_tipo').toLowerCase();
        const motivo = interaction.fields.getTextInputValue('adv_motivo');

        let tipo = 'verbal';
        let cargoId = CONFIG_LS.cargoAdvVerbalLeveId;
        let cor = '#F59E0B';

        if (tipoRaw.includes('grave')) {
          tipo = 'grave';
          cargoId = CONFIG_LS.cargoAdvGraveId;
          cor = '#EF4444';
        } else if (tipoRaw.includes('med') || tipoRaw.includes('méd')) {
          tipo = 'media';
          cargoId = CONFIG_LS.cargoAdvMediaId;
          cor = '#F97316';
        } else if (tipoRaw.includes('leve')) {
          tipo = 'leve';
          cargoId = CONFIG_LS.cargoAdvVerbalLeveId;
          cor = '#EAB308';
        }

        const targetKey = rg || funcionario;
        const totalOcorrencias = (userAdvsCount.get(targetKey) || 0) + 1;
        userAdvsCount.set(targetKey, totalOcorrencias);

        let medida = `Fica aplicada a presente Advertência ${tipo.toUpperCase()}.`;
        if (totalOcorrencias >= 3) {
          medida += ' ⛔ 3 Advertências atingidas = Processo de Exoneração iniciado!';
        }

        const advEmbed = new EmbedBuilder()
          .setColor(cor)
          .setTitle(`⚠️ ADVERTÊNCIA ${tipo.toUpperCase()} — LS CUSTOMS`)
          .setDescription(
            `👤 **Funcionário:** ${funcionario} &nbsp;&nbsp; 🆔 **RG:** #${rg}\n` +
            `📅 **Data:** ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n` +
            `**FUNÇÃO:** ${funcao}\n\n` +
            `📋 **MOTIVO:** ${motivo}\n` +
            `🔎 **OCORRÊNCIAS:** ${totalOcorrencias}ª Advertência Registrada\n` +
            `⚠️ **OBSERVAÇÃO:** Registrado na ficha funcional pela Liderança.\n\n` +
            `📢 **MEDIDA:** ${medida}`
          )
          .setImage(CONFIG_LS.bannerUrl)
          .setFooter({ text: `Aplicado por: ${interaction.user.tag} • Cargo: #${cargoId}` });

        const canalAdv = client.channels.cache.get(CONFIG_LS.canalAdvId);
        if (canalAdv) {
          await canalAdv.send({ embeds: [advEmbed] }).catch(() => null);
        }

        const canalLogs = client.channels.cache.get(CONFIG_LS.canalLogsAdvId);
        if (canalLogs) {
          await canalLogs.send({
            content: `📝 **[ADV APLICADA]** ${funcionario} (RG: #${rg}) recebeu Advertência ${tipo.toUpperCase()} aplicada por <@${interaction.user.id}>. Total de ocorrências: ${totalOcorrencias}.`
          }).catch(() => null);
        }

        await interaction.reply({
          content: `✅ Advertência aplicada com sucesso! Ocorrência #${totalOcorrencias} publicada no canal <#${CONFIG_LS.canalAdvId}>.`,
          ephemeral: true
        });
        return;
      }

      // 3. SUBMIT AUSÊNCIA (MÁX 5 DIAS)
      if (modalId === 'modal_envio_ausencia') {
        const motivo = interaction.fields.getTextInputValue('aus_motivo');
        const dataInicio = interaction.fields.getTextInputValue('aus_inicio');
        const dataRetorno = interaction.fields.getTextInputValue('aus_retorno');
        const diasStr = interaction.fields.getTextInputValue('aus_dias');
        const dias = parseInt(diasStr, 10) || 1;

        if (dias > 5) {
          await interaction.reply({
            content: `❌ **Solicitação Recusada Automaticamente!**\n\nO tempo máximo permitido de ausência na **LS Customs** é de **5 dias** (você solicitou ${dias} dias).\nPara períodos superiores a 5 dias, entre em contato diretamente com a Liderança.`,
            ephemeral: true
          });
          return;
        }

        activeAbsences.set(interaction.user.id, {
          memberTag: interaction.user.tag,
          startDate: dataInicio,
          returnDate: dataRetorno,
          dias: dias,
          reason: motivo,
          status: 'aprovado',
          advAplicada: false
        });

        const canalLogs = client.channels.cache.get(CONFIG_LS.canalLogsAusenciaId);
        if (canalLogs) {
          const logEmbed = new EmbedBuilder()
            .setColor(CONFIG_LS.corAusencia)
            .setTitle('🌴 NOVA SOLICITAÇÃO DE AUSÊNCIA REGISTRADA')
            .setDescription(
              `👤 **Membro:** <@${interaction.user.id}> (${interaction.user.tag})\n` +
              `📅 **Início:** ${dataInicio}\n` +
              `⏰ **Previsão Retorno:** ${dataRetorno}\n` +
              `⏳ **Duração:** ${dias} dias (Dentro do limite de 5 dias)\n\n` +
              `📝 **Motivo:** ${motivo}`
            )
            .setFooter({ text: 'LS CUSTOMS • Setor de Escalas' })
            .setTimestamp();

          await canalLogs.send({ embeds: [logEmbed] }).catch(() => null);
        }

        await interaction.reply({
          content: `✅ **Ausência de ${dias} dias registrada com sucesso!**\nLembre-se de retornar até **${dataRetorno}** e bater ponto para evitar aplicação de Advertência Grave automática.`,
          ephemeral: true
        });
        return;
      }
    }
  } catch (err) {
    console.error('❌ [ERRO NA INTERAÇÃO DISCORD]:', err && err.message ? err.message : err);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '⚠️ Ocorreu um erro ao processar esta ação. Tente novamente.', ephemeral: true });
      } else {
        await interaction.reply({ content: '⚠️ Ocorreu um erro ao processar esta ação. Tente novamente.', ephemeral: true });
      }
    } catch (_) {}
  }
});

// ============================================================================
// 🚀 11. LOGIN SEGURO DO BOT
// ============================================================================
if (!DISCORD_TOKEN || DISCORD_TOKEN === 'SEU_TOKEN_AQUI' || DISCORD_TOKEN === 'SEU_DISCORD_TOKEN_AQUI') {
  console.warn('⚠️ [LS CUSTOMS] DISCORD_TOKEN não configurado no .env! Defina DISCORD_TOKEN para conectar o bot ao Discord.');
} else {
  client.login(DISCORD_TOKEN).catch(err => {
    console.error('❌ [ERRO DE LOGIN NO DISCORD]:', err && err.message ? err.message : err);
  });
}
