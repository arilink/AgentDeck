<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { AgentRecord } from '$lib/stores/agents';
  import { agentToLuluState, type LuluState } from '$lib/util/mascot-state';

  interface Props {
    agent: AgentRecord;
  }

  const { agent }: Props = $props();

  const BASE = `${import.meta.env.BASE_URL}mascot/lulu`;

  // Pure passthrough: render whatever state the backend says. The done→idle
  // 60s drift is owned by the backend state machine (state.ts armIdleTimer),
  // so this component holds no timers — it just mirrors agent.state. This
  // keeps the mascot animation in lockstep with the card's status text/colour.
  const displayState = $derived<LuluState>(agentToLuluState(agent));

  // `done` plays once; every other state loops. Chromium freezes the last
  // frame after a non-looping `<video>` ends, which holds Lulu's celebrate
  // pose for the duration of `done` (until the backend drifts it to idle).
  const isLoop = (s: LuluState) => s !== 'done';
</script>

{#key displayState}
  <div class="frame" in:fade={{ duration: 200 }} out:fade={{ duration: 120 }}>
    <video
      class="lulu"
      poster="{BASE}/poster/{displayState}.jpg"
      loop={isLoop(displayState)}
      autoplay
      muted
      playsinline
      preload="auto"
    >
      <source src="{BASE}/webm/{displayState}.webm" type="video/webm" />
      <source src="{BASE}/mp4/{displayState}.mp4" type="video/mp4" />
    </video>
  </div>
{/key}

<style>
  .frame {
    position: absolute;
    inset: 0;
  }
  .lulu {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
</style>
