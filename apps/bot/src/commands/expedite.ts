import type { ChatInputCommandInteraction } from 'discord.js';
import type { BagimonRepository, MoodTransitionsRepository } from '@bagimon/db';
import { resolveBagimon } from '../lib/resolve-bagimon.js';

// Dev-only: force a Bagimon into a state where the next mood-loop tick will
// kill it. Registered only when ENABLE_EXPEDITE=true.
const BACKDATE_DAYS = 14.1;

export async function handleExpedite(
  interaction: ChatInputCommandInteraction,
  repo: BagimonRepository,
  transitions: MoodTransitionsRepository,
): Promise<void> {
  if (process.env.ENABLE_EXPEDITE !== 'true') {
    await interaction.reply({ content: 'Disabled.', ephemeral: true });
    return;
  }
  if (!interaction.guildId) {
    await interaction.reply({ content: 'Run this in a server.', ephemeral: true });
    return;
  }
  const mint = interaction.options.getString('mint', true);
  const result = await resolveBagimon(repo, interaction.guildId, mint);
  if (result.kind !== 'found') {
    await interaction.reply({ content: `No Bagimon for mint ${mint}.`, ephemeral: true });
    return;
  }
  const { bagimon } = result;
  if (!bagimon.is_alive) {
    await interaction.reply({ content: 'Already dead.', ephemeral: true });
    return;
  }

  if (bagimon.current_mood !== 'dying') {
    await repo.updateMood(bagimon.id, 'dying', 'expedite_dev');
  }
  await transitions.backdateDyingTransitions(
    bagimon.id,
    new Date(Date.now() - BACKDATE_DAYS * 86_400_000),
  );

  await interaction.reply({
    content: `:fast_forward: Expedited. Next mood-loop tick will kill ${bagimon.coin_symbol ? `$${bagimon.coin_symbol}` : 'this Bagimon'}.`,
    ephemeral: true,
  });
}
