import { ArrowRight, BarChart3, History, RadioTower, Route, ShieldCheck, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    title: "Live SOL Market Data",
    body: "Track SOL pricing with live market feeds built for fast protection decisions.",
    icon: RadioTower
  },
  {
    title: "Live Route Comparison",
    body: "Compare available venues by route quality, liquidity, and protection efficiency.",
    icon: Route
  },
  {
    title: "Real-Time Market Protection",
    body: "Open a protection position designed to reduce downside while you keep holding SOL.",
    icon: ShieldCheck
  },
  {
    title: "Historical Crash Replay",
    body: "Review past SOL drawdowns and see how protected positions could have reduced losses.",
    icon: History
  },
  {
    title: "Multi-Venue Routing",
    body: "FloorFi evaluates Phoenix and Flash routes to find the best available protection path.",
    icon: BarChart3
  },
  {
    title: "Powered by Phoenix + Flash",
    body: "Institutional routing intelligence with a clean consumer-fintech protection experience.",
    icon: Zap
  }
];

const particles = [
  { left: "8%", top: "24%", delay: "0s", duration: "8s" },
  { left: "17%", top: "64%", delay: "1.4s", duration: "9.5s" },
  { left: "31%", top: "18%", delay: "0.8s", duration: "10s" },
  { left: "46%", top: "74%", delay: "2.2s", duration: "8.5s" },
  { left: "58%", top: "28%", delay: "1.1s", duration: "9s" },
  { left: "71%", top: "62%", delay: "0.3s", duration: "10.5s" },
  { left: "84%", top: "20%", delay: "2.7s", duration: "8.8s" },
  { left: "91%", top: "76%", delay: "1.8s", duration: "9.8s" }
];

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-black text-emerald-50 antialiased">
      <HeroEffects />
      <section className="relative min-h-screen overflow-hidden border-b border-emerald-300/10">
        <AceternityBackdrop />

        <div className="relative z-10 mx-auto flex min-h-screen w-full min-w-0 max-w-full flex-col overflow-hidden px-4 py-6 sm:max-w-7xl sm:px-6 lg:px-8">
          <nav className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to="/"
              className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md text-sm font-semibold tracking-wide text-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgb(52_211_153_/_0.95)]" aria-hidden="true" />
              FloorFi
            </Link>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <Link
                to="/app"
                className="landing-ghost-button inline-flex min-h-10 items-center rounded-md px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Replay Past Crashes
              </Link>
              <Link
                to="/hedge"
                className="landing-primary-button inline-flex min-h-10 items-center rounded-md px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Activate Protection
              </Link>
            </div>
          </nav>

          <div className="flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-10 py-12 text-center">
            <div className="mx-auto flex w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col items-center sm:w-full sm:max-w-4xl">
              <div className="landing-glass-badge inline-flex min-h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgb(110_231_183_/_0.9)]" aria-hidden="true" />
                Real-Time Market Protection
              </div>

              <h1 className="mx-auto mt-6 max-w-[20rem] text-balance text-4xl font-semibold leading-tight tracking-normal text-emerald-50 sm:max-w-5xl sm:text-6xl lg:text-7xl">
                Put a floor under your SOL.
              </h1>
              <p className="mx-auto mt-6 max-w-[20rem] text-balance text-base leading-7 text-emerald-50/72 sm:max-w-2xl sm:text-lg sm:leading-8">
                Reduce losses during major market crashes without exiting your position.
              </p>

              <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
                <Link
                  to="/app"
                  className="landing-ghost-button inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  Replay Past Crashes
                  <History className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/hedge"
                  className="landing-primary-button inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  Activate Protection
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <CrashReplayVisual />
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <article
              key={feature.title}
              className="landing-feature-card rounded-lg p-5 transition duration-150 ease-out hover:-translate-y-0.5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-emerald-300/20 bg-emerald-300/10 text-emerald-300">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-emerald-50">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-emerald-50/60">{feature.body}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}

function AceternityBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-black" />
      <div className="landing-spotlight landing-spotlight-left" />
      <div className="landing-spotlight landing-spotlight-right" />
      <div className="landing-lamp-glow" />
      <div className="landing-aurora" />
      <div className="landing-grid" />
      <div className="landing-grid landing-grid-secondary" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_45%,rgb(0_0_0_/_0.72)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black via-black/80 to-transparent" />
      {particles.map((particle, index) => (
        <span
          key={index}
          className="landing-particle"
          style={{
            left: particle.left,
            top: particle.top,
            animationDelay: particle.delay,
            animationDuration: particle.duration
          }}
        />
      ))}
    </div>
  );
}

function CrashReplayVisual() {
  return (
    <div className="landing-chart-shell box-border w-full min-w-0 max-w-[calc(100vw-2rem)] rounded-lg p-4 text-left sm:max-w-5xl sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Historical Crash Replay</p>
          <h2 className="mt-1 text-lg font-semibold text-emerald-50">Protected vs unprotected SOL</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-md border border-red-300/24 bg-red-400/10 px-2 py-1 text-red-200">Unprotected</span>
          <span className="rounded-md border border-emerald-300/24 bg-emerald-300/10 px-2 py-1 text-emerald-200">Protected</span>
        </div>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-md border border-emerald-300/12 bg-black/35">
        <div className="absolute left-[44%] top-0 h-full w-[31%] bg-gradient-to-r from-red-500/0 via-red-500/14 to-red-500/0" />
        <div className="absolute left-4 right-4 top-4 rounded-md border border-red-300/20 bg-red-950/24 px-2.5 py-1 text-xs font-medium text-red-100 backdrop-blur-md sm:left-[48%] sm:right-auto">
          SOL dropped 65% in months.
        </div>
        <div className="absolute bottom-4 left-4 right-4 rounded-md border border-emerald-300/20 bg-emerald-950/28 px-3 py-2 text-xs leading-5 text-emerald-50/74 backdrop-blur-md sm:left-auto sm:max-w-[15rem]">
          Protected positions could have reduced losses significantly.
        </div>
        <svg viewBox="0 0 920 360" className="relative z-10 h-[280px] w-full sm:h-[340px]" role="img" aria-label="Crash replay chart showing protected portfolio outperforming unprotected SOL during a sharp drawdown">
          <defs>
            <linearGradient id="landingProtectedGlow" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.2" />
              <stop offset="55%" stopColor="#34d399" stopOpacity="1" />
              <stop offset="100%" stopColor="#bbf7d0" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="landingUnprotectedGlow" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#f87171" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#ef4444" stopOpacity="1" />
              <stop offset="100%" stopColor="#fca5a5" stopOpacity="0.9" />
            </linearGradient>
            <filter id="landingChartGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g opacity="0.48">
            {[80, 140, 200, 260, 320].map((y) => (
              <line key={y} x1="56" x2="872" y1={y} y2={y} stroke="rgb(74 222 128 / 0.14)" strokeWidth="1" />
            ))}
            {[120, 240, 360, 480, 600, 720, 840].map((x) => (
              <line key={x} x1={x} x2={x} y1="48" y2="320" stroke="rgb(74 222 128 / 0.08)" strokeWidth="1" />
            ))}
          </g>

          <path
            className="landing-chart-area-red"
            d="M56 108 C128 96 186 118 250 104 C332 86 390 112 430 132 C468 158 494 210 532 252 C580 306 650 318 724 312 C790 306 836 286 872 272 L872 320 L56 320 Z"
            fill="url(#landingUnprotectedGlow)"
            opacity="0.08"
          />
          <path
            className="landing-chart-line landing-chart-line-red"
            d="M56 108 C128 96 186 118 250 104 C332 86 390 112 430 132 C468 158 494 210 532 252 C580 306 650 318 724 312 C790 306 836 286 872 272"
            fill="none"
            stroke="url(#landingUnprotectedGlow)"
            strokeLinecap="round"
            strokeWidth="4"
            filter="url(#landingChartGlow)"
          />
          <path
            className="landing-chart-line landing-chart-line-green"
            d="M56 118 C128 112 190 128 252 118 C330 104 390 124 430 138 C470 152 506 172 548 182 C612 198 678 194 744 184 C804 174 842 158 872 144"
            fill="none"
            stroke="url(#landingProtectedGlow)"
            strokeLinecap="round"
            strokeWidth="4"
            filter="url(#landingChartGlow)"
          />

          <circle className="landing-chart-pulse" cx="532" cy="252" r="5" fill="#fb7185" />
          <circle className="landing-chart-pulse landing-chart-pulse-green" cx="548" cy="182" r="5" fill="#34d399" />
        </svg>
      </div>
    </div>
  );
}

