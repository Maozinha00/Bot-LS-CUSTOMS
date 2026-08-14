/**
 * ============================================================================
 * 🔧 BOT OFICIAL UNIFICADO & MODULAR — LS CUSTOMS
 * ARQUIVO PRINCIPAL: index.js
 * ============================================================================
 */
try { require('dotenv').config(); } catch (e) {}

const { Client, GatewayIntentBits, Partials, SlashCommandBuilder, REST, Routes, Events } = require('discord.js');
const { configLS, db } = require('./database');
const eventos = require('./eventos');
const recrutamento = require('./recrutamento');
const ponto = require('./ponto');
const ausencia = require('./ausencia');
const advertencias = require('./advertencias');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN || '';
const GUILD_ID = process.env.GUILD_ID || '1535806745816072245';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.User],
});

// Slash Commands
const commands = [
  new SlashCommandBuilder().setName('painelevento').setDescription('Envia o Painel do Evento Automotivo no Canal 1537925623979319297'),
  new SlashCommandBuilder().setName('paineladv').setDescription('Envia o Painel de Advertências'),
  new SlashCommandBuilder().setName('painelausencia').setDescription('Envia o Painel de Ausências (Máx 5 dias)'),
  new SlashCommandBuilder().setName('painelregistro').setDescription('Envia o Painel de Recrutamento'),
  new SlashCommandBuilder().setName('painelponto').setDescription('Envia o Painel de Bate-Ponto'),
  new SlashCommandBuilder().setName('tabela').setDescription('Tabela oficial de preços e tunagem'),
  new SlashCommandBuilder().setName('radio').setDescription('Frequência de rádio da LS Customs')
];

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ [LS CUSTOMS BOT] Conectado como ${c.user.tag}`);
  if (DISCORD_TOKEN) {
    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
    await rest.put(Routes.applicationGuildCommands(c.user.id, GUILD_ID), { body: commands });
  }
});

// Roteador de Interações Modular
client.on(Events.InteractionCreate, async (interaction) => {
  const id = interaction.customId || '';
  if (id.startsWith('btn_ev_') || id.startsWith('modal_ev_')) return await eventos.tratarInteracaoEvento(interaction, client);
  if (id.startsWith('btn_rec_') || id.startsWith('modal_rec_')) return await recrutamento.tratarInteracaoRecrutamento(interaction, client);
  if (id.startsWith('btn_ponto_')) return await ponto.tratarInteracaoPonto(interaction, client);
  if (id.startsWith('btn_aus_') || id.startsWith('modal_aus_')) return await ausencia.tratarInteracaoAusencia(interaction, client);
  if (id.startsWith('btn_adv_') || id.startsWith('modal_adv_')) return await advertencias.tratarInteracaoAdvertencia(interaction, client);
});

if (DISCORD_TOKEN) client.login(DISCORD_TOKEN);
module.exports = { client, db, configLS };