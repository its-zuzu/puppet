import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Radar,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { useSiteConfig } from '../context/SiteConfigContext';

const heroMetrics = [
  { value: '250+', label: 'attack paths' },
  { value: '24/7', label: 'live arena' },
  { value: 'Squads', label: 'team operations' },
];

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(
    AuthContext as React.Context<{ isAuthenticated: boolean }>
  );
  const { eventName } = useSiteConfig();
  const platformName = eventName || 'CTFQuest';
  const heroImage = '/assests/ciphera.jpeg';

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
      navigate('/event-status');
    }
  };

  return (
    <div className="relative isolate min-h-screen w-full overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(107,33,168,0.36)_0%,rgba(88,28,135,0.2)_38%,rgba(0,0,0,0.9)_100%)]" />
      <div className="pointer-events-none absolute left-[8%] top-[10%] h-56 w-56 rounded-full bg-[#6B21A8]/40 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-[-10%] h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-[#7E22CE]/18 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[12%] right-[8%] h-72 w-72 rounded-full bg-[#581C87]/35 blur-3xl" />

      <section className="relative z-10 flex min-h-screen w-full items-center justify-center pt-20">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-20 sm:px-8 lg:grid-cols-[1fr_1fr] lg:items-stretch lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col justify-center space-y-8 py-10"
          >
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-[#2E1065] bg-[#3B0764]/60 py-2 pl-2 pr-5 text-xs font-semibold uppercase tracking-[0.28em] text-[#C4B5FD] backdrop-blur-xl">
              <div className="h-10 w-10 overflow-hidden rounded-full border border-[#A855F7]/30">
                <img
                  src={heroImage}
                  alt="Ciphera logo"
                  className="h-full w-full object-cover"
                />
              </div>
              Purple Ops Arena
            </div>

            <h1
              className="mt-8 font-black leading-[0.9] tracking-[-0.04em]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <span className="block bg-[linear-gradient(180deg,#F9FAFB_0%,#C4B5FD_58%,#A855F7_100%)] bg-clip-text text-5xl text-transparent sm:text-6xl md:text-7xl lg:text-[5.5rem]">
                {platformName}
              </span>
              <span className="mt-2 block bg-[linear-gradient(180deg,#F9FAFB_0%,#C4B5FD_58%,#A855F7_100%)] bg-clip-text text-3xl text-transparent sm:text-4xl md:text-5xl lg:text-[3.5rem]">
                Sri Eshwar&apos;s CTF
              </span>
            </h1>

            <p className="mt-8 max-w-xl text-base leading-7 text-[#C4B5FD] sm:text-lg sm:leading-8">
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

            <div className="mt-16 flex flex-wrap gap-4">
              {heroMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="min-w-[140px] flex-1 rounded-2xl border border-[#2E1065] bg-[#3B0764]/45 px-6 py-5 backdrop-blur-xl"
                >
                  <div className="text-3xl font-bold text-[#F9FAFB]">{metric.value}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.22em] text-[#C4B5FD]">{metric.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.72, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex items-center lg:translate-x-24"
          >
            <div className="absolute inset-x-8 top-1/2 h-64 w-full -translate-y-12 rounded-full bg-[#A855F7]/30 blur-3xl" />
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[50px] border border-[#2E1065] bg-[linear-gradient(180deg,rgba(17,3,35,0.72)_0%,rgba(8,1,20,0.38)_100%)] p-3 shadow-[0_24px_80px_rgba(46,16,101,0.6)] backdrop-blur-xl lg:h-[85%] lg:aspect-auto">
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(168,85,247,0.08)_0%,rgba(0,0,0,0)_55%)]" />
              <img
                src={heroImage}
                alt="Ciphera feature"
                className="h-full w-full rounded-[40px] object-cover"
              />
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
