import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Crosshair,
  Radar,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FallingPattern } from '@/components/ui/falling-pattern';
import AuthContext from '@/context/AuthContext';

const heroMetrics = [
  { value: '250+', label: 'attack paths' },
  { value: '24/7', label: 'live arena' },
  { value: 'Squads', label: 'team operations' },
];

const signalCards = [
  {
    title: 'Adaptive challenge flow',
    description: 'Precision-ranked tracks for offense, defense, and deep exploit rehearsal.',
    icon: Crosshair,
  },
  {
    title: 'Live scoreboard pressure',
    description: 'Track the arena in real time with fast feedback, team movement, and rank shifts.',
    icon: Trophy,
  },
  {
    title: 'Squad-ready coordination',
    description: 'Train solo or operate as a unit with structured runs built for competition cadence.',
    icon: Users,
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(AuthContext);

  const handleStart = () => {
    if (isAuthenticated) {
      navigate('/challenges');
    } else {
      navigate('/register');
    }
  };

  const handleExplore = () => {
    if (isAuthenticated) {
      navigate('/scoreboard');
    } else {
      navigate('/about');
    }
  };

  return (
    <div className="relative isolate min-h-screen w-full overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <FallingPattern
        className="absolute inset-0 h-full w-full"
        color="#A855F7"
        backgroundColor="#000000"
        duration={150}
        density={1}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(107,33,168,0.36)_0%,rgba(88,28,135,0.2)_38%,rgba(0,0,0,0.9)_100%)]" />
      <div className="pointer-events-none absolute left-[8%] top-[10%] h-56 w-56 rounded-full bg-[#6B21A8]/40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[12%] right-[8%] h-72 w-72 rounded-full bg-[#581C87]/35 blur-3xl" />

      <section className="relative z-10 flex min-h-screen w-full items-center">
        <div className="mx-auto grid w-full max-w-7xl gap-14 px-6 py-20 sm:px-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-end lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2E1065] bg-[#3B0764]/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#C4B5FD] backdrop-blur-xl">
              <Sparkles className="h-4 w-4 text-[#A855F7]" />
              Purple Ops Arena
            </div>

            <h1 className="mt-8 text-5xl font-black leading-[0.94] tracking-[-0.04em] text-[#F9FAFB] sm:text-6xl md:text-7xl lg:text-[5.5rem]">
              CTFQuest
              <span className="mt-3 block bg-[linear-gradient(180deg,#F9FAFB_0%,#C4B5FD_58%,#A855F7_100%)] bg-clip-text text-transparent">
                Cyber Arena
              </span>
            </h1>

            <p className="mt-8 max-w-2xl text-base leading-7 text-[#C4B5FD] sm:text-lg sm:leading-8">
              Train. Exploit. Defend. Enter a premium cyber battleground built for focused practice,
               live score pressure, and team-ready offensive workflows without visual noise.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <button
                onClick={handleStart}
                className="inline-flex items-center justify-center gap-3 rounded-2xl bg-[#A855F7] px-7 py-4 text-sm font-semibold text-[#F9FAFB] shadow-[0_18px_40px_rgba(168,85,247,0.28)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#9333EA]"
              >
                <Zap className="h-5 w-5" />
                Start Challenges
                <ArrowRight className="h-5 w-5" />
              </button>

              <button
                onClick={handleExplore}
                className="inline-flex items-center justify-center gap-3 rounded-2xl border border-[#2E1065] bg-[#000000]/40 px-7 py-4 text-sm font-semibold text-[#F9FAFB] backdrop-blur-xl transition-colors duration-200 hover:bg-[#3B0764]/70"
              >
                <Radar className="h-5 w-5 text-[#C4B5FD]" />
                Explore Platform
              </button>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#C4B5FD] sm:text-sm">
              {['Live scoring', 'Exploit rehearsal', 'Squad coordination'].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[#2E1065] bg-[#2E1065]/35 px-4 py-2"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {heroMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-[#2E1065] bg-[#3B0764]/45 px-5 py-4 backdrop-blur-xl"
                >
                  <div className="text-2xl font-bold text-[#F9FAFB]">{metric.value}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.22em] text-[#C4B5FD]">{metric.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.72, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="absolute inset-x-8 top-6 h-28 rounded-full bg-[#A855F7]/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[30px] border border-[#2E1065] bg-[linear-gradient(180deg,rgba(59,7,100,0.92)_0%,rgba(46,16,101,0.84)_100%)] p-6 shadow-[0_24px_80px_rgba(46,16,101,0.5)] backdrop-blur-xl sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C4B5FD]">
                    Mission Control
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold leading-tight text-[#F9FAFB]">
                    Minimal surface. Maximum pressure.
                  </h2>
                </div>
                <div className="rounded-2xl border border-[#2E1065] bg-[#000000]/45 p-3 text-[#A855F7]">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-[#2E1065] bg-[#000000]/45 p-4 backdrop-blur-md">
                <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#C4B5FD]">
                  Status Feed
                </div>
                <div className="mt-4 space-y-3 font-mono text-sm text-[#F9FAFB]">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-[#A855F7]" />
                    <span>Live telemetry enabled</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-[#C4B5FD]" />
                    <span>Ranked challenge routes active</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-[#9333EA]" />
                    <span>Team operations synced</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {signalCards.map(({ title, description, icon: Icon }) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-[#2E1065] bg-[#000000]/35 p-4 backdrop-blur-md sm:col-span-1"
                  >
                    <div className="flex items-center gap-3 text-[#F9FAFB]">
                      <div className="rounded-xl bg-[#A855F7]/18 p-2 text-[#A855F7]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#F9FAFB]">
                        {title}
                      </h3>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#C4B5FD]">{description}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
