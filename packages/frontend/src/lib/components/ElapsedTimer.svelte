<script lang="ts">
  import { onMount } from 'svelte';
  import { formatElapsed } from '$lib/util/time';

  interface Props {
    startMs: number;
  }

  const { startMs }: Props = $props();

  let now = $state(Date.now());

  onMount(() => {
    const id = setInterval(() => {
      now = Date.now();
    }, 1000);
    return () => clearInterval(id);
  });

  const text = $derived(formatElapsed(now - startMs));
</script>

<span class="timer">{text}</span>

<style>
  .timer {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }
</style>
