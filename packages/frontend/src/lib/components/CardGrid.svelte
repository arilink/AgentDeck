<script lang="ts">
  import { agentsList } from '$lib/stores/agents';
  import { displayMode } from '$lib/stores/display';
  import AgentCard from './AgentCard.svelte';
  import InfoCard from './InfoCard.svelte';

  const AGENT_SLOTS_BY_MODE = { standard: 5, compact: 4, mini: 3 } as const;

  const agentSlots = $derived(AGENT_SLOTS_BY_MODE[$displayMode]);
  const visible = $derived($agentsList.slice(0, agentSlots));
  const totalCols = $derived(1 + agentSlots);
</script>

<section class="grid" style:--cols={totalCols}>
  <InfoCard />

  {#each visible as agent (agent.id)}
    <AgentCard {agent} />
  {/each}

  {#each Array(Math.max(0, agentSlots - visible.length)) as _, i (i)}
    <div class="placeholder" aria-hidden="true"></div>
  {/each}
</section>

<style>
  .grid {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    gap: 16px;
    padding: 16px 24px;
  }
  .placeholder {
    background: transparent;
    border: 1px dashed color-mix(in srgb, var(--card-border) 80%, transparent);
    border-radius: var(--card-radius);
    opacity: 0.45;
  }
</style>
