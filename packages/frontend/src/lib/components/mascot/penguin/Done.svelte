<script lang="ts"></script>

<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <!-- ground glow green -->
  <ellipse cx="100" cy="124" rx="58" ry="5" fill="#0e2a22" />

  <!-- penguin both flippers raised celebration -->
  <g class="penguin">
    <!-- feet -->
    <ellipse cx="90" cy="125" rx="6" ry="2.5" fill="#f59e0b" />
    <ellipse cx="110" cy="125" rx="6" ry="2.5" fill="#f59e0b" />
    <!-- body slightly lifted -->
    <path d="M70 122 Q70 78 100 70 Q130 78 130 122 Z" fill="#101015" />
    <!-- belly -->
    <ellipse cx="100" cy="106" rx="18" ry="22" fill="#f5f5f0" />
    <!-- head -->
    <ellipse cx="100" cy="56" rx="22" ry="20" fill="#101015" />
    <!-- happy eyes (closed crescents) -->
    <path d="M86 56 Q91 52 96 56" stroke="#f5f5f0" stroke-width="1.8" stroke-linecap="round" fill="none" />
    <path d="M104 56 Q109 52 114 56" stroke="#f5f5f0" stroke-width="1.8" stroke-linecap="round" fill="none" />
    <!-- open smiling beak -->
    <polygon points="94,62 106,62 100,70" fill="#f59e0b" />
    <!-- both flippers raised -->
    <path d="M72 84 Q56 60 64 32 Q74 36 76 60 Q78 78 80 90 Z" fill="#0a0a0b" class="arm-l" />
    <path d="M128 84 Q144 60 136 32 Q126 36 124 60 Q122 78 120 90 Z" fill="#0a0a0b" class="arm-r" />
  </g>

  <!-- green sparkles -->
  <g class="sparks">
    <circle cx="40"  cy="46" r="3"   fill="#10b981" class="s s1" />
    <circle cx="160" cy="40" r="2.5" fill="#10b981" class="s s2" />
    <circle cx="30"  cy="84" r="2"   fill="#10b981" class="s s3" />
    <circle cx="172" cy="76" r="3"   fill="#10b981" class="s s4" />
    <circle cx="56"  cy="22" r="2"   fill="#10b981" class="s s5" />
    <circle cx="148" cy="20" r="2.5" fill="#10b981" class="s s6" />
  </g>
</svg>

<style>
  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
  .s {
    animation: drift 2.4s ease-in-out infinite;
    opacity: 0;
  }
  .s1 { animation-delay: 0.0s; }
  .s2 { animation-delay: 0.4s; }
  .s3 { animation-delay: 0.8s; }
  .s4 { animation-delay: 1.2s; }
  .s5 { animation-delay: 1.6s; }
  .s6 { animation-delay: 2.0s; }
  @keyframes drift {
    0%   { opacity: 0; transform: translateY(8px) scale(0.6); }
    30%  { opacity: 1; transform: translateY(0)   scale(1); }
    80%  { opacity: 0.7; }
    100% { opacity: 0; transform: translateY(-12px) scale(0.9); }
  }
  .arm-l, .arm-r {
    transform-origin: center;
    animation: cheer 1.0s ease-in-out infinite alternate;
  }
  .arm-r { animation-delay: 0.2s; }
  @keyframes cheer {
    from { transform: translateY(0)    rotate(0); }
    to   { transform: translateY(-2px) rotate(-3deg); }
  }
</style>
