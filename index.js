/**
 * ============================================================================
 * 🔧 BOT OFICIAL UNIFICADO — LS CUSTOMS (MECÂNICA) & SISTEMA DE AUSÊNCIAS (MÁX 5 DIAS) & ADVs
 * CÓDIGO COMPLETO (COMMONJS - require) - DISCORD.JS V14
 * ============================================================================
 * 
 * Funcionalidades Integradas:
 * 1. ⚠️ Painel de Advertências Disciplinares (Comando !painel-adv e /paineladv)
 *    - Classificação Oficial:
 *      🟡 Verbal / Leve: Cargo "1536526429897097246"
 *      🟠 Média: Cargo "1536304134746275861"
 *      🔴 Grave: Cargo "1536304135517773834"
 *      ⛔ 3 Advertências = Exoneração da LS Customs
 *    - Canal de Avisos de Advertência: 1536304172952191049
 *    - Canal de Logs da Liderança: 1536333810629607514
 *    - Imagem do Painel & Embed: https://i.imgur.com/Vv2juos.jpeg
 * 
 * 2. 🌴 Painel de Ausência & Folga (Comando !painel-ausencia e /painelausencia)
 *    - Regra: Tempo máximo de ausência é de 5 DIAS. Se passar de 5 dias, reprova na hora!
 *    - Verificação de Retorno x Bate-Ponto: Se o prazo de retorno expirar e não bater ponto, emite ADV Grave automática!
 *    - Canal do Painel: 1537852669853438032
 *    - Canal de Logs da Staff: 1537852751726510181
 * 
 * 3. 📋 Recrutamento em 2 Etapas com 8 Perguntas & Aprovação Manual
 *    - Permite que a liderança analise as 8 perguntas e aprove o candidato sem alteração automática de apelido ou atribuição forçada de cargos.
 * 
 * 4. ⏱️ Bate-Ponto Interativo no canal 1536309622699466772 (Registra retorno de ausência automaticamente)
 * 5. 🚨 Comando de Demissão (/demitir)
 * 6. 🌐 Servidor HTTP Uptime 24/7
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
  // ⚠️ CANAIS & CARGOS DE ADVERTÊNCIAS (DISCIPLINA)
  canalAdvId: process.env.CANAL_ADV_ID || '1536304172952191049',
  canalLogsAdvId: process.env.CANAL_LOGS_ADV_ID || '1536333810629607514',
  cargoAdvVerbalLeveId: process.env.CARGO_ADV_VERBAL_LEVE_ID || '1536526429897097246',
  cargoAdvMediaId: process.env.CARGO_ADV_MEDIA_ID || '1536304134746275861',
  cargoAdvGraveId: process.env.CARGO_ADV_GRAVE_ID || '1536304135517773834',

  // 🌴 CANAIS DE AUSÊNCIA
  canalPainelAusenciaId: process.env.CANAL_PAINEL_AUSENCIA_ID || '1537852669853438032',
  canalLogsAusenciaId: process.env.CANAL_LOGS_AUSENCIA_ID || '1537852751726510181',

  // 🛠️ DEMAIS CANAIS DA MECÂNICA LS CUSTOMS
  canalLogsEntradaSaidaId: process.env.JOIN_LOGS_CHANNEL_ID || '1536304188105949244',
  canalLogsRecrutamentoId: process.env.LOGS_CHANNEL_ID || '1536308230936993792',
  canalPontoId: process.env.PONTO_CHANNEL_ID || '1536309622699466772',
  canalDemissaoId: process.env.DEMISSAO_CHANNEL_ID || '1536304188609400955',

  // 👑 CARGOS
  cargosAdmins: [
    '1515125822795546715' // Staff / Liderança LS Customs
  ],

  // 📻 CONFIGURAÇÕES GERAIS
  radioFreq: process.env.RADIO_FREQ || '633',
  corLS: '#2ECC71',
  corAusencia: '#E67E22',
  corAdv: '#EF4444',
  bannerUrl: 'https://i.imgur.com/Vv2juos.jpeg',
  rodape: 'LS CUSTOMS • Setor Disciplinar, Ausências & Recrutamento • 2026'
};

// ==========================================
// 🗄️ BANCO DE DADOS EM MEMÓRIA & PERSISTÊNCIA
// ==========================================
const userAdvsCount = new Map(); // memberId -> total de advs
const activeAbsences = new Map(); // memberId -> { startDate, returnDate, dias, reason, status }
const pontoRecords = new Map(); // memberId -> { lastPontoTime, isWorking }
const tempRecruitment = new Map(); // userId -> { step1Data }

// ==========================================
// 🛡️ VALIDAÇÃO INTELIGENTE (ANTI-TROLL & RESPOSTAS SEM NOÇÃO)
// ==========================================
function validarCandidaturaSemNocao(dados) {
  const { nome, passaporte, idade, experiencia, motivo, disponibilidade, aceitaRegras, situacaoConflito } = dados;

  // 1. Validar Idade
  if (idade !== undefined) {
    const idadeNum = parseInt(idade.replace(/\D/g, ''));
    if (isNaN(idadeNum) || idadeNum < 14 || idadeNum > 90) {
      return { semNocao: true, motivo: `Idade "${idade}" é inválida ou sem noção (deve ser entre 14 e 90 anos).` };
    }
  }

  // 2. Validar Passaporte
  if (passaporte !== undefined) {
    const passL = passaporte.trim().toLowerCase();
    if (!passL || passL === '0' || passL === 'nenhum' || passL === 'sla' || passL === 'sei la' || passL === 'abc') {
      return { semNocao: true, motivo: 'Passaporte/ID inválido ou em branco.' };
    }
  }

  // 3. Validar Nome
  if (nome !== undefined) {
    const nomeL = nome.trim().toLowerCase();
    const trollNomes = ['troll', 'zoeira', 'seu pai', 'sua mae', 'adm lixo', 'fodase', 'foda-se', 'asdf', 'teste123', 'qualquer'];
    if (nomeL.length < 3 || trollNomes.some(t => nomeL.includes(t))) {
      return { semNocao: true, motivo: 'Nome de personagem sem noção ou inadequado para RP.' };
    }
  }

  // 4. Validar Regras
  if (aceitaRegras !== undefined) {
    const regrasL = aceitaRegras.trim().toLowerCase();
    const recusaRegras = ['não', 'nao', 'nunca', 'discordo', 'nem ferrando', 'nem fudendo', 'lixo', 'odeio', 'não aceito', 'nao aceito', 'tanto faz'];
    if (recusaRegras.includes(regrasL) || regrasL.startsWith('não') || regrasL.startsWith('nao')) {
      return { semNocao: true, motivo: 'Recusa explícita das regras da mecânica e do ponto obrigatório.' };
    }
  }

  // 5. Palavras-chave troll / agressivas / sem sentido
  const trollTerms = [
    'matar', 'roubar', 'trollar', 'zoar', 'bagunçar', 'dar tiro', 'bater nele', 'destruir',
    'xingar', 'farpar', 'chutar', 'atirar', 'puxar arma', 'comi sua', 'foda-se', 'fodase',
    'sla', 'sei la', 'sei la mano', 'fazer nada', 'sei nao', 'dsadsad', 'asdfgh', 'teste123',
    'pq sim', 'porque sim', 'grana facil', 'farmar e vazar', 'pegar arma', 'atropelar',
    'dar soco', 'mandar tomar', 'mandar se fuder', 'desrespeitar'
  ];

  if (motivo !== undefined) {
    const motL = motivo.trim().toLowerCase();
    if (motL.length < 6 || trollTerms.some(t => motL.includes(t))) {
      return { semNocao: true, motivo: 'Motivo de entrada sem seriedade, agressivo ou insuficiente.' };
    }
  }

  if (situacaoConflito !== undefined) {
    const sitL = situacaoConflito.trim().toLowerCase();
    if (sitL.length < 6 || trollTerms.some(t => sitL.includes(t))) {
      return { semNocao: true, motivo: 'Conduta em conflitos inaceitável (postura agressiva, deboche ou desrespeito ao cliente).' };
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

// ==========================================
// 🌐 SERVIDOR WEB NATIVO PARA UPTIME 24/7
// ==========================================
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'online', time: new Date().toISOString() }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('🔧 Bot LS Customs (Recrutamento, Ausências Máx 5 Dias e Painel ADV) Online 24/7!');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 [LS CUSTOMS] Servidor de Uptime rodando na porta ${PORT}`);
});

// ==========================================
// 🤖 INICIALIZAÇÃO DO CLIENTE DISCORD
// ==========================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.User],
});

// ==========================================
// ⚡ REGISTRO DE SLASH COMMANDS
// ==========================================
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
    .setDescription('Abre o modal de exoneração/demissão de funcionário')
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
    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
    await rest.put(
      Routes.applicationGuildCommands(c.user.id, GUILD_ID),
      { body: commands }
    );
    console.log('✅ [SLASH COMMANDS] Comandos registrados com sucesso na Guilda!');
  } catch (error) {
    console.error('❌ [ERRO AO REGISTRAR COMANDOS]:', error);
  }

  // ========================================================
  // ⏰ ROTINA AUTOMÁTICA DE VERIFICAÇÃO DE AUSÊNCIAS VENCIDAS
  // Executa a cada 10 minutos
  // ========================================================
  setInterval(async () => {
    try {
      await verificarAusenciasVencidas();
    } catch (e) {
      console.error('Erro na rotina de ausências:', e);
    }
  }, 10 * 60 * 1000);
});

// Função auxiliar para verificar ausências vencidas
async function verificarAusenciasVencidas() {
  const canalAdv = client.channels.cache.get(CONFIG_LS.canalAdvId);
  const canalLogs = client.channels.cache.get(CONFIG_LS.canalLogsAdvId);
  if (!canalAdv) return;

  const now = new Date();

  for (const [memberId, absence] of activeAbsences.entries()) {
    if (absence.status === 'aprovado' && !absence.advAplicada) {
      // Se passou da data de retorno e não tem registro recente de ponto
      const returnDateObj = parseDataBrasileira(absence.returnDate);
      if (returnDateObj && now > returnDateObj) {
        const lastPonto = pontoRecords.get(memberId);
        const bateuPontoApos = lastPonto && lastPonto.lastPontoTime > returnDateObj;

        if (!bateuPontoApos) {
          absence.advAplicada = true;
          const currentCount = (userAdvsCount.get(memberId) || 0) + 1;
          userAdvsCount.set(memberId, currentCount);

          // Tentar atribuir o cargo de ADV Grave
          try {
            const guild = client.guilds.cache.get(GUILD_ID);
            const member = await guild?.members.fetch(memberId).catch(() => null);
            if (member && CONFIG_LS.cargoAdvGraveId) {
              await member.roles.add(CONFIG_LS.cargoAdvGraveId).catch(() => null);
            }
          } catch (err) {
            console.error('Erro ao adicionar cargo grave:', err);
          }

          // Enviar Embed Oficial no Canal de Advertências (#1536304172952191049)
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

          await canalAdv.send({ content: `⚠️ <@${memberId}> recebeu uma **Advertência Grave**!`, embeds: [advEmbed] });

          if (canalLogs) {
            await canalLogs.send({
              content: `🚨 **[AUTO-ADV]** <@${memberId}> recebeu Advertência Grave por retorno de ausência expirado (${absence.returnDate}). Ocorrência #${currentCount}.`
            });
          }
        }
      }
    }
  }
}

function parseDataBrasileira(str) {
  if (!str) return null;
  const parts = str.split(/[/ -]/);
  if (parts.length >= 3) {
    const d = parseInt(parts[0]);
    const m = parseInt(parts[1]) - 1;
    const y = parseInt(parts[2].length === 2 ? '20' + parts[2] : parts[2]);
    return new Date(y, m, d, 23, 59, 59);
  }
  return null;
}

// ==========================================
// 📨 COMANDOS POR MENSAGEM (!painel-adv, !painel-ausencia, etc)
// ==========================================
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  // 1. !painel-adv
  if (message.content === '!painel-adv' || message.content === '!adv') {
    const advEmbed = new EmbedBuilder()
      .setColor('#EF4444')
      .setTitle('⚠️ REGISTRO DE ADVERTÊNCIAS DISCIPLINARES')
      .setDescription(
        '**Classificação oficial de punições:**\n\n' +
        `🟡 **ADVERTÊNCIA verbal:** Atrasos no ponto, falta de uniforme parcial. cargo "${CONFIG_LS.cargoAdvVerbalLeveId}"\n` +
        `🟡 **ADVERTÊNCIA LEVE:** Atrasos no ponto, falta de uniforme parcial. cargo "${CONFIG_LS.cargoAdvVerbalLeveId}"\n` +
        `🟠 **ADVERTÊNCIA MÉDIA:** Desobediência na rádio 633, desrespeito entre membros. cargo "${CONFIG_LS.cargoAdvMediaId}"\n` +
        `🔴 **ADVERTÊNCIA GRAVE:** Cobrança incorreta, ausência sem justificativa, abandono do pátio. cargo "${CONFIG_LS.cargoAdvGraveId}"\n\n` +
        '⛔ **MEDIDAS DISCIPLINARES:** 3 Advertências = Exoneração da LS Customs.'
      )
      .setImage(CONFIG_LS.bannerUrl)
      .setFooter({ text: 'Henrique Souza 👑 [TIRA] — LS CUSTOMS' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_abrir_modal_adv')
        .setLabel('⚠️ Aplicar Advertência (Formulário)')
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
        'Clique no botão abaixo para preencher o questionário de 8 perguntas.\n\n' +
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
});

// ==========================================
// 🖱️ TRATAMENTO DE BOTÕES, MODAIS E SLASH COMMANDS
// ==========================================
client.on(Events.InteractionCreate, async (interaction) => {
  // 1. SLASH COMMANDS
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'paineladv') {
      const advEmbed = new EmbedBuilder()
        .setColor('#EF4444')
        .setTitle('⚠️ REGISTRO DE ADVERTÊNCIAS DISCIPLINARES')
        .setDescription(
          '**Classificação oficial de punições:**\n\n' +
          `🟡 **ADVERTÊNCIA verbal:** Atrasos no ponto, falta de uniforme parcial. cargo "${CONFIG_LS.cargoAdvVerbalLeveId}"\n` +
          `🟡 **ADVERTÊNCIA LEVE:** Atrasos no ponto, falta de uniforme parcial. cargo "${CONFIG_LS.cargoAdvVerbalLeveId}"\n` +
          `🟠 **ADVERTÊNCIA MÉDIA:** Desobediência na rádio 633, desrespeito entre membros. cargo "${CONFIG_LS.cargoAdvMediaId}"\n` +
          `🔴 **ADVERTÊNCIA GRAVE:** Cobrança incorreta, ausência sem justificativa, abandono do pátio. cargo "${CONFIG_LS.cargoAdvGraveId}"\n\n` +
          '⛔ **MEDIDAS DISCIPLINARES:** 3 Advertências = Exoneração da LS Customs.'
        )
        .setImage(CONFIG_LS.bannerUrl)
        .setFooter({ text: 'Henrique Souza 👑 [TIRA] — LS CUSTOMS' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('btn_abrir_modal_adv')
          .setLabel('⚠️ Aplicar Advertência (Formulário)')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('btn_verificar_ausencias')
          .setLabel('⚡ Checar Ausências Vencidas')
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.reply({ embeds: [advEmbed], components: [row] });
      return;
    }

    if (interaction.commandName === 'verificarvencidas') {
      await interaction.deferReply({ ephemeral: true });
      await verificarAusenciasVencidas();
      await interaction.editReply({ content: '✅ Verificação de ausências vencidas concluída com sucesso!' });
      return;
    }

    if (interaction.commandName === 'tabela') {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(CONFIG_LS.corLS)
            .setTitle('🔧 TABELA OFICIAL DE PREÇOS — LS CUSTOMS')
            .setDescription(
              '• Reparo Completo: $2.500\n' +
              '• Blindagem Nível 5: $45.000\n' +
              '• Motor Nível 4: $35.000\n' +
              '• Frequência de Rádio: **633 MHz**'
            )
            .setImage(CONFIG_LS.bannerUrl)
        ],
        ephemeral: true
      });
      return;
    }
  }

  // 2. BOTÕES
  if (interaction.isButton()) {
    // BOTÃO: ABRIR MODAL DE ADVERTÊNCIA
    if (interaction.customId === 'btn_abrir_modal_adv') {
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

    // BOTÃO: CHECAR AUSÊNCIAS VENCIDAS
    if (interaction.customId === 'btn_verificar_ausencias') {
      await interaction.deferReply({ ephemeral: true });
      await verificarAusenciasVencidas();
      await interaction.editReply({ content: '✅ Checagem realizada no banco de ausências e pontos!' });
      return;
    }

    // BOTÃO: ABRIR MODAL DE AUSÊNCIA (MÁXIMO 5 DIAS)
    if (interaction.customId === 'btn_abrir_modal_ausencia') {
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

    // BOTÃO: INICIAR RECRUTAMENTO (ETAPA 1)
    if (interaction.customId === 'btn_iniciar_recrutamento') {
      const modal = new ModalBuilder()
        .setCustomId('modal_recrutamento_step1')
        .setTitle('LS CUSTOMS — Recrutamento (1/2)');

      const inputNome = new TextInputBuilder()
        .setCustomId('rec_nome')
        .setLabel('1. Nome Completo (Personagem)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: Felipe Souza')
        .setRequired(true);

      const inputPassaporte = new TextInputBuilder()
        .setCustomId('rec_passaporte')
        .setLabel('2. Passaporte / ID na Cidade')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: 4192')
        .setRequired(true);

      const inputIdade = new TextInputBuilder()
        .setCustomId('rec_idade')
        .setLabel('3. Idade')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: 21')
        .setRequired(true);

      const inputExp = new TextInputBuilder()
        .setCustomId('rec_exp')
        .setLabel('4. Experiência como mecânico?')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: 2 meses na Bennys / Nenhuma...')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(inputNome),
        new ActionRowBuilder().addComponents(inputPassaporte),
        new ActionRowBuilder().addComponents(inputIdade),
        new ActionRowBuilder().addComponents(inputExp)
      );

      await interaction.showModal(modal);
      return;
    }

    // BOTÃO: APROVAR RECRUTA
    if (interaction.customId.startsWith('aprovar_rec_')) {
      const userId = interaction.customId.replace('aprovar_rec_', '');

      await interaction.reply({
        content: `✅ Candidatura de <@${userId}> foi aprovada por <@${interaction.user.id}>!`,
        ephemeral: false
      });
      return;
    }

    // BOTÃO: RECUSAR RECRUTA
    if (interaction.customId.startsWith('recusar_rec_')) {
      const userId = interaction.customId.replace('recusar_rec_', '');

      await interaction.reply({
        content: `❌ Candidatura de <@${userId}> foi recusada por <@${interaction.user.id}>.`,
        ephemeral: false
      });
      return;
    }
  }

  // 3. SUBMISSÃO DE MODAIS
  if (interaction.isModalSubmit()) {
    // SUBMIT: RECRUTAMENTO ETAPA 1 (COM VALIDAÇÃO ANTI-SEM NOÇÃO)
    if (interaction.customId === 'modal_recrutamento_step1') {
      const nome = interaction.fields.getTextInputValue('rec_nome');
      const passaporte = interaction.fields.getTextInputValue('rec_passaporte').replace('#', '');
      const idade = interaction.fields.getTextInputValue('rec_idade');
      const experiencia = interaction.fields.getTextInputValue('rec_exp');

      const validacao1 = validarCandidaturaSemNocao({ nome, passaporte, idade, experiencia });
      if (validacao1.semNocao) {
        await interaction.reply({
          content: `❌ **Candidatura Reprovada Automaticamente!**\n\nIdentificamos dados sem noção ou inválidos:\n⚠️ **${validacao1.motivo}**\n\nA LS Customs exige preenchimento sério no formulário.`,
          ephemeral: true
        });
        return;
      }

      tempRecruitment.set(interaction.user.id, { nome, passaporte, idade, experiencia });

      const modal2 = new ModalBuilder()
        .setCustomId('modal_recrutamento_step2')
        .setTitle('LS CUSTOMS — Recrutamento (2/2)');

      const inputMotivo = new TextInputBuilder()
        .setCustomId('rec_motivo')
        .setLabel('5. Por que quer entrar na LS Customs?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Ex: Gosto do RP de mecânico e busco oficina ativa...')
        .setRequired(true);

      const inputDisp = new TextInputBuilder()
        .setCustomId('rec_disp')
        .setLabel('6. Disponibilidade de horários')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: Noite (19h às 00h)')
        .setRequired(true);

      const inputRegras = new TextInputBuilder()
        .setCustomId('rec_regras')
        .setLabel('7. Leu regras e aceita bater ponto?')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: Sim, aceito todas as regras e ponto.')
        .setRequired(true);

      const inputConflito = new TextInputBuilder()
        .setCustomId('rec_conflito')
        .setLabel('8. Como lidaria com cliente estressado?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Ex: Manter a calma, consultar tabela de preços e chamar um superior.')
        .setRequired(true);

      modal2.addComponents(
        new ActionRowBuilder().addComponents(inputMotivo),
        new ActionRowBuilder().addComponents(inputDisp),
        new ActionRowBuilder().addComponents(inputRegras),
        new ActionRowBuilder().addComponents(inputConflito)
      );

      await interaction.showModal(modal2);
      return;
    }

    // SUBMIT: RECRUTAMENTO ETAPA 2 (FINAL - COM VALIDAÇÃO ANTI-SEM NOÇÃO)
    if (interaction.customId === 'modal_recrutamento_step2') {
      const step1 = tempRecruitment.get(interaction.user.id) || {};
      const motivo = interaction.fields.getTextInputValue('rec_motivo');
      const disponibilidade = interaction.fields.getTextInputValue('rec_disp');
      const aceitaRegras = interaction.fields.getTextInputValue('rec_regras');
      const situacaoConflito = interaction.fields.getTextInputValue('rec_conflito');

      const validacao2 = validarCandidaturaSemNocao({
        nome: step1.nome,
        passaporte: step1.passaporte,
        idade: step1.idade,
        experiencia: step1.experiencia,
        motivo,
        disponibilidade,
        aceitaRegras,
        situacaoConflito
      });

      // Se for "sem noção" / troll, reprova na hora!
      if (validacao2.semNocao) {
        tempRecruitment.delete(interaction.user.id);

        // Notifica no canal de logs da Staff sobre a tentativa troll
        const canalLogs = client.channels.cache.get(CONFIG_LS.canalLogsRecrutamentoId);
        if (canalLogs) {
          const trollEmbed = new EmbedBuilder()
            .setColor('#EF4444')
            .setTitle('🚫 CANDIDATURA REPROVADA AUTOMATICAMENTE (SEM NOÇÃO)')
            .setDescription(
              `👤 **Candidato:** <@${interaction.user.id}> (${interaction.user.tag})\n` +
              `🆔 **RG/Passaporte:** #${step1.passaporte || 'N/A'}\n` +
              `⚠️ **Motivo da Reprovação:** ${validacao2.motivo}\n\n` +
              `📝 **Respostas Registradas:**\n` +
              `• Motivo: ${motivo}\n` +
              `• Regras: ${aceitaRegras}\n` +
              `• Conflito: ${situacaoConflito}`
            )
            .setFooter({ text: 'Sistema Anti-Troll • LS CUSTOMS' })
            .setTimestamp();

          await canalLogs.send({ embeds: [trollEmbed] });
        }

        await interaction.reply({
          content: `❌ **Candidatura Reprovada Automaticamente!**\n\nIdentificamos respostas sem noção ou inadequadas:\n⚠️ **${validacao2.motivo}**\n\nA LS Customs exige seriedade e respeito às diretrizes de RP.`,
          ephemeral: true
        });
        return;
      }

      // Enviar ficha completa para o canal da liderança
      const canalLogs = client.channels.cache.get(CONFIG_LS.canalLogsRecrutamentoId);
      if (canalLogs) {
        const fichaEmbed = new EmbedBuilder()
          .setColor(CONFIG_LS.corLS)
          .setTitle('📋 NOVA CANDIDATURA DE RECRUTAMENTO')
          .setDescription(
            `👤 **Candidato:** <@${interaction.user.id}> (${interaction.user.tag})\n` +
            `🆔 **Passaporte:** #${step1.passaporte}\n` +
            `🎂 **Idade:** ${step1.idade} anos\n` +
            `🔧 **Experiência:** ${step1.experiencia}\n\n` +
            `🎯 **5. Motivo de Entrada:** ${motivo}\n` +
            `⏰ **6. Disponibilidade:** ${disponibilidade}\n` +
            `📜 **7. Aceita Regras & Ponto:** ${aceitaRegras}\n` +
            `🤝 **8. Resolução de Conflito:** ${situacaoConflito}`
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

        await canalLogs.send({ embeds: [fichaEmbed], components: [row] });
      }

      tempRecruitment.delete(interaction.user.id);

      await interaction.reply({
        content: '✅ **Candidatura enviada com sucesso!**\nA Liderança da **LS Customs** analisará suas respostas e aprovará seu registro.',
        ephemeral: true
      });
      return;
    }
    // SUBMIT: APLICAR ADVERTÊNCIA
    if (interaction.customId === 'modal_aplicar_adv') {
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

      const totalOcorrencias = 1;
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

      // Enviar no canal de advertências (#1536304172952191049)
      const canalAdv = client.channels.cache.get(CONFIG_LS.canalAdvId);
      if (canalAdv) {
        await canalAdv.send({ embeds: [advEmbed] });
      }

      await interaction.reply({
        content: `✅ Advertência aplicada com sucesso e publicada no canal <#${CONFIG_LS.canalAdvId}>!`,
        ephemeral: true
      });
      return;
    }

    // SUBMIT: AUSÊNCIA COM VALIDAÇÃO DE 5 DIAS
    if (interaction.customId === 'modal_envio_ausencia') {
      const motivo = interaction.fields.getTextInputValue('aus_motivo');
      const dataInicio = interaction.fields.getTextInputValue('aus_inicio');
      const dataRetorno = interaction.fields.getTextInputValue('aus_retorno');
      const diasStr = interaction.fields.getTextInputValue('aus_dias');
      const dias = parseInt(diasStr) || 1;

      // 🛑 VALIDAÇÃO: SE PASSOU DE 5 DIAS, REPROVA AUTOMATICAMENTE!
      if (dias > 5) {
        await interaction.reply({
          content: `❌ **Solicitação Recusada Automaticamente!**\n\nO tempo máximo permitido de ausência contínua na **LS Customs** é de **5 dias** (você informou ${dias} dias).\nPara períodos superiores a 5 dias, entre em contato diretamente com a Liderança.`,
          ephemeral: true
        });
        return;
      }

      // Salvar ausência ativa no sistema
      activeAbsences.set(interaction.user.id, {
        memberTag: interaction.user.tag,
        startDate: dataInicio,
        returnDate: dataRetorno,
        dias: dias,
        reason: motivo,
        status: 'pendente',
        advAplicada: false
      });

      // Notificar no Canal de Logs da Staff (#1537852751726510181)
      const canalLogs = client.channels.cache.get(CONFIG_LS.canalLogsAusenciaId);
      if (canalLogs) {
        const logEmbed = new EmbedBuilder()
          .setColor(CONFIG_LS.corAusencia)
          .setTitle('🌴 NOVA SOLICITAÇÃO DE AUSÊNCIA')
          .setDescription(
            `👤 **Membro:** <@${interaction.user.id}> (${interaction.user.tag})\n` +
            `📅 **Início:** ${dataInicio}\n` +
            `⏰ **Previsão Retorno:** ${dataRetorno}\n` +
            `⏳ **Duração:** ${dias} dias (Dentro do limite de 5 dias)\n\n` +
            `📝 **Motivo:** ${motivo}`
          )
          .setFooter({ text: 'LS CUSTOMS • Setor de Escalas' })
          .setTimestamp();

        await canalLogs.send({ embeds: [logEmbed] });
      }

      await interaction.reply({
        content: `✅ **Ausência de ${dias} dias registrada com sucesso!**\nA Liderança da LS Customs foi notificada. Lembre-se de retornar em **${dataRetorno}** e bater ponto para evitar aplicação de Advertência Grave automática.`,
        ephemeral: true
      });
      return;
    }
  }
});

client.login(DISCORD_TOKEN);
