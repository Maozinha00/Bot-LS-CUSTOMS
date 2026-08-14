/**
 * ============================================================================
 * 🔧 BOT OFICIAL UNIFICADO & MODULAR — LS CUSTOMS
 * ARQUIVO PRINCIPAL: index.js
 * ============================================================================
 */

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

// ============================================================================
// 📦 MÓDULOS
// ============================================================================

const { configLS, db } = require('./database');
const eventos = require('./eventos');
const recrutamento = require('./recrutamento');
const ponto = require('./ponto');
const ausencia = require('./ausencia');
const advertencias = require('./advertencias');

// ============================================================================
// 🔑 CONFIGURAÇÕES
// ============================================================================

const DISCORD_TOKEN =
  process.env.DISCORD_TOKEN ||
  process.env.TOKEN ||
  '';

const GUILD_ID =
  process.env.GUILD_ID ||
  '1535806745816072245';

const PORT = process.env.PORT || 3000;

// ============================================================================
// 🔐 CARGOS AUTORIZADOS PARA COMANDOS /
// ============================================================================

const CARGO_LIDER = '1536304130367299604';
const CARGO_VICE_LIDER = '1536304131294101584';

/**
 * Verifica se o membro pode utilizar comandos Slash.
 *
 * SOMENTE:
 * 👑 LÍDER
 * ⭐ VICE-LÍDER
 */
function podeUsarComandosSlash(interaction) {
  try {
    if (!interaction.guild || !interaction.member) {
      return false;
    }

    return (
      interaction.member.roles.cache.has(CARGO_LIDER) ||
      interaction.member.roles.cache.has(CARGO_VICE_LIDER)
    );
  } catch (error) {
    console.error(
      '⚠️ [PERMISSÃO] Erro ao verificar cargos:',
      error.message
    );

    return false;
  }
}

// ============================================================================
// 🛡️ ANTI-CRASH
// ============================================================================

process.on('unhandledRejection', (reason) => {
  console.error(
    '⚠️ [ANTI-CRASH REJECTION]:',
    reason && reason.message
      ? reason.message
      : reason
  );
});

process.on('uncaughtException', (err) => {
  console.error(
    '💥 [ANTI-CRASH EXCEPTION]:',
    err && err.message
      ? err.message
      : err
  );
});

// ============================================================================
// 🤖 CLIENT DISCORD
// ============================================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],

  partials: [
    Partials.Channel,
    Partials.GuildMember,
    Partials.User
  ]
});

// ============================================================================
// ⚡ SLASH COMMANDS
// ============================================================================

const commands = [

  new SlashCommandBuilder()
    .setName('painelevento')
    .setDescription(
      'Envia o Painel Oficial do Evento Automotivo'
    ),

  new SlashCommandBuilder()
    .setName('paineladv')
    .setDescription(
      'Envia o Painel Oficial de Advertências'
    ),

  new SlashCommandBuilder()
    .setName('painelausencia')
    .setDescription(
      'Envia o Painel Oficial de Ausências'
    ),

  new SlashCommandBuilder()
    .setName('painelregistro')
    .setDescription(
      'Envia o Painel Oficial de Recrutamento'
    ),

  new SlashCommandBuilder()
    .setName('painelponto')
    .setDescription(
      'Envia o Painel Oficial de Bate-Ponto'
    ),

  new SlashCommandBuilder()
    .setName('tabela')
    .setDescription(
      'Exibe a tabela oficial de serviços'
    ),

  new SlashCommandBuilder()
    .setName('radio')
    .setDescription(
      'Exibe a frequência oficial de rádio'
    )

].map(command => command.toJSON());

// ============================================================================
// 🟢 BOT ONLINE
// ============================================================================

