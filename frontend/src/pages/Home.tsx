import { useContext, type Context } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Radar,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { useSiteConfig } from '../context/SiteConfigContext';
import CyberSamuraiBackground from '../components/ui/CyberSamuraiBackground';
import NinjaHover from '../components/ui/NinjaHover';
import { TextScramble } from '../components/ui/TextScramble';

const strikeMetrics = [
  { value: '250+', label: 'attack paths' },
  { value: '24/7', label: 'live arena' },
  { value: 'Squads', label: 'team operations' },
];

const operationChips = [
  'Live scoring',
  'Exploit rehearsal',
  'Squad coordination',
];

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(AuthContext as Context<{ isAuthenticated: boolean }>);
  const { eventName } = useSiteConfig();
  const platformName = 'Ciphera';
  const heroImage = '/assets/ciphera.jpeg';

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
    <CyberSamuraiBackground>
      <div className="relative min-h-screen overflow-hidden text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.22),transparent_42%),linear-gradient(180deg,rgba(5,0,10,0.4)_0%,rgba(5,0,10,0.88)_100%)]" />
        <div className="pointer-events-none absolute left-[8%] top-28 h-48 w-48 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-16 right-[7%] h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-10%] left-1/2 h-[24rem] w-[72rem] -translate-x-1/2 rounded-full border border-fuchsia-500/10 bg-fuchsia-500/5 blur-3xl" />

        <section className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-7xl items-center px-6 pb-14 pt-20 sm:px-8 lg:px-12">
          <div className="grid w-full gap-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.84fr)] lg:items-start lg:gap-14">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-2xl lg:pt-2"
            >
              <div className="inline-flex items-center gap-3 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-fuchsia-200/90 backdrop-blur-xl sm:text-[0.74rem]">
                <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-fuchsia-400/25 bg-fuchsia-500/15">
                  <img src={heroImage} alt="Ciphera emblem" className="h-full w-full object-cover" />
                </span>
                Purple Ops Arena
              </div>

              <div className="mt-8 space-y-5">
                <h1 className="font-black leading-[0.86] tracking-[-0.05em]" style={{ fontFamily: 'var(--font-display)' }}>
                  <span className="block text-5xl text-white sm:text-6xl lg:text-[6rem]">
                    <TextScramble text={platformName} duration={1100} />
                  </span>
                  <span className="mt-1 block bg-[linear-gradient(180deg,#FBF7FF_0%,#E9D5FF_45%,#B794F4_100%)] bg-clip-text text-[2.3rem] text-transparent sm:text-[3rem] lg:text-[3.65rem]">
                    <TextScramble text="Sri Eshwar's CTF" duration={900} />
                  </span>
                </h1>
                <p className="max-w-[42rem] text-base leading-8 text-violet-100/72 sm:text-[1.1rem]">
                  Train. Exploit. Defend. Enter a premium cyber battleground built for focused practice, live score pressure, and team-ready offensive workflows without visual noise.
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
                <button
                  onClick={handleStart}
                  className="inline-flex items-center justify-center gap-3 rounded-2xl border border-fuchsia-400/40 bg-[linear-gradient(135deg,#d946ef_0%,#c026d3_48%,#9333ea_100%)] px-7 py-4 text-sm font-semibold text-white shadow-[0_18px_60px_rgba(168,85,247,0.28)] transition duration-200 hover:-translate-y-0.5 hover:brightness-105"
                >
                  <Zap className="h-5 w-5" />
                  Start Challenges
                  <ArrowRight className="h-5 w-5" />
                </button>

                <button
                  onClick={handleExplore}
                  className="inline-flex items-center justify-center gap-3 rounded-2xl border border-white/12 bg-black/30 px-7 py-4 text-sm font-semibold text-white/90 backdrop-blur-xl transition duration-200 hover:border-fuchsia-300/30 hover:bg-white/8"
                >
                  <Radar className="h-5 w-5 text-fuchsia-200" />
                  Explore Platform
                </button>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                {operationChips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-fuchsia-400/10 bg-fuchsia-500/10 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-violet-100/78 backdrop-blur-xl sm:text-xs"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              <div className="mt-12 grid gap-4 sm:grid-cols-3">
                {strikeMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-[1.55rem] border border-fuchsia-400/12 bg-[linear-gradient(180deg,rgba(31,8,43,0.68)_0%,rgba(14,3,23,0.84)_100%)] px-5 py-5 shadow-[0_14px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl"
                  >
                    <p className="text-[2rem] font-black leading-none text-white" style={{ fontFamily: 'var(--font-display)' }}>
                      {metric.value}
                    </p>
                    <p className="mt-3 text-[0.7rem] uppercase tracking-[0.24em] text-fuchsia-200/70">
                      {metric.label}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="relative mx-auto w-full max-w-[27.5rem] pt-2 lg:mx-0 lg:max-w-[26rem] lg:pt-6"
            >
              <NinjaHover className="w-full">
                <div className="relative overflow-hidden rounded-[2.2rem] border border-fuchsia-300/20 bg-[linear-gradient(180deg,rgba(14,3,28,0.74)_0%,rgba(8,1,18,0.52)_100%)] p-3 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-4">
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_22%),radial-gradient(circle_at_top_right,rgba(232,121,249,0.2),transparent_34%)]" />
                  <div className="relative overflow-hidden rounded-[1.85rem] border border-fuchsia-300/10">
                    <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0)_40%,rgba(6,0,14,0.38)_100%)]" />
                    <img src={heroImage} alt="Ciphera feature" className="h-[520px] w-full object-cover sm:h-[610px]" />
                  </div>
                </div>
              </NinjaHover>
            </motion.div>
          </div>
        </section>
      </div>
    </CyberSamuraiBackground>
  );
}
