<script lang="ts">
  import { agentStats } from '$lib/stores/stats';
</script>

<header class="top">
  <div class="left">
    <span class="brand-dot"></span>
    <span class="brand">AGENTDECK</span>
    <span class="sep">|</span>
    <span class="stat stat-running">
      <span class="dot"></span>
      <span class="num">{$agentStats.running}</span>
      <span class="lbl">running</span>
    </span>
    <span class="stat stat-waiting">
      <span class="dot"></span>
      <span class="num">{$agentStats.waiting}</span>
      <span class="lbl">waiting</span>
    </span>
    <span class="stat stat-done">
      <span class="dot"></span>
      <span class="num">{$agentStats.done}</span>
      <span class="lbl">done</span>
    </span>
    <span class="stat stat-idle">
      <span class="dot"></span>
      <span class="num">{$agentStats.idle}</span>
      <span class="lbl">idle</span>
    </span>
  </div>

  <div class="right">
    <span class="meta">↑34K ↓127K tok</span>
    <span class="meta-sep">·</span>
    <span class="meta">$0.42 today</span>
    <span class="meta-sep">·</span>
    <span class="meta">2.3K tok/s</span>
  </div>
</header>

<style>
  .top {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 22px 10px;
    font-size: 12px;
  }
  .left {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .brand-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--c-tool);
    box-shadow: 0 0 10px var(--c-tool);
  }
  .brand {
    font-family: var(--font-mono);
    font-weight: 700;
    letter-spacing: 0.18em;
    color: var(--text);
    font-size: 13px;
  }
  .sep {
    color: var(--text-faint);
  }
  .stat {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono);
    color: var(--text-dim);
  }
  .stat .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--c, var(--text-faint));
  }
  .stat .num {
    color: var(--text);
    font-weight: 700;
  }
  .stat .lbl {
    color: var(--text-dim);
  }
  .stat-running   { --c: var(--c-tool); }
  .stat-waiting   { --c: var(--c-waiting); }
  .stat-done      { --c: var(--c-done); }
  .stat-idle      { --c: var(--text-faint); }
  .stat-idle .num { color: var(--text-dim); }

  .right {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-dim);
    font-family: var(--font-mono);
  }
  .meta-sep {
    color: var(--text-faint);
  }
</style>