client.once(Events.ClientReady, async (c) => {

  console.log('========================================================');
  console.log(
    `✅ [LS CUSTOMS BOT] Online como ${c.user.tag}`
  );

  console.log(
    '📁 Módulos: eventos, recrutamento, ponto, ausencia, advertencias, database'
  );

  console.log(
    `🏁 Canal do Evento: #${configLS.canalEventoId}`
  );

  console.log('========================================================');

  try {

    if (
      DISCORD_TOKEN &&
      DISCORD_TOKEN !== 'SEU_TOKEN_AQUI'
    ) {

      const rest = new REST({
        version: '10'
      }).setToken(DISCORD_TOKEN);

      await rest.put(
        Routes.applicationGuildCommands(
          c.user.id,
          GUILD_ID
        ),
        {
          body: commands
        }
      );

      console.log(
        '✅ [SLASH COMMANDS] Registrados com sucesso!'
      );
    }

  } catch (error) {

    console.error(
      '⚠️ [COMANDOS] Erro ao registrar:',
      error && error.message
        ? error.message
        : error
    );
  }
});

// ============================================================================
// 📨 COMANDOS POR PREFIXO
// ============================================================================

client.on(
  Events.MessageCreate,
  async (message) => {

    try {

      if (message.author.bot) return;

      const content =
        message.content.toLowerCase();

      // ==========================================================
      // 🔐 VERIFICAÇÃO DOS COMANDOS !
      // ==========================================================

      const comandosPrefixoPermitidos = [
        '!painel-evento',
        '!evento',
        '!painel-adv',
        '!adv',
        '!painel-ausencia',
        '!ausencia',
        '!painel-ponto',
        '!ponto',
        '!painel-recrutamento',
        '!recrutamento',
        '!registro',
        '!radio'
      ];

      if (
        comandosPrefixoPermitidos.includes(content)
      ) {

        const membro = message.member;

        const autorizado =
          membro &&
          (
            membro.roles.cache.has(CARGO_LIDER) ||
            membro.roles.cache.has(CARGO_VICE_LIDER)
          );

        if (!autorizado) {

          return message.reply(
            '🚫 **ACESSO NEGADO!**\n\n' +
            'Apenas **👑 LÍDER** e **⭐ VICE-LÍDER** podem utilizar os comandos da LS Customs.'
          );
        }
      }

      // ==========================================================
      // 🏁 PAINEL EVENTO
      // ==========================================================

      if (
        content === '!painel-evento' ||
        content === '!evento'
      ) {

        const canalEvento =
          client.channels.cache.get(
            configLS.canalEventoId
          ) || message.channel;

        const embed =
          eventos.gerarEmbedPainelEvento();

        const rows =
          eventos.gerarBotoesPainelEvento();

        const msg =
          await canalEvento.send({
            embeds: [embed],
            components: rows
          });

        db.eventoConfig.painelMessageId =
          msg.id;

        if (
          canalEvento.id !== message.channel.id
        ) {

          await message.reply(
            `✅ Painel do Evento Automotivo publicado em <#${configLS.canalEventoId}>!`
          );
        }

        return;
      }

      // ==========================================================
      // ⚠️ PAINEL ADV
      // ==========================================================

      if (
        content === '!painel-adv' ||
        content === '!adv'
      ) {

        const {
          embeds,
          components
        } =
          advertencias.gerarPainelAdvertencia();

        const canal =
          client.channels.cache.get(
            configLS.canalAdvId
          ) || message.channel;

        await canal.send({
          embeds,
          components
        });

        return;
      }

      // ==========================================================
      // 🕐 PAINEL AUSÊNCIA
      // ==========================================================

      if (
        content === '!painel-ausencia' ||
        content === '!ausencia'
      ) {

        const {
          embeds,
          components
        } =
          ausencia.gerarPainelAusencia();

        const canal =
          client.channels.cache.get(
            configLS.canalPainelAusenciaId
          ) || message.channel;

        await canal.send({
          embeds,
          components
        });

        return;
      }

      // ==========================================================
      // ⏱️ PAINEL PONTO
      // ==========================================================

      if (
        content === '!painel-ponto' ||
        content === '!ponto'
      ) {

        const {
          embeds,
          components
        } =
          ponto.gerarPainelPonto();

        const canal =
          client.channels.cache.get(
            configLS.canalPontoId
          ) || message.channel;

        await canal.send({
          embeds,
          components
        });

        return;
      }

      // ==========================================================
      // 📝 RECRUTAMENTO
      // ==========================================================

      if (
        content === '!painel-recrutamento' ||
        content === '!recrutamento' ||
        content === '!registro'
      ) {

        const {
          embeds,
          components
        } =
          recrutamento.gerarPainelRecrutamento();

        await message.channel.send({
          embeds,
          components
        });

        return;
      }

      // ==========================================================
      // 📻 RÁDIO
      // ==========================================================

      if (content === '!radio') {

        await message.reply(
          `📻 **Frequência Oficial da LS Customs:** \`${configLS.radioFreq}\` MHz`
        );

        return;
      }

    } catch (err) {

      console.error(
        '⚠️ [MESSAGE ERROR]:',
        err && err.message
          ? err.message
          : err
      );
    }
  }
);

