<script lang="ts"></script>

<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <!-- desk shadow -->
  <ellipse cx="100" cy="128" rx="70" ry="5" fill="#191925" />

  <!-- monitor behind, glowing teal -->
  <g class="monitor">
    <rect x="50" y="74" width="100" height="34" rx="3" fill="#0a0a0b" stroke="#2dd4bf" stroke-width="1.2" />
    <!-- scrolling code lines -->
    <g class="lines">
      <rect x="56" y="80" width="40" height="2" rx="1" fill="#2dd4bf" opacity="0.8" />
      <rect x="56" y="86" width="58" height="2" rx="1" fill="#2dd4bf" opacity="0.55" />
      <rect x="56" y="92" width="30" height="2" rx="1" fill="#2dd4bf" opacity="0.75" />
      <rect x="56" y="98" width="48" height="2" rx="1" fill="#2dd4bf" opacity="0.45" />
    </g>
    <!-- monitor stand -->
    <rect x="94" y="108" width="12" height="6" fill="#1f1f25" />
  </g>

  <!-- penguin bent forward, hands on keyboard -->
  <g class="penguin">
    <!-- feet -->
    <ellipse cx="86" cy="124" rx="5" ry="2.3" fill="#f59e0b" />
    <ellipse cx="114" cy="124" rx="5" ry="2.3" fill="#f59e0b" />
    <!-- body crouched -->
    <path d="M72 122 Q70 96 100 92 Q130 96 128 122 Z" fill="#101015" />
    <!-- belly -->
    <ellipse cx="100" cy="112" rx="16" ry="14" fill="#f5f5f0" />
    <!-- head lowered -->
    <ellipse cx="100" cy="88" rx="20" ry="17" fill="#101015" />
    <!-- eyes focused down -->
    <ellipse cx="92" cy="90" rx="2.4" ry="2.6" fill="#f5f5f0" />
    <ellipse cx="108" cy="90" rx="2.4" ry="2.6" fill="#f5f5f0" />
    <circle cx="92" cy="91" r="1.1" fill="#0a0a0b" />
    <circle cx="108" cy="91" r="1.1" fill="#0a0a0b" />
    <!-- beak down -->
    <polygon points="97,94 103,94 100,99" fill="#f59e0b" />
    <!-- flippers reaching forward -->
    <path d="M74 104 Q60 110 56 122 Q66 122 78 116 Z" fill="#0a0a0b" class="flipper l" />
    <path d="M126 104 Q140 110 144 122 Q134 122 122 116 Z" fill="#0a0a0b" class="flipper r" />
  </g>
</svg>

<style>
  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
  .lines rect {
    animation: scan 1.8s linear infinite;
  }
  .lines rect:nth-child(2) { animation-delay: 0.3s; }
  .lines rect:nth-child(3) { animation-delay: 0.6s; }
  .lines rect:nth-child(4) { animation-delay: 0.9s; }
  @keyframes scan {
    0%   { opacity: 0.2; transform: translateX(0); }
    50%  { opacity: 1; }
    100% { opacity: 0.2; transform: translateX(6px); }
  }
  .flipper {
    transform-origin: center;
    animation: tap 0.6s ease-in-out infinite alternate;
  }
  .flipper.r { animation-delay: 0.3s; }
  @keyframes tap {
    from { transform: translateY(0); }
    to   { transform: translateY(2px); }
  }
</style>