function HeroEffects() {
  return (
    <style>{`
      .landing-ghost-button {
        border: 1px solid rgb(74 222 128 / 0.22);
        background: rgb(4 18 12 / 0.58);
        color: rgb(236 253 245);
        box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.05);
        backdrop-filter: blur(16px);
        transition: transform 150ms ease-out, border-color 150ms ease-out, background-color 150ms ease-out, box-shadow 150ms ease-out;
      }

      .landing-ghost-button:hover {
        transform: translateY(-1px);
        border-color: rgb(74 222 128 / 0.44);
        background: rgb(8 47 31 / 0.64);
        box-shadow: 0 0 26px rgb(52 211 153 / 0.12), inset 0 1px 0 rgb(255 255 255 / 0.06);
      }

      .landing-primary-button {
        border: 1px solid rgb(110 231 183 / 0.42);
        background: linear-gradient(135deg, rgb(52 211 153), rgb(34 197 94));
        color: rgb(0 13 8);
        box-shadow: 0 0 34px rgb(52 211 153 / 0.34), inset 0 1px 0 rgb(255 255 255 / 0.28);
        transition: transform 150ms ease-out, box-shadow 150ms ease-out, filter 150ms ease-out;
      }

      .landing-primary-button:hover {
        transform: translateY(-1px);
        filter: brightness(1.06);
        box-shadow: 0 0 42px rgb(52 211 153 / 0.5), inset 0 1px 0 rgb(255 255 255 / 0.32);
      }

      .landing-glass-badge,
      .landing-feature-card,
      .landing-chart-shell {
        border: 1px solid rgb(74 222 128 / 0.16);
        background: linear-gradient(145deg, rgb(8 32 21 / 0.54), rgb(2 9 6 / 0.58));
        box-shadow: 0 24px 80px rgb(0 0 0 / 0.36), inset 0 1px 0 rgb(255 255 255 / 0.06);
        backdrop-filter: blur(22px);
      }

      .landing-feature-card:hover,
      .landing-chart-shell:hover {
        border-color: rgb(74 222 128 / 0.28);
        box-shadow: 0 28px 90px rgb(0 0 0 / 0.42), 0 0 30px rgb(52 211 153 / 0.09), inset 0 1px 0 rgb(255 255 255 / 0.08);
      }

      .landing-grid {
        position: absolute;
        inset: -20%;
        background-image:
          linear-gradient(rgb(74 222 128 / 0.09) 1px, transparent 1px),
          linear-gradient(90deg, rgb(74 222 128 / 0.08) 1px, transparent 1px);
        background-size: 62px 62px;
        mask-image: radial-gradient(circle at center, black 0%, black 48%, transparent 78%);
        transform: perspective(900px) rotateX(62deg) translateY(-16%);
        animation: landing-grid-drift 18s linear infinite;
      }

      .landing-grid-secondary {
        opacity: 0.24;
        background-size: 18px 18px;
        transform: perspective(900px) rotateX(62deg) translateY(-12%);
        animation-duration: 12s;
        animation-direction: reverse;
      }

      .landing-spotlight {
        position: absolute;
        width: 48rem;
        height: 48rem;
        border-radius: 9999px;
        filter: blur(64px);
        opacity: 0.28;
        animation: landing-float-glow 9s ease-in-out infinite alternate;
      }

      .landing-spotlight-left {
        left: -18rem;
        top: -14rem;
        background: radial-gradient(circle, rgb(34 197 94 / 0.52), transparent 64%);
      }

      .landing-spotlight-right {
        right: -16rem;
        top: 7rem;
        background: radial-gradient(circle, rgb(16 185 129 / 0.34), transparent 66%);
        animation-delay: 1.8s;
      }

      .landing-lamp-glow {
        position: absolute;
        left: 50%;
        top: -18rem;
        width: min(62rem, 92vw);
        height: 34rem;
        transform: translateX(-50%);
        background: radial-gradient(ellipse at center, rgb(110 231 183 / 0.26), rgb(34 197 94 / 0.08) 36%, transparent 70%);
        filter: blur(18px);
        opacity: 0.82;
        animation: landing-lamp-breathe 5.5s ease-in-out infinite alternate;
      }

      .landing-aurora {
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at 28% 38%, rgb(52 211 153 / 0.16), transparent 22rem),
          radial-gradient(circle at 72% 36%, rgb(20 184 166 / 0.12), transparent 26rem),
          linear-gradient(115deg, transparent 12%, rgb(34 197 94 / 0.09) 34%, transparent 58%);
        filter: blur(10px);
        opacity: 0.85;
        animation: landing-aurora-shift 10s ease-in-out infinite alternate;
      }

      .landing-particle {
        position: absolute;
        width: 3px;
        height: 3px;
        border-radius: 9999px;
        background: rgb(167 243 208);
        box-shadow: 0 0 14px rgb(52 211 153 / 0.9);
        opacity: 0.5;
        animation-name: landing-particle-rise;
        animation-timing-function: ease-in-out;
        animation-iteration-count: infinite;
        animation-direction: alternate;
      }

      .landing-chart-line {
        stroke-dasharray: 980;
        stroke-dashoffset: 980;
        animation: landing-line-draw 2.8s ease-out forwards;
      }

      .landing-chart-line-green {
        animation-delay: 0.35s;
      }

      .landing-chart-line-red {
        animation-delay: 0.1s;
      }

      .landing-chart-area-red {
        animation: landing-area-fade 2.8s ease-out forwards;
      }

      .landing-chart-pulse {
        transform-origin: center;
        animation: landing-point-pulse 2s ease-in-out infinite;
      }

      .landing-chart-pulse-green {
        animation-delay: 0.45s;
      }

      @keyframes landing-grid-drift {
        from { background-position: 0 0; }
        to { background-position: 124px 124px; }
      }

      @keyframes landing-float-glow {
        from { transform: translate3d(0, 0, 0) scale(1); }
        to { transform: translate3d(2rem, 1rem, 0) scale(1.06); }
      }

      @keyframes landing-lamp-breathe {
        from { opacity: 0.58; transform: translateX(-50%) scaleX(0.96); }
        to { opacity: 0.92; transform: translateX(-50%) scaleX(1.04); }
      }

      @keyframes landing-aurora-shift {
        from { transform: translate3d(-1.5rem, -0.5rem, 0); }
        to { transform: translate3d(1.5rem, 0.75rem, 0); }
      }

      @keyframes landing-particle-rise {
        from { transform: translate3d(0, 0, 0); opacity: 0.2; }
        to { transform: translate3d(0.5rem, -1.75rem, 0); opacity: 0.72; }
      }

      @keyframes landing-line-draw {
        to { stroke-dashoffset: 0; }
      }

      @keyframes landing-area-fade {
        from { opacity: 0; }
        to { opacity: 0.08; }
      }

      @keyframes landing-point-pulse {
        0%, 100% { opacity: 0.64; r: 5; }
        50% { opacity: 1; r: 8; }
      }

      @media (prefers-reduced-motion: reduce) {
        .landing-grid,
        .landing-grid-secondary,
        .landing-spotlight,
        .landing-lamp-glow,
        .landing-aurora,
        .landing-particle,
        .landing-chart-line,
        .landing-chart-area-red,
        .landing-chart-pulse {
          animation: none !important;
        }

        .landing-chart-line {
          stroke-dashoffset: 0;
        }
      }
    `}</style>
  );
}
