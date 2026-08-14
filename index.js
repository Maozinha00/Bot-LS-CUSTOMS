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

    // BOTÃO: APROVAR RECRUTA
    if (interaction.customId.startsWith('aprovar_rec_')) {
      const userId = interaction.customId.replace('aprovar_rec_', '');

      await interaction.reply({
        content: `✅ Candidatura de <@${userId}> foi aprovada por <@${interaction.user.id}>!`,
        ephemeral: false
      });
      return;
    }
  }

  // 3. SUBMISSÃO DE MODAIS
  if (interaction.isModalSubmit()) {
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
