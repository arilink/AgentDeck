<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { AgentState } from '$lib/protocol/schema';
  import type { AgentRecord } from '$lib/stores/agents';
  import MascotIcon from './MascotIcon.svelte';
  import LuluMascot from './mascot/lulu/LuluMascot.svelte';
  import Idle from './mascot/penguin/Idle.svelte';
  import Thinking from './mascot/penguin/Thinking.svelte';
  import ToolUse from './mascot/penguin/ToolUse.svelte';
  import Waiting from './mascot/penguin/Waiting.svelte';
  import Done from './mascot/penguin/Done.svelte';

  export type MascotVariant = 'icon' | 'penguin' | 'lulu';

  interface Props {
    state?: AgentState;
    variant?: MascotVariant;
    agent?: AgentRecord;
  }

  const { state, variant = 'icon', agent }: Props = $props();
  const resolvedState = $derived<AgentState>(state ?? agent?.state ?? 'idle');
</script>

<div class="mascot">
  {#if variant === 'lulu' && agent}
    <LuluMascot {agent} />
  {:else if variant === 'icon' || !agent}
    <MascotIcon state={resolvedState} />
  {:else}
    {#key resolvedState}
      <div class="pose" in:fade={{ duration: 220 }} out:fade={{ duration: 140 }}>
        {#if resolvedState === 'idle'}
          <Idle />
        {:else if resolvedState === 'thinking'}
          <Thinking />
        {:else if resolvedState === 'tool_use'}
          <ToolUse />
        {:else if resolvedState === 'waiting'}
          <Waiting />
        {:else}
          <Done />
        {/if}
      </div>
    {/key}
  {/if}
</div>

<style>
  .mascot {
    position: relative;
    width: 100%;
    height: 100%;
    display: block;
  }
  .pose {
    position: absolute;
    inset: 0;
  }
</style>
