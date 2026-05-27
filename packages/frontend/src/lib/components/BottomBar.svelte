<script lang="ts">
  import { connectionStatus, type ConnectionStatus } from '$lib/stores/connection';
  import { viewport } from '$lib/stores/display';

  const statusText: Record<ConnectionStatus, string> = {
    connecting: 'connecting',
    connected: 'connected',
    disconnected: 'disconnected',
    version_mismatch: 'version mismatch',
    mock: 'mock mode',
  };

  const statusColor: Record<ConnectionStatus, string> = {
    connecting: 'var(--c-waiting)',
    connected: 'var(--c-done)',
    disconnected: 'var(--text-faint)',
    version_mismatch: 'var(--c-waiting)',
    mock: 'var(--c-thinking)',
  };
</script>

<footer class="bottom">
  <div class="left">
    <span class="key"><span class="kbd">⌘⇧Y</span> approve</span>
    <span class="key"><span class="kbd">⌘⇧N</span> deny</span>
    <span class="key"><span class="kbd">⌘⇧1-6</span> select</span>
  </div>

  <div class="right">
    <span class="conn" style:--c={statusColor[$connectionStatus]}>
      <span class="dot"></span>
      {statusText[$connectionStatus]}
    </span>
    <span class="sep">·</span>
    <span class="size">{$viewport.width}×{$viewport.height}</span>
  </div>
</footer>

<style>
  .bottom {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 22px 12px;
    font-size: 11px;
    color: var(--text-dim);
  }
  .left {
    display: flex;
    gap: 14px;
    font-family: var(--font-mono);
  }
  .key {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .kbd {
    color: var(--text);
  }
  .right {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-mono);
  }
  .conn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--c, var(--text-dim));
  }
  .conn .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--c, var(--text-faint));
    box-shadow: 0 0 6px var(--c, transparent);
  }
  .sep {
    color: var(--text-faint);
  }
  .size {
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }
</style>
