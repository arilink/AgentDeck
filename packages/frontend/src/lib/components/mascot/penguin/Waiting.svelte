<script lang="ts"></script>

<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <!-- amber ground glow -->
  <ellipse cx="100" cy="124" rx="60" ry="6" fill="#3a2a08" />
  <ellipse cx="100" cy="124" rx="44" ry="4" fill="#5a3f0d" />

  <!-- penguin standing, one flipper raised high -->
  <g class="penguin">
    <!-- feet -->
    <ellipse cx="90" cy="125" rx="6" ry="2.5" fill="#f59e0b" />
    <ellipse cx="110" cy="125" rx="6" ry="2.5" fill="#f59e0b" />
    <!-- body -->
    <path d="M70 122 Q70 78 100 70 Q130 78 130 122 Z" fill="#101015" />
    <!-- belly -->
    <ellipse cx="100" cy="106" rx="18" ry="22" fill="#f5f5f0" />
    <!-- head -->
    <ellipse cx="100" cy="56" rx="22" ry="20" fill="#101015" />
    <!-- eyes wide open -->
    <ellipse cx="91" cy="54" rx="3" ry="3.4" fill="#f5f5f0" />
    <ellipse cx="109" cy="54" rx="3" ry="3.4" fill="#f5f5f0" />
    <circle cx="91" cy="54" r="1.4" fill="#0a0a0b" />
    <circle cx="109" cy="54" r="1.4" fill="#0a0a0b" />
    <!-- beak -->
    <polygon points="97,60 103,60 100,66" fill="#f59e0b" />
    <!-- right flipper raised high -->
    <path d="M128 88 Q150 60 142 32 Q132 36 124 62 Q120 78 122 92 Z" fill="#0a0a0b" class="arm" />
    <!-- left flipper down -->
    <path d="M72 88 Q62 102 70 116 Q76 110 76 100 Z" fill="#0a0a0b" />
  </g>

  <!-- big amber ! -->
  <g class="bang">
    <rect x="158" y="20" width="8" height="28" rx="2" fill="#f59e0b" />
    <circle cx="162" cy="56" r="4" fill="#f59e0b" />
  </g>
</svg>

<style>
  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
  .bang {
    transform-origin: 162px 38px;
    animation: bounce 0.7s ease-in-out infinite alternate;
  }
  @keyframes bounce {
    from { transform: translateY(0) scale(1); }
    to   { transform: translateY(-6px) scale(1.08); }
  }
  .arm {
    transform-origin: 128px 88px;
    animation: wave 0.7s ease-in-out infinite alternate;
  }
  @keyframes wave {
    from { transform: rotate(-3deg); }
    to   { transform: rotate(6deg); }
  }
</style>
