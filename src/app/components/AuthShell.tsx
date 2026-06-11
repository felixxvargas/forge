'use client';
import type { ReactNode } from 'react';
import { Link } from '@/compat/router';
import { ArrowLeft, Gamepad2, Users, Tv2, Flame, Search } from 'lucide-react';
import ForgeSVG from '../../assets/forge-logo.svg?react';
import { BetaTag } from './ui/BetaTag';

const FEATURE_POINTS = [
  { icon: Gamepad2, title: 'Track your game library', desc: "Organize games you've played, want to play, and your all-time favorites." },
  { icon: Users, title: 'Connect with gamers', desc: 'Follow friends, join communities, and see what everyone is playing.' },
  { icon: Search, title: 'Discover new games', desc: 'Get recommendations from people with the same gaming taste as you.' },
  { icon: Flame, title: 'Find teammates with LFG', desc: 'Post a flare when you need a squad and get matched instantly.' },
  { icon: Tv2, title: 'Auto Twitch stream archives', desc: 'Your Twitch VODs are automatically saved and shared to your profile.' },
] as const;

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 relative">
      <Link
        to="/feed"
        className="fixed top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors inline-flex items-center justify-center"
        aria-label="Back to feed"
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </Link>

      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-15%] left-[5%] w-[700px] h-[700px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-[-10%] right-[0%] w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(109,40,217,0.28) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-[35%] right-[15%] w-[450px] h-[450px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)', filter: 'blur(100px)' }} />
        <div className="absolute bottom-[15%] left-[-5%] w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(88,28,135,0.22) 0%, transparent 70%)', filter: 'blur(70px)' }} />
      </div>

      {/* Two-column content */}
      <div className="w-full lg:max-w-4xl flex-1 flex flex-col lg:flex-row lg:items-center lg:gap-16 pt-20 sm:pt-0 relative z-10 lg:px-4">

        {/* Feature panel — below form on mobile, left column on desktop */}
        <div
          className="order-last lg:order-first flex flex-col gap-4 lg:gap-6 flex-1 max-w-sm rounded-2xl p-5 lg:p-6"
          style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div>
            <h2 className="text-xl lg:text-3xl font-black text-foreground leading-tight mb-2">
              The social network<br />built for gamers.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Track your library, connect with the community, and share what you're playing.
            </p>
          </div>
          <div className="space-y-3 lg:space-y-4">
            {FEATURE_POINTS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3 items-start">
                <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4.5 h-4.5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form column */}
        <div className="w-full max-w-md flex-1 lg:flex-none flex flex-col justify-center lg:pt-16">
          <div className="text-center mb-8">
            <div className="relative flex items-center justify-center gap-2.5 mb-2">
              <ForgeSVG width="32" height="26" aria-hidden="true" />
              <span className="font-black text-2xl text-accent tracking-tight">Forge</span>
              <BetaTag size="sm" />
            </div>
            <p className="text-sm text-muted-foreground">Your gaming social network</p>
          </div>

          <div
            className="rounded-2xl p-8 shadow-2xl"
            style={{
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.11)',
            }}
          >
            {children}
          </div>
        </div>
      </div>

      {/* App Store Badges */}
      <div className="w-full max-w-md mt-8 mb-6 relative z-10">
        <p className="text-center text-xs text-muted-foreground/50 mb-4 uppercase tracking-wide font-medium">Also available on</p>
        <div className="flex items-center justify-center gap-6 pb-4">
          <a href="https://play.google.com/store/apps/details?id=app.forge.social&hl=en_US" target="_blank" rel="noopener noreferrer" className="relative group">
            <img src="/google-play-badge.png" alt="Get it on Google Play" className="h-10 group-hover:opacity-80 transition-opacity" />
            <span className="absolute -bottom-4 left-0 right-0 text-center text-[9px] text-accent tracking-wide font-medium">Download</span>
          </a>
          <div className="relative opacity-40 cursor-not-allowed" title="Coming soon">
            <img src="/apple-store-badge.svg" alt="Download on the App Store" className="h-7 grayscale" />
            <span className="absolute -bottom-4 left-0 right-0 text-center text-[9px] text-muted-foreground tracking-wide">Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  );
}
