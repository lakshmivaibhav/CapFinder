
"use client";

import Link from 'next/link';
import { Zap, ShieldCheck, CheckCircle2 } from 'lucide-react';

/**
 * @fileOverview Reusable footer component for both public and authenticated views.
 */
export function Footer() {
  return (
    <footer className="py-16 border-t bg-white px-8 mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-20 mb-16">
        <div className="md:col-span-5 space-y-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-all duration-500">
              <Zap className="text-white w-7 h-7 fill-current" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors">CapFinder</span>
          </Link>
          <p className="text-muted-foreground max-w-md text-md font-medium italic leading-relaxed border-l-4 border-primary/10 pl-6">
            Empowering the global startup ecosystem through direct connections between founders and investors.
          </p>
        </div>
        
        <div className="md:col-span-2 space-y-6">
          <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">Resources</h5>
          <div className="flex flex-col gap-4">
            <Link href="/about" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">About Us</Link>
            <Link href="/guide" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Platform Guide</Link>
            <Link href="/faq" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">FAQ</Link>
            <Link href="/safety" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Trust & Safety</Link>
            <Link href="/contact" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Support</Link>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">Legal</h5>
          <div className="flex flex-col gap-4">
            <Link href="/privacy" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Terms of Use</Link>
            <Link href="/disclaimer" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Disclaimer</Link>
          </div>
        </div>

        <div className="md:col-span-3 space-y-6">
          <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">Status</h5>
          <div className="p-6 bg-muted/20 rounded-2xl border-2 border-muted space-y-3 shadow-inner">
             <div className="flex items-center gap-3">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">All Systems Online</span>
             </div>
             <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-[0.1em] leading-relaxed italic">Platform is secure and monitored.</p>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 pt-10 border-t-2 border-muted/50">
        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.3em]">
          © 2024 CapFinder • Secure Startup Platform
        </p>
        <div className="flex gap-8">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
             <ShieldCheck className="w-4 h-4 text-primary" /> SECURE
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
             <CheckCircle2 className="w-4 h-4 text-accent" /> VERIFIED
          </span>
        </div>
      </div>
    </footer>
  );
}
