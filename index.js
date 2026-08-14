/**
 * ============================================================================
 * 🔧 BOT OFICIAL UNIFICADO — LS CUSTOMS (MECÂNICA) & SISTEMA DE AUSÊNCIAS
 * CORREÇÃO DE ERRO DE SINTAXE (TEMPLATE STRINGS)
 * ============================================================================
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

// ==========================================
// 🔑 CONFIGURAÇÕES & IDS DA LS CUSTOMS
// ==========================================
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN || 'SEU_TOKEN_AQUI';
const GUILD_ID = process.env.GUILD_ID || '1535806745816072245';
const PORT = process.env.PORT || 3001;

const CONFIG_LS = {
  canalAdvId: '1536304172952191049',
  canalLogsAdvId: '1536333810629607514',
  cargoAdvVerbalLeveId: '1536526429897097246',
  cargoAdvMediaId: '1536304134746275861',
  cargoAdvGraveId: '1536304135517773834',
  canalPainelAusenciaId: '1537852669853438032',
  canalLogsAusenciaId: '1537852751726510181',
  canalLogsEntradaSaidaId: '1536304188105949244',
  canalLogsRecrutamentoId: '1536308230936993792',
  canalPontoId: '1536309622699466772',
  canalDemissaoId: '1536304188609400955',
  corLS: '#2ECC71',
  corAusencia: '#E67E22',
  corAdv: '#EF4444',
  bannerUrl: 'https://i.imgur.com/Vv2juos.jpeg',
  rodape: 'LS CUSTOMS • Setor Disciplinar, Ausências & Recrutamento'
};

// ==========================================
// 🗄️ BANCO DE DADOS EM MEMÓRIA
// ==========================================
const userAdvsCount = new Map();
const activeAbsences = new Map();
const pontoRecords = new Map();

// ==========================================
// 🛡️ VALIDAÇÃO ANTI-TROLL
// ==========================================
function validarCandidaturaSemNocao(dados) {
  const { nome, passaporte, idade, experiencia, motivo } = dados;
  if (idade) {
    const idadeNum = parseInt(idade.replace(/\D/g, ''));
    if (isNaN(idadeNum) || idadeNum < 14 || idadeNum > 90) return { semNocao: true, motivo: 'Idade inválida.' };
  }
  const passL = passaporte?.trim().toLowerCase();
  if (!passL || passL === '0' || passL === 'nenhum') return { semNocao: true, motivo: 'Passaporte inválido.' };
  
  return { semNocao: false };
}

// ==========================================
// 🌐 SERVIDOR WEB UPTIME
// ==========================================
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Bot LS Customs Online!');
});
server.listen(PORT, '0.0.0.0');

// ==========================================
// 🤖 CLIENTE DISCORD
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

// Comandos Slash
const commands = [
  new SlashCommandBuilder().setName('paineladv').setDescription('Painel de Advertências'),
  new SlashCommandBuilder().setName('painelausencia').setDescription('Painel de Ausências'),
  new SlashCommandBuilder().setName('painelregistro').setDescription('Painel de Recrutamento'),
  new SlashCommandBuilder().setName('verificarvencidas').setDescription('Verifica ausências vencidas')
];

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Logado como ${c.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationGuildCommands(c.user.id, GUILD_ID), { body: commands });
    console.log('✅ Slash Commands prontos.');
  } catch (e) { console.error(e); }
});

// ==========================================
// 📨 COMANDOS POR MENSAGEM (!painel-...)
// ==========================================
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  if (message.content === '!painel-adv') {
    const advEmbed = new EmbedBuilder()
      .setColor('#EF4444')
      .setTitle('⚠️ REGISTRO DE ADVERTÊNCIAS DISCIPLINARES')
      .setDescription(
        `🟡 **ADVERTÊNCIA LEVE:** Atrasos no ponto / Uniforme.\n` +
        `🟠 **ADVERTÊNCIA MÉDIA:** Desobediência rádio / Desrespeito.\n` +
        `🔴 **ADVERTÊNCIA GRAVE:** Cobrança errada / Abandono.\n\n` +
        `⛔ **3 Advertências = Exoneração.**`
      )
      .setImage(CONFIG_LS.bannerUrl);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_abrir_modal_adv').setLabel('Aplicar ADV').setStyle(ButtonStyle.Danger)
    );
    await message.channel.send({ embeds: [advEmbed], components: [row] });
  }

  if (message.content === '!painel-ausencia') {
    const ausenciaEmbed = new EmbedBuilder()
      .setColor(CONFIG_LS.corAusencia)
      .setTitle('🌴 REGISTRO DE AUSÊNCIAS (MÁX 5 DIAS)')
      .setDescription('Se for viajar ou se ausentar, registre aqui.\n\n⚠️ **Máximo 5 dias.** Se passar, será reprovado.')
      .setImage(CONFIG_LS.bannerUrl);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_abrir_modal_ausencia').setLabel('Registrar Ausência').setStyle(ButtonStyle.Primary)
    );
    await message.channel.send({ embeds: [ausenciaEmbed], components: [row] });
  }

  // AQUI ESTAVA O SEU ERRO (Linha 406): Corrigido para usar Crases (`)
  if (message.content === '!painel-registro' || message.content === '!registro') {
    const regEmbed = new EmbedBuilder()
      .setColor(CONFIG_LS.corLS)
      .setTitle('⚙️ REGISTRO & RECRUTAMENTO — LS CUSTOMS')
      .setDescription(
        `Bem-vindo à **Los Santos Customs**!\n\n` +
        `Deseja fazer parte da equipe oficial de mecânicos?\n` +
        `Clique no botão abaixo para preencher o formulário oficial de candidatura.\n\n` +
        `Após o envio, a Liderança da LS Customs avaliará sua candidatura!`
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
  }
});

// ==========================================
// 🖱️ TRATAMENTO DE INTERAÇÕES (MODAIS/BOTÕES)
// ==========================================
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isButton()) {
      if (interaction.customId === 'btn_iniciar_recrutamento') {
        const modal = new ModalBuilder().setCustomId('modal_recrutamento_oficial').setTitle('Candidatura LS Customs');
        
        const inputs = [
          new TextInputBuilder().setCustomId('rec_nome').setLabel('Nome Completo (RP)').setStyle(TextInputStyle.Short).setRequired(true),
          new TextInputBuilder().setCustomId('rec_passaporte').setLabel('ID / Passaporte').setStyle(TextInputStyle.Short).setRequired(true),
          new TextInputBuilder().setCustomId('rec_idade_disp').setLabel('Idade e Horários').setStyle(TextInputStyle.Short).setRequired(true),
          new TextInputBuilder().setCustomId('rec_exp').setLabel('Experiência').setStyle(TextInputStyle.Short).setRequired(true),
          new TextInputBuilder().setCustomId('rec_motivo_regras').setLabel('Por que a LS Customs?').setStyle(TextInputStyle.Paragraph).setRequired(true)
        ];

        inputs.forEach(i => modal.addComponents(new ActionRowBuilder().addComponents(i)));
        await interaction.showModal(modal);
      }
      
      // Lógica de aprovação/recusa básica para não dar erro
      if (interaction.customId.startsWith('aprovar_rec_')) {
        await interaction.reply({ content: `✅ Candidato aprovado!`, ephemeral: true });
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'modal_recrutamento_oficial') {
        await interaction.reply({ content: '✅ Candidatura enviada com sucesso!', ephemeral: true });
        
        // Log simples no canal de recrutamento
        const canalLogs = client.channels.cache.get(CONFIG_LS.canalLogsRecrutamentoId);
        if (canalLogs) {
           const log = new EmbedBuilder()
            .setTitle("Nova Candidatura")
            .setColor(CONFIG_LS.corLS)
            .addFields(
              { name: 'Usuário', value: `<@${interaction.user.id}>` },
              { name: 'Nome', value: interaction.fields.getTextInputValue('rec_nome') }
            );
           await canalLogs.send({ embeds: [log] });
        }
      }
    }
  } catch (err) {
    console.error('Erro na interação:', err);
  }
});

client.login(DISCORD_TOKEN);
