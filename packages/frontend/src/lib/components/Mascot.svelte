<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { AgentState } from '$lib/protocol/schema';
  import MascotIcon from './MascotIcon.svelte';
  import Idle from './mascot/penguin/Idle.svelte';
  import Thinking from './mascot/penguin/Thinking.svelte';
  import ToolUse from './mascot/penguin/ToolUse.svelte';
  import Waiting from './mascot/penguin/Waiting.svelte';
  import Done from './mascot/penguin/Done.svelte';

  export type MascotVariant = 'icon' | 'penguin';

  interface Props {
    state: AgentState;
    variant?: MascotVariant;
  }

  const { state, variant = 'icon' }: Props = $props();
</script>

<div class="mascot">
  {#if variant === 'icon'}
    <MascotIcon {state} />
  {:else}
    {#key state}
      <div class="pose" in:fade={{ duration: 220 }} out:fade={{ duration: 140 }}>
        {#if state === 'idle'}
          <Idle />
        {:else if state === 'thinking'}
          <Thinking />
        {:else if state === 'tool_use'}
          <ToolUse />
        {:else if state === 'waiting'}
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
