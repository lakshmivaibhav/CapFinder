"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldCheck, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * @fileOverview Privacy Policy page for CapFinder.
 * Details data storage practices and institutional commitments to member privacy.
 */
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20">
      {/* Header */}
      <header className="px-8 h-24 flex items-center justify-between border-b bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-all duration-500">
            <Zap className="text-white w-7 h-7 fill-current" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors">CapFinder</span>
        </Link>
      </header>

      <main className="flex-1 p-6 md:p-20 max-w-4xl mx-auto w-full space-y-12">
        <Link href="/" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-all group w-fit">
          <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Return to gateway
        </Link>

        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="p-10 md:p-16 border-b bg-muted/30">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Governance Protocol</p>
            </div>
            <CardTitle className="text-4xl md:text-6xl font-black tracking-tighter leading-none">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="p-10 md:p-16 space-y-10">
            <section className="space-y-4">
              <h3 className="text-xl font-black tracking-tight">Data Collection & Storage</h3>
              <p className="text-muted-foreground leading-relaxed italic border-l-4 border-primary/20 pl-6">
                To facilitate a high-trust venture ecosystem, CapFinder securely processes and stores specific data points:
              </p>
              <ul className="grid gap-4 mt-6">
                <li className="flex items-start gap-4 p-6 bg-muted/20 rounded-2xl">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0" />
                  <div>
                    <p className="font-black text-sm uppercase tracking-widest mb-1">User Credentials</p>
                    <p className="text-sm text-muted-foreground">We store your email address to authenticate your session and manage secure access to the member console.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4 p-6 bg-muted/20 rounded-2xl">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0" />
                  <div>
                    <p className="font-black text-sm uppercase tracking-widest mb-1">Professional Identity</p>
                    <p className="text-sm text-muted-foreground">Profile information including your name, company affiliation, and investment thesis are stored to establish credibility within the network.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4 p-6 bg-muted/20 rounded-2xl">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0" />
                  <div>
                    <p className="font-black text-sm uppercase tracking-widest mb-1">Encrypted Communication</p>
                    <p className="text-sm text-muted-foreground">Private messages shared during strategic inquiries are persisted to maintain a historical record of your engagements.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4 p-6 bg-muted/20 rounded-2xl">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0" />
                  <div>
                    <p className="font-black text-sm uppercase tracking-widest mb-1">Venture Assets</p>
                    <p className="text-sm text-muted-foreground">Startup pitches and corporate imagery are stored to enable discovery by strategic capital partners.</p>
                  </div>
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-black tracking-tight">Infrastructure & Security</h3>
              <p className="text-muted-foreground leading-relaxed">
                CapFinder leverages industry-leading infrastructure to protect your data:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-8 border-2 border-muted rounded-3xl group hover:border-primary transition-all">
                  <p className="font-black text-xs uppercase tracking-widest text-primary mb-2">Authentication & Storage</p>
                  <p className="text-sm text-muted-foreground">We use <strong>Firebase</strong> for enterprise-grade authentication and real-time database security.</p>
                </div>
                <div className="p-8 border-2 border-muted rounded-3xl group hover:border-primary transition-all">
                  <p className="font-black text-xs uppercase tracking-widest text-primary mb-2">Media Processing</p>
                  <p className="text-sm text-muted-foreground">Visual venture assets are managed via <strong>Cloudinary</strong> to ensure optimized delivery and security.</p>
                </div>
              </div>
            </section>

            <section className="space-y-4 pt-10 border-t border-dashed">
              <h3 className="text-xl font-black tracking-tight">Our Commitment</h3>
              <div className="p-10 bg-primary text-white rounded-[2rem] shadow-xl shadow-primary/20 relative overflow-hidden">
                <ShieldCheck className="absolute -right-10 -bottom-10 w-48 h-48 text-white/10 -rotate-12" />
                <p className="text-2xl font-black tracking-tighter mb-4">Zero Monetization of Data</p>
                <p className="text-lg opacity-90 italic leading-relaxed">
                  "CapFinder is built on trust. We do not sell, trade, or rent your personal information to third parties. Your data is used exclusively to facilitate strategic venture connections."
                </p>
              </div>
            </section>
          </CardContent>
        </Card>
      </main>

      <footer className="py-12 border-t bg-white text-center">
        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.3em]">
          © 2024 CapFinder Governance Layer • Privacy Protocol v1.0
        </p>
      </footer>
    </div>
  );
}