<script lang="ts"></script>

<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <!-- ground -->
  <ellipse cx="100" cy="118" rx="64" ry="6" fill="#1a1a20" />
  <!-- pillow -->
  <ellipse cx="100" cy="110" rx="56" ry="10" fill="#23232a" />

  <!-- penguin lying down: body horizontal -->
  <g class="penguin">
    <!-- body -->
    <ellipse cx="100" cy="98" rx="48" ry="14" fill="#101015" stroke="#0a0a0b" stroke-width="0.5" />
    <!-- belly -->
    <ellipse cx="106" cy="101" rx="32" ry="8" fill="#f5f5f0" />
    <!-- head turned sideways -->
    <ellipse cx="58" cy="94" rx="16" ry="13" fill="#101015" />
    <!-- closed eye horizontal line -->
    <line x1="50" y1="93" x2="58" y2="93" stroke="#f5f5f0" stroke-width="1.6" stroke-linecap="round" />
    <!-- beak resting -->
    <polygon points="44,95 50,93 50,97" fill="#f59e0b" />
    <!-- flipper resting on body -->
    <path d="M118 95 Q132 92 140 100 Q132 102 122 100 Z" fill="#0a0a0b" />
    <!-- feet tucked -->
    <ellipse cx="145" cy="108" rx="5" ry="2.5" fill="#f59e0b" />
  </g>

  <!-- zZz floating -->
  <g class="zzz">
    <text x="40" y="58" font-family="JetBrains Mono, monospace" font-size="11" fill="#6a6a76" font-weight="700" class="z z1">z</text>
    <text x="30" y="46" font-family="JetBrains Mono, monospace" font-size="13" fill="#6a6a76" font-weight="700" class="z z2">Z</text>
    <text x="18" y="32" font-family="JetBrains Mono, monospace" font-size="15" fill="#6a6a76" font-weight="700" class="z z3">z</text>
  </g>
</svg>

<style>
  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
  .z {
    opacity: 0;
    animation: float 3.6s ease-in-out infinite;
  }
  .z1 { animation-delay: 0s; }
  .z2 { animation-delay: 1.2s; }
  .z3 { animation-delay: 2.4s; }
  @keyframes float {
    0%   { transform: translateY(0); opacity: 0; }
    15%  { opacity: 1; }
    80%  { opacity: 0.7; }
    100% { transform: translateY(-18px); opacity: 0; }
  }
</style>
