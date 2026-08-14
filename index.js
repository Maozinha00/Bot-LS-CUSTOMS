/**
 * ============================================================================
 * 🔧 BOT OFICIAL UNIFICADO & MODULAR — LS CUSTOMS
 * ARQUIVO PRINCIPAL: index.js
 * ESTRUTURA MODULAR:
 * ├── index.js (Entrada principal, Slash Commands & Roteador de Eventos)
 * ├── eventos.js (Painel de Evento Automotivo, Inscrição, Pagamento, Pódio, Arrecadação)
 * ├── recrutamento.js (Ficha de Candidatura & Sistema Anti-Troll)
 * ├── ponto.js (Bate-Ponto Eletrônico & Turnos)
 * ├── ausencia.js (Gestão de Ausências - Máx 5 dias)
 * ├── advertencias.js (Disciplina, 3 Níveis & Exoneração)
 * └── database.js (Banco de Dados & Configurações)
 * ============================================================================
 */

// NOTA: SEM NECESSIDADE OBRIGATÓRIA DE ARQUIVO .ENV
try {
  require('dotenv').config();
} catch (e) {
  // Execução normal sem dotenv
}

const http = require('http');
const { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  SlashCommandBuilder, 
  REST, 
  Routes, 
  Events 
} = require('discord.js');

// Importação dos Módulos Especializados da LS Customs
const { configLS, db } = require('./database');
const eventos = require('./eventos');
const recrutamento = require('./recrutamento');
const ponto = require('./ponto');
const ausencia = require('./ausencia');
const advertencias = require('./advertencias');

// 🔑 Configuração de Token & Guild com fallbacks seguros
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN || '';
const GUILD_ID = process.env.GUILD_ID || '1535806745816072245';
const PORT = process.env.PORT || 3000;

// 🛡️ Prevenção Global Anti-Crash
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [ANTI-CRASH REJECTION]:', reason && reason.message ? reason.message : reason);
});

process.on('uncaughtException', (err) => {
  console.error('💥 [ANTI-CRASH EXCEPTION]:', err && err.message ? err.message : err);
});

// 🤖 Inicialização do Cliente Discord com Intents Necessários
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.User],
});

// ⚡ Registro de Slash Commands Oficiais
const commands = [
  new SlashCommandBuilder()
    .setName('painelevento')
    .setDescription('Envia o Painel Oficial do Evento Automotivo no Canal 1537925623979319297'),
  new SlashCommandBuilder()
    .setName('paineladv')
    .setDescription('Envia o Painel Oficial de Advertências da LS Customs'),
  new SlashCommandBuilder()
    .setName('painelausencia')
    .setDescription('Envia o Painel Oficial de Ausências (Máx 5 dias)'),
  new SlashCommandBuilder()
    .setName('painelregistro')
    .setDescription('Envia o Painel Oficial de Recrutamento & Candidaturas'),
  new SlashCommandBuilder()
    .setName('painelponto')
    .setDescription('Envia o Painel Oficial de Bate-Ponto da oficina'),
  new SlashCommandBuilder()
    .setName('tabela')
    .setDescription('Exibe a tabela oficial de serviços e tunagem'),
  new SlashCommandBuilder()
    .setName('radio')
    .setDescription('Exibe a frequência oficial de rádio da LS Customs')
];

client.once(Events.ClientReady, async (c) => {
  console.log(`========================================================`);
  console.log(`✅ [LS CUSTOMS BOT] Online com sucesso como ${c.user.tag}`);
  console.log(`📁 Módulos Carregados: eventos.js, recrutamento.js, ponto.js, ausencia.js, advertencias.js, database.js`);
  console.log(`🏁 Canal do Evento: #${configLS.canalEventoId}`);
  console.log(`========================================================`);

  try {
    if (DISCORD_TOKEN && DISCORD_TOKEN !== 'SEU_TOKEN_AQUI') {
      const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
      await rest.put(
        Routes.applicationGuildCommands(c.user.id, GUILD_ID),
        { body: commands }
      );
      console.log('✅ [SLASH COMMANDS] Comandos registrados na guilda com sucesso!');
    }
  } catch (error) {
    console.error('⚠️ [COMANDOS] Erro ao registrar Slash Commands:', error && error.message ? error.message : error);
  }
});

