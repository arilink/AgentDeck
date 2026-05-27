<script lang="ts">
  import { onMount } from 'svelte';
  import CardGrid from '$lib/components/CardGrid.svelte';
  import { connect, disconnect } from '$lib/ws/client';
  import { startMock, stopMock } from '$lib/mock/inMemory';
  import { displayMode } from '$lib/stores/display';

  const isMock = new URLSearchParams(window.location.search).get('mock') === '1';

  onMount(() => {
    if (isMock) {
      startMock();
      return () => stopMock();
    }
    connect();
    return () => disconnect();
  });
</script>

<div class="shell mode-{$displayMode}">
  <CardGrid />
</div>

<style>
  .shell {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: var(--bg);
    -webkit-app-region: drag;
  }
  .shell :global(.grid) {
    -webkit-app-region: no-drag;
  }
</style>
