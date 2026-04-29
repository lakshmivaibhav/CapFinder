"use client";

import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Users, 
  ShieldCheck, 
  Target, 
  TrendingUp, 
  Sparkles, 
  ArrowLeft, 
  CheckCircle2 
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

export default function AboutPage() {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20">
      {!user ? (
        <header className="px-8 h-24 flex items-center justify-between border-b bg-white/80 backdrop-blur-xl sticky top-0 z-50">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-all duration-500">
              <Zap className="text-white w-7 h-7 fill-current" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors">CapFinder</span>
          </Link>
          <nav className="flex gap-6 items-center">
            <Link href="/login">
              <Button variant="ghost" className="font-black uppercase text-[10px] tracking-widest h-12 px-6 rounded-xl">Login</Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-primary font-black h-12 px-8 rounded-xl shadow-xl shadow-primary/20 uppercase text-[10px] tracking-widest">Sign Up</Button>
            </Link>
          </nav>
        </header>
      ) : (
        <Navbar />
      )}

      <main className="flex-1 p-6 md:p-20 max-w-5xl mx-auto w-full space-y-16">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-all group w-fit">
          <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Back to {user ? "Dashboard" : "Home"}
        </Link>

        <section className="space-y-6 text-center md:text-left">
          <Badge className="bg-primary/10 text-primary border-none rounded-lg px-4 py-1.5 font-black uppercase text-[10px] tracking-widest">Our Story</Badge>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">Connecting Capital and <span className="text-primary italic">Innovation</span></h1>
          <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed italic border-l-8 border-primary/20 pl-8 max-w-3xl">
            CapFinder was built with a singular mission: to simplify the complex journey of startup fundraising and early-stage investment.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white group hover:shadow-2xl transition-all duration-500">
            <CardHeader className="p-10 bg-primary/5 border-b">
              <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl mb-6 group-hover:scale-110 transition-transform">
                <Target className="w-7 h-7" />
              </div>
              <CardTitle className="text-3xl font-black tracking-tight">Our Mission</CardTitle>
            </CardHeader>
            <CardContent className="p-10 space-y-6">
              <p className="text-muted-foreground leading-relaxed font-medium">
                To empower startup founders by providing direct access to verified capital partners, and to offer investors a curated, transparent feed of high-potential ventures.
              </p>
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-primary">
                <CheckCircle2 className="w-5 h-5" /> Transparency First
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white group hover:shadow-2xl transition-all duration-500">
            <CardHeader className="p-10 bg-accent/5 border-b">
              <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center text-white shadow-xl mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-7 h-7" />
              </div>
              <CardTitle className="text-3xl font-black tracking-tight">The Vision</CardTitle>
            </CardHeader>
            <CardContent className="p-10 space-y-6">
              <p className="text-muted-foreground leading-relaxed font-medium">
                We believe that the next world-changing idea shouldn't fail due to a lack of network. CapFinder levels the playing field for every innovator.
              </p>
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-accent">
                <CheckCircle2 className="w-5 h-5" /> Global Access
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="space-y-12">
          <div className="space-y-4">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              Why Trust CapFinder?
            </h2>
            <p className="text-muted-foreground max-w-2xl font-medium">
              We prioritize security and integrity above all else. Every member of our ecosystem undergoes a preliminary verification process.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="space-y-4 p-8 bg-white rounded-[2rem] shadow-lg border-2 border-muted hover:border-primary/20 transition-all">
              <Users className="w-8 h-8 text-primary" />
              <h4 className="font-black text-lg tracking-tight">Verified Community</h4>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">We manually review identities to maintain a high-signal environment for serious founders and investors.</p>
            </div>
            <div className="space-y-4 p-8 bg-white rounded-[2rem] shadow-lg border-2 border-muted hover:border-primary/20 transition-all">
              <ShieldCheck className="w-8 h-8 text-primary" />
              <h4 className="font-black text-lg tracking-tight">Secure Messaging</h4>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">Communications are encrypted and isolated, protecting sensitive venture data and proprietary metrics.</p>
            </div>
            <div className="space-y-4 p-8 bg-white rounded-[2rem] shadow-lg border-2 border-muted hover:border-primary/20 transition-all">
              <TrendingUp className="w-8 h-8 text-primary" />
              <h4 className="font-black text-lg tracking-tight">Data-Driven Fit</h4>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">Our algorithms match founders with investors based on sector, capital goals, and strategic thesis.</p>
            </div>
          </div>
        </section>

        <section className="p-12 md:p-16 rounded-[3rem] bg-primary text-white text-center space-y-8 relative overflow-hidden group">
          <Zap className="absolute -right-20 -bottom-20 w-80 h-80 text-white/5 -rotate-12 transition-transform duration-1000 group-hover:rotate-0" />
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter relative z-10 leading-none">Ready to start?</h2>
          <p className="text-lg md:text-xl opacity-90 max-w-xl mx-auto font-medium italic relative z-10">
            Join thousands of founders and investors already building the future.
          </p>
          <div className="pt-6 relative z-10">
            <Link href="/signup">
              <Button size="lg" className="h-16 px-12 bg-white text-primary hover:bg-white/90 rounded-2xl font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all">Get Started</Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