// 📨 Comandos por Prefixo (!painel-evento, !painel-adv, !painel-ponto, etc.)
client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot) return;
    const content = message.content.toLowerCase();

    // 1. !painel-evento
    if (content === '!painel-evento' || content === '!evento') {
      const canalEvento = client.channels.cache.get(configLS.canalEventoId) || message.channel;
      const embed = eventos.gerarEmbedPainelEvento();
      const rows = eventos.gerarBotoesPainelEvento();
      const msg = await canalEvento.send({ embeds: [embed], components: rows });
      db.eventoConfig.painelMessageId = msg.id;

      if (canalEvento.id !== message.channel.id) {
        await message.reply(`✅ Painel do Evento Automotivo publicado em <#${configLS.canalEventoId}>!`);
      }
      return;
    }

    // 2. !painel-adv
    if (content === '!painel-adv' || content === '!adv') {
      const { embeds, components } = advertencias.gerarPainelAdvertencia();
      const canal = client.channels.cache.get(configLS.canalAdvId) || message.channel;
      await canal.send({ embeds, components });
      return;
    }

    // 3. !painel-ausencia
    if (content === '!painel-ausencia' || content === '!ausencia') {
      const { embeds, components } = ausencia.gerarPainelAusencia();
      const canal = client.channels.cache.get(configLS.canalPainelAusenciaId) || message.channel;
      await canal.send({ embeds, components });
      return;
    }

    // 4. !painel-ponto
    if (content === '!painel-ponto' || content === '!ponto') {
      const { embeds, components } = ponto.gerarPainelPonto();
      const canal = client.channels.cache.get(configLS.canalPontoId) || message.channel;
      await canal.send({ embeds, components });
      return;
    }

    // 5. !painel-recrutamento
    if (content === '!painel-recrutamento' || content === '!recrutamento' || content === '!registro') {
      const { embeds, components } = recrutamento.gerarPainelRecrutamento();
      await message.channel.send({ embeds, components });
      return;
    }

    // 6. !radio
    if (content === '!radio') {
      await message.reply(`📻 **Frequência Oficial da LS Customs:** \`${configLS.radioFreq}\` MHz`);
      return;
    }
  } catch (err) {
    console.error('⚠️ [MESSAGE ERROR]:', err && err.message ? err.message : err);
  }
});

// 🖱️ Roteador Unificado de Interações (Slash Commands, Botões e Modais)
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // ------------------------------------------------------------------------
    // A. SLASH COMMANDS
    // ------------------------------------------------------------------------
    if (interaction.isChatInputCommand()) {
      const cmd = interaction.commandName;

      if (cmd === 'painelevento') {
        const canal = client.channels.cache.get(configLS.canalEventoId) || interaction.channel;
        const embed = eventos.gerarEmbedPainelEvento();
        const rows = eventos.gerarBotoesPainelEvento();
        const msg = await canal.send({ embeds: [embed], components: rows });
        db.eventoConfig.painelMessageId = msg.id;

        return await interaction.reply({
          content: `✅ Painel do Evento Automotivo publicado em <#${configLS.canalEventoId}>!`,
          ephemeral: true
        });
      }

      if (cmd === 'paineladv') {
        const canal = client.channels.cache.get(configLS.canalAdvId) || interaction.channel;
        const { embeds, components } = advertencias.gerarPainelAdvertencia();
        await canal.send({ embeds, components });
        return await interaction.reply({ content: `✅ Painel de Advertências publicado!`, ephemeral: true });
      }

      if (cmd === 'painelausencia') {
        const canal = client.channels.cache.get(configLS.canalPainelAusenciaId) || interaction.channel;
        const { embeds, components } = ausencia.gerarPainelAusencia();
        await canal.send({ embeds, components });
        return await interaction.reply({ content: `✅ Painel de Ausências publicado!`, ephemeral: true });
      }

      if (cmd === 'painelponto') {
        const canal = client.channels.cache.get(configLS.canalPontoId) || interaction.channel;
        const { embeds, components } = ponto.gerarPainelPonto();
        await canal.send({ embeds, components });
        return await interaction.reply({ content: `✅ Painel de Bate-Ponto publicado!`, ephemeral: true });
      }

      if (cmd === 'painelregistro') {
        const { embeds, components } = recrutamento.gerarPainelRecrutamento();
        await interaction.channel.send({ embeds, components });
        return await interaction.reply({ content: `✅ Painel de Recrutamento publicado!`, ephemeral: true });
      }

      if (cmd === 'radio') {
        return await interaction.reply({
          content: `📻 **Frequência Oficial LS Customs:** \`${configLS.radioFreq}\` MHz`,
          ephemeral: true
        });
      }
    }

    // ------------------------------------------------------------------------
    // B. ROTEAMENTO PARA OS MÓDULOS ESPECÍFICOS
    // ------------------------------------------------------------------------
    const customId = interaction.customId || '';

    // Módulo de Eventos Automotivos
    if (customId.startsWith('btn_ev_') || customId.startsWith('modal_ev_')) {
      return await eventos.tratarInteracaoEvento(interaction, client);
    }

    // Módulo de Recrutamento
    if (customId.startsWith('btn_rec_') || customId.startsWith('modal_rec_')) {
      return await recrutamento.tratarInteracaoRecrutamento(interaction, client);
    }

    // Módulo de Ponto
    if (customId.startsWith('btn_ponto_')) {
      return await ponto.tratarInteracaoPonto(interaction, client);
    }

    // Módulo de Ausência
    if (customId.startsWith('btn_aus_') || customId.startsWith('modal_aus_')) {
      return await ausencia.tratarInteracaoAusencia(interaction, client);
    }

    // Módulo de Advertências Disciplinares
    if (customId.startsWith('btn_adv_') || customId.startsWith('modal_adv_')) {
      return await advertencias.tratarInteracaoAdvertencia(interaction, client);
    }

  } catch (err) {
    console.error('❌ [INTERACTION ROUTER ERROR]:', err && err.message ? err.message : err);
  }
});

// 🚀 Inicialização do Bot Discord
if (DISCORD_TOKEN && DISCORD_TOKEN !== 'SEU_TOKEN_AQUI') {
  client.login(DISCORD_TOKEN).catch((err) => {
    console.error('❌ [LOGIN FAILED]:', err && err.message ? err.message : err);
  });
}

// Export para uso opcional
module.exports = { client, db, configLS };