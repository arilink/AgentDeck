<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { AgentState } from '$lib/protocol/schema';

  interface Props {
    state: AgentState;
  }

  const { state }: Props = $props();
</script>

<div class="mascot state-{state}">
  {#key state}
    <div class="content" in:fade={{ duration: 220 }} out:fade={{ duration: 140 }}>
      {#if state === 'done'}
        <div class="sparks">
          {#each Array(7) as _, i}
            <span class="spark spark-{i}"></span>
          {/each}
        </div>
        <div class="orb done"></div>
      {:else}
        <div class="orb"></div>
        {#if state === 'idle'}
          <div class="glyph idle-glyph">zZz</div>
        {:else if state === 'thinking'}
          <div class="glyph">?</div>
        {:else if state === 'tool_use'}
          <div class="glyph">&lt;&gt;</div>
        {:else if state === 'waiting'}
          <div class="glyph waiting-glyph">!</div>
        {/if}
      {/if}
    </div>
  {/key}
</div>

<style>
  .mascot {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .content {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 6px;
  }

  .orb {
    width: clamp(56px, 32%, 96px);
    aspect-ratio: 1;
    border-radius: 50%;
    background: radial-gradient(
      circle at 35% 32%,
      color-mix(in srgb, var(--orb-c) 80%, white 20%),
      var(--orb-c) 55%,
      color-mix(in srgb, var(--orb-c) 60%, black 40%) 100%
    );
    box-shadow:
      0 0 18px -2px color-mix(in srgb, var(--orb-c) 70%, transparent),
      inset 0 0 14px color-mix(in srgb, var(--orb-c) 55%, black 45%);
  }

  .state-idle      { --orb-c: #2a2a2e; }
  .state-thinking  { --orb-c: var(--c-thinking); }
  .state-tool_use  { --orb-c: var(--c-tool); }
  .state-waiting   { --orb-c: var(--c-waiting); }
  .state-done      { --orb-c: var(--c-done); }

  .state-idle .orb {
    box-shadow: inset 0 0 14px #000;
  }

  .state-thinking .orb,
  .state-tool_use .orb,
  .state-done .orb {
    animation: orb-breathe 3.2s ease-in-out infinite;
  }
  .state-waiting .orb {
    animation: orb-pulse 0.9s ease-in-out infinite;
  }
  @keyframes orb-breathe {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.04); }
  }
  @keyframes orb-pulse {
    0%, 100% { transform: scale(1);    box-shadow: 0 0 18px -2px color-mix(in srgb, var(--orb-c) 70%, transparent), inset 0 0 14px color-mix(in srgb, var(--orb-c) 55%, black 45%); }
    50%      { transform: scale(1.06); box-shadow: 0 0 26px 0px color-mix(in srgb, var(--orb-c) 95%, transparent), inset 0 0 14px color-mix(in srgb, var(--orb-c) 60%, black 40%); }
  }

  .glyph {
    font-family: var(--font-mono);
    font-size: clamp(18px, 3.6vw, 30px);
    font-weight: 700;
    color: var(--orb-c);
    line-height: 1;
    margin-top: 6px;
  }
  .state-idle .glyph {
    color: var(--text-faint);
    font-size: clamp(16px, 3vw, 26px);
    letter-spacing: 0.05em;
    animation: idle-float 3.2s ease-in-out infinite;
  }
  @keyframes idle-float {
    0%, 100% { opacity: 0.6; transform: translateY(0); }
    50%      { opacity: 0.95; transform: translateY(-3px); }
  }
  .state-waiting .glyph {
    animation: waiting-bounce 0.7s ease-in-out infinite;
  }
  @keyframes waiting-bounce {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-4px); }
  }

  .sparks {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .spark {
    position: absolute;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--c-done);
    box-shadow: 0 0 8px var(--c-done);
    opacity: 0.85;
    animation: spark-drift 2.4s ease-in-out infinite;
  }
  .spark-0 { top: 18%; left: 22%; animation-delay: 0s; }
  .spark-1 { top: 30%; left: 78%; animation-delay: 0.3s; }
  .spark-2 { top: 60%; left: 14%; animation-delay: 0.6s; }
  .spark-3 { top: 70%; left: 80%; animation-delay: 0.9s; }
  .spark-4 { top: 12%; left: 60%; animation-delay: 1.2s; }
  .spark-5 { top: 78%; left: 50%; animation-delay: 1.5s; }
  .spark-6 { top: 42%; left: 90%; animation-delay: 1.8s; }
  @keyframes spark-drift {
    0%, 100% { transform: translate(0, 0) scale(0.7);  opacity: 0.25; }
    50%      { transform: translate(0, -6px) scale(1); opacity: 0.95; }
  }
</style>