// ============================================================================
// 🖱️ ROTEADOR DE INTERAÇÕES
// ============================================================================

client.on(
  Events.InteractionCreate,
  async (interaction) => {

    try {

      // ==========================================================
      // 🔐 SLASH COMMANDS — SOMENTE LÍDER / VICE-LÍDER
      // ==========================================================

      if (
        interaction.isChatInputCommand()
      ) {

        if (
          !podeUsarComandosSlash(interaction)
        ) {

          return await interaction.reply({
            content:
              '🚫 **ACESSO NEGADO**\n\n' +
              'Você não possui permissão para utilizar os comandos da **LS CUSTOMS**.\n\n' +
              '👑 **LÍDER** ou ⭐ **VICE-LÍDER** são necessários.',
            ephemeral: true
          });
        }

        const cmd =
          interaction.commandName;

        // ========================================================
        // 🏁 EVENTO
        // ========================================================

        if (
          cmd === 'painelevento'
        ) {

          const canal =
            client.channels.cache.get(
              configLS.canalEventoId
            ) || interaction.channel;

          const embed =
            eventos.gerarEmbedPainelEvento();

          const rows =
            eventos.gerarBotoesPainelEvento();

          const msg =
            await canal.send({
              embeds: [embed],
              components: rows
            });

          db.eventoConfig.painelMessageId =
            msg.id;

          return await interaction.reply({
            content:
              `✅ Painel do Evento Automotivo publicado em <#${configLS.canalEventoId}>!`,
            ephemeral: true
          });
        }

        // ========================================================
        // ⚠️ ADVERTÊNCIAS
        // ========================================================

        if (
          cmd === 'paineladv'
        ) {

          const canal =
            client.channels.cache.get(
              configLS.canalAdvId
            ) || interaction.channel;

          const {
            embeds,
            components
          } =
            advertencias.gerarPainelAdvertencia();

          await canal.send({
            embeds,
            components
          });

          return await interaction.reply({
            content:
              '✅ Painel de Advertências publicado!',
            ephemeral: true
          });
        }

        // ========================================================
        // 🕐 AUSÊNCIAS
        // ========================================================

        if (
          cmd === 'painelausencia'
        ) {

          const canal =
            client.channels.cache.get(
              configLS.canalPainelAusenciaId
            ) || interaction.channel;

          const {
            embeds,
            components
          } =
            ausencia.gerarPainelAusencia();

          await canal.send({
            embeds,
            components
          });

          return await interaction.reply({
            content:
              '✅ Painel de Ausências publicado!',
            ephemeral: true
          });
        }

        // ========================================================
        // ⏱️ PONTO
        // ========================================================

        if (
          cmd === 'painelponto'
        ) {

          const canal =
            client.channels.cache.get(
              configLS.canalPontoId
            ) || interaction.channel;

          const {
            embeds,
            components
          } =
            ponto.gerarPainelPonto();

          await canal.send({
            embeds,
            components
          });

          return await interaction.reply({
            content:
              '✅ Painel de Bate-Ponto publicado!',
            ephemeral: true
          });
        }

        // ========================================================
        // 📝 RECRUTAMENTO
        // ========================================================

        if (
          cmd === 'painelregistro'
        ) {

          const {
            embeds,
            components
          } =
            recrutamento.gerarPainelRecrutamento();

          await interaction.channel.send({
            embeds,
            components
          });

          return await interaction.reply({
            content:
              '✅ Painel de Recrutamento publicado!',
            ephemeral: true
          });
        }

        // ========================================================
        // 📊 TABELA
        // ========================================================

        if (
          cmd === 'tabela'
        ) {

          if (
            typeof configLS.tabelaServicos === 'string'
          ) {

            return await interaction.reply({
              content:
                configLS.tabelaServicos,
              ephemeral: true
            });

          }

          return await interaction.reply({
            content:
              '📋 **Tabela de serviços da LS Customs.**',
            ephemeral: true
          });
        }

        // ========================================================
        // 📻 RÁDIO
        // ========================================================

        if (
          cmd === 'radio'
        ) {

          return await interaction.reply({
            content:
              `📻 **Frequência Oficial LS Customs:** \`${configLS.radioFreq}\` MHz`,
            ephemeral: true
          });
        }

        return;
      }

      // ==========================================================
      // 🎛️ BOTÕES / MODAIS
      // ==========================================================

      const customId =
        interaction.customId || '';

      // ==========================================================
      // 🏁 EVENTOS
      // ==========================================================

      if (
        customId.startsWith('btn_ev_') ||
        customId.startsWith('modal_ev_')
      ) {

        return await eventos.tratarInteracaoEvento(
          interaction,
          client
        );
      }

      // ==========================================================
      // 📝 RECRUTAMENTO
      // ==========================================================

      if (
        customId.startsWith('btn_rec_') ||
        customId.startsWith('modal_rec_')
      ) {

        return await recrutamento.tratarInteracaoRecrutamento(
          interaction,
          client
        );
      }

      // ==========================================================
      // ⏱️ PONTO
      // ==========================================================

      if (
        customId.startsWith('btn_ponto_')
      ) {

        return await ponto.tratarInteracaoPonto(
          interaction,
          client
        );
      }

      // ==========================================================
      // 🕐 AUSÊNCIAS
      // ==========================================================

      if (
        customId.startsWith('btn_aus_') ||
        customId.startsWith('modal_aus_')
      ) {

        return await ausencia.tratarInteracaoAusencia(
          interaction,
          client
        );
      }

      // ==========================================================
      // ⚠️ ADVERTÊNCIAS
      // ==========================================================

      if (
        customId.startsWith('btn_adv_') ||
        customId.startsWith('modal_adv_')
      ) {

        return await advertencias.tratarInteracaoAdvertencia(
          interaction,
          client
        );
      }

    } catch (err) {

      console.error(
        '❌ [INTERACTION ROUTER ERROR]:',
        err && err.message
          ? err.message
          : err
      );

      // Evita erro "Interaction already replied"
      try {

        if (
          interaction.isRepliable() &&
          !interaction.replied &&
          !interaction.deferred
        ) {

          await interaction.reply({
            content:
              '❌ Ocorreu um erro ao processar esta interação.',
            ephemeral: true
          });

        }

      } catch (e) {
        // Ignora erro secundário
      }
    }
  }
);

// ============================================================================
// 🌐 SERVIDOR HTTP — HOSTINGS COMO RAILWAY/RENDER
// ============================================================================

const server = http.createServer(
  (req, res) => {

    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8'
    });

    res.end(
      '🟢 LS Customs Bot Online!'
    );
  }
);

server.listen(PORT, () => {

  console.log(
    `🌐 [HTTP] Servidor ativo na porta ${PORT}`
  );

});

// ============================================================================
// 🚀 LOGIN
// ============================================================================

if (
  DISCORD_TOKEN &&
  DISCORD_TOKEN !== 'SEU_TOKEN_AQUI'
) {

  client.login(DISCORD_TOKEN)
    .then(() => {

      console.log(
        '🔐 [LOGIN] Conexão com Discord iniciada.'
      );

    })
    .catch((err) => {

      console.error(
        '❌ [LOGIN FAILED]:',
        err && err.message
          ? err.message
          : err
      );

    });

} else {

  console.error(
    '❌ [CONFIG] DISCORD_TOKEN não configurado.'
  );

}

// ============================================================================
// 📤 EXPORT
// ============================================================================

module.exports = {
  client,
  db,
  configLS
};
