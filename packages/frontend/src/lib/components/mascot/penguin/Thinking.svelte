<script lang="ts"></script>

<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <!-- ground glow -->
  <ellipse cx="100" cy="124" rx="48" ry="5" fill="#191925" />

  <!-- penguin standing, head tilted up -->
  <g class="penguin">
    <!-- feet -->
    <ellipse cx="90" cy="125" rx="6" ry="2.5" fill="#f59e0b" />
    <ellipse cx="110" cy="125" rx="6" ry="2.5" fill="#f59e0b" />
    <!-- body -->
    <path d="M70 122 Q70 80 100 70 Q130 80 130 122 Z" fill="#101015" />
    <!-- belly -->
    <ellipse cx="100" cy="108" rx="18" ry="22" fill="#f5f5f0" />
    <!-- head tilted -->
    <ellipse cx="100" cy="60" rx="22" ry="20" fill="#101015" />
    <!-- eyes looking up -->
    <ellipse cx="91" cy="56" rx="2.6" ry="3" fill="#f5f5f0" />
    <ellipse cx="109" cy="56" rx="2.6" ry="3" fill="#f5f5f0" />
    <circle cx="91" cy="55" r="1.2" fill="#0a0a0b" />
    <circle cx="109" cy="55" r="1.2" fill="#0a0a0b" />
    <!-- beak -->
    <polygon points="97,64 103,64 100,70" fill="#f59e0b" />
    <!-- flippers -->
    <path d="M72 92 Q62 104 70 116 Q76 110 76 100 Z" fill="#0a0a0b" />
    <path d="M128 92 Q138 104 130 116 Q124 110 124 100 Z" fill="#0a0a0b" />
  </g>

  <!-- thought bubble -->
  <g class="bubble">
    <circle cx="148" cy="48" r="3" fill="none" stroke="#7c7cf0" stroke-width="1.4" stroke-dasharray="2 1.5" />
    <circle cx="156" cy="38" r="4.5" fill="none" stroke="#7c7cf0" stroke-width="1.4" stroke-dasharray="2 1.5" />
    <circle cx="168" cy="26" r="13" fill="none" stroke="#7c7cf0" stroke-width="1.5" stroke-dasharray="3 2" />
    <text x="168" y="30" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="14" fill="#7c7cf0" font-weight="700">?</text>
  </g>
</svg>

<style>
  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
  .bubble {
    transform-origin: 168px 26px;
    animation: breath 2.6s ease-in-out infinite;
  }
  @keyframes breath {
    0%, 100% { transform: scale(1);    opacity: 0.85; }
    50%      { transform: scale(1.08); opacity: 1; }
  }
</style>
