"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Briefcase, 
  TrendingUp, 
  Users, 
  ShieldCheck, 
  ArrowRight, 
  Zap, 
  CheckCircle2, 
  Star,
  Search,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function HomePage() {
  const { user } = useAuth();
  const db = useFirestore();
  const browseLink = user ? '/pitches' : '/login';

  const [counts, setCounts] = useState({
    pitches: 0,
    users: 0,
    verifiedInvestors: 0,
    connections: 0
  });

  useEffect(() => {
    async function fetchStats() {
      // Statistics require authentication to read from Firestore collections
      if (!user) {
        setCounts({ pitches: 0, users: 0, verifiedInvestors: 0, connections: 0 });
        return;
      }

      try {
        // Fetch all stats concurrently but handle errors individually to maximize data visibility
        const [pitchesSnap, usersSnap, verifiedSnap, interestsSnap, requestsSnap] = await Promise.all([
          getDocs(collection(db, 'pitches')).catch(() => null),
          getDocs(collection(db, 'users')).catch(() => null),
          getDocs(query(collection(db, 'users'), where('verified', '==', true), where('role', '==', 'investor'))).catch(() => null),
          getDocs(collection(db, 'interests')).catch(() => null),
          getDocs(collection(db, 'contactRequests')).catch(() => null)
        ]);

        setCounts({
          pitches: pitchesSnap?.size || 0,
          users: usersSnap?.size || 0,
          verifiedInvestors: verifiedSnap?.size || 0,
          connections: (interestsSnap?.size || 0) + (requestsSnap?.size || 0)
        });
      } catch (error) {
        // Global error handled silently as individual counts handle their own fallbacks to 0
      }
    }

    fetchStats();
  }, [db, user]);

  const stats = [
    { label: 'Active Startups', value: counts.pitches, icon: Briefcase },
    { label: 'Total Members', value: counts.users, icon: Users },
    { label: 'Verified Investors', value: counts.verifiedInvestors, icon: ShieldCheck },
    { label: 'Connections', value: counts.connections, icon: Zap },
  ];

  const features = [
    {
      title: 'For Visionary Founders',
      description: 'Get your startup in front of verified, high-intent investors. Our platform simplifies the fundraising journey from pitch to term sheet.',
      icon: Zap,
      points: ['Direct Investor Access', 'Secure Data Rooms', 'AI-Powered Pitch Refinement'],
      color: 'bg-primary'
    },
    {
      title: 'For Strategic Investors',
      description: 'Discover curated investment opportunities across industries. Access detailed pitch decks and historical performance data instantly.',
      icon: Star,
      points: ['Curated Deal Flow', 'Verified Due Diligence', 'Direct Founder Messaging'],
      color: 'bg-accent'
    }
  ];

  const steps = [
    { title: 'Create Profile', description: 'Join as a Startup or Investor and complete our professional identity verification.' },
    { title: 'Discover & Match', description: 'Browse curated pitches or investor profiles tailored to your strategic objectives.' },
    { title: 'Secure Connection', description: 'Initiate direct inquiries and transition to private, encrypted data rooms.' },
    { title: 'Close the Deal', description: 'Finalize terms and fuel the future of global innovation through CapFinder.' },
  ];

  return (
    <div className="flex flex-col min-h-screen selection:bg-primary/20">
      {/* Header */}
      <header className="px-6 h-20 flex items-center justify-between border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
            <Zap className="text-white w-6 h-6 fill-current" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors">CapFinder</span>
        </Link>
        <nav className="flex gap-4 items-center">
          {user ? (
            <Link href="/dashboard">
              <Button className="bg-primary hover:bg-primary/90 font-bold px-6 rounded-xl">Go to Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" className="font-bold">Log in</Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-primary hover:bg-primary/90 font-bold px-6 rounded-xl shadow-lg shadow-primary/20">Join Ecosystem</Button>
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 px-6 md:py-32 overflow-hidden bg-[#f8fafc]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
            <div className="absolute top-10 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse delay-700" />
          </div>
          
          <div className="max-w-6xl mx-auto text-center space-y-10 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Next-Gen Venture Protocol
            </div>
            
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-foreground leading-[0.95] max-w-4xl mx-auto">
              Connecting <span className="text-primary italic">Capital</span> and <span className="text-accent underline decoration-8 underline-offset-8">Innovation</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium">
              The premier ecosystem where visionary founders meet strategic capital. Built for speed, secured by identity.
            </p>
            
            <div className="flex flex-wrap justify-center gap-6 pt-4">
              <Link href="/signup">
                <Button size="lg" className="h-16 px-10 text-xl font-black bg-primary hover:bg-primary/90 rounded-2xl shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                  Get Started <ArrowRight className="ml-2 w-6 h-6" />
                </Button>
              </Link>
              <Link href={browseLink}>
                <Button size="lg" variant="outline" className="h-16 px-10 text-xl font-black border-2 rounded-2xl hover:bg-muted/50 transition-all">
                  Browse Marketplace
                </Button>
              </Link>
            </div>

            <div className="pt-16 flex items-center justify-center gap-8 opacity-40 grayscale pointer-events-none overflow-hidden">
               <span className="text-2xl font-black tracking-widest uppercase italic">TECHNIQUE</span>
               <span className="text-2xl font-black tracking-widest uppercase italic">VENTURE.IO</span>
               <span className="text-2xl font-black tracking-widest uppercase italic">CAPITAL.CO</span>
               <span className="text-2xl font-black tracking-widest uppercase italic">FOUNDRY</span>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 px-6 border-y bg-white">
          <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
            {stats.map((stat, i) => (
              <div key={i} className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center text-primary mb-4">
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-4xl font-black tracking-tight">
                  {stat.value.toLocaleString()}
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
          {!user && (
            <p className="text-center mt-8 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 italic">
              Authenticate to view live ecosystem metrics
            </p>
          )}
        </section>

        {/* Features Section */}
        <section className="py-24 px-6 max-w-7xl mx-auto space-y-20">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter">Engineered for Success</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg font-medium italic">
              A comprehensive toolkit for both sides of the venture table.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {features.map((feature, i) => (
              <div key={i} className="p-10 rounded-[2.5rem] bg-white border-2 border-muted shadow-sm hover:shadow-xl transition-all group flex flex-col h-full">
                <div className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center text-white shadow-lg mb-8 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-black mb-6 tracking-tight">{feature.title}</h3>
                <p className="text-muted-foreground text-lg mb-10 leading-relaxed font-medium">
                  {feature.description}
                </p>
                <div className="mt-auto space-y-4">
                  {feature.points.map((point, j) => (
                    <div key={j} className="flex items-center gap-3 font-black text-sm uppercase tracking-widest text-foreground/80">
                      <CheckCircle2 className={`w-5 h-5 ${feature.color.replace('bg-', 'text-')}`} />
                      {point}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24 px-6 bg-muted/30">
          <div className="max-w-7xl mx-auto space-y-20">
            <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter">The CapFinder Protocol</h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-lg font-medium italic">
                From first connection to finalized deal, our workflow is seamless.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-8">
              {steps.map((step, i) => (
                <div key={i} className="relative space-y-6 group">
                  <div className="text-8xl font-black text-primary/5 absolute -top-8 -left-4 select-none">0{i + 1}</div>
                  <div className="w-12 h-12 bg-white rounded-xl shadow-md flex items-center justify-center text-primary font-black text-xl relative z-10">
                    {i + 1}
                  </div>
                  <div className="space-y-3 relative z-10">
                    <h4 className="text-xl font-black tracking-tight">{step.title}</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed font-medium italic">{step.description}</p>
                  </div>
                  {i < 3 && (
                    <div className="hidden lg:block absolute top-6 left-full w-full h-[2px] bg-dashed-gradient opacity-20 -translate-x-6" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-24 px-6 text-center">
          <div className="max-w-4xl mx-auto p-16 rounded-[3rem] bg-primary text-white space-y-10 shadow-2xl shadow-primary/30 relative overflow-hidden">
             <Zap className="absolute -right-10 -bottom-10 w-64 h-64 text-white/10 -rotate-12" />
             <h2 className="text-4xl md:text-6xl font-black tracking-tighter relative z-10">Ready to Fuel the Future?</h2>
             <p className="text-xl md:text-2xl opacity-90 max-w-xl mx-auto font-medium italic relative z-10">
               Join the global network where innovation meets strategic capital.
             </p>
             <div className="flex flex-wrap justify-center gap-6 pt-4 relative z-10">
               <Link href="/signup">
                 <Button size="lg" className="h-16 px-10 text-xl font-black bg-white text-primary hover:bg-white/90 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95">
                   Apply for Access
                 </Button>
               </Link>
               <Link href="/login">
                 <Button size="lg" variant="outline" className="h-16 px-10 text-xl font-black border-2 border-white text-white hover:bg-white/10 rounded-2xl transition-all">
                   Enter Console
                 </Button>
               </Link>
             </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-20 border-t bg-white px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2 space-y-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Zap className="text-white w-6 h-6 fill-current" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-foreground">CapFinder</span>
            </Link>
            <p className="text-muted-foreground max-w-sm text-sm font-medium italic">
              Empowering the global venture ecosystem through secure identity-verified connections between capital and innovation.
            </p>
            <div className="flex gap-4">
               {['Twitter', 'LinkedIn', 'Crunchbase'].map(social => (
                 <span key={social} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary cursor-pointer transition-colors">{social}</span>
               ))}
            </div>
          </div>
          
          <div className="space-y-6">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-foreground">Ecosystem</h5>
            <div className="flex flex-col gap-3">
              <Link href="/pitches" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Venture Feed</Link>
              <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Member Console</Link>
              <Link href="/signup" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Join Hub</Link>
            </div>
          </div>

          <div className="space-y-6">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-foreground">Governance</h5>
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium text-muted-foreground hover:text-primary cursor-pointer transition-colors">Privacy Policy</span>
              <span className="text-sm font-medium text-muted-foreground hover:text-primary cursor-pointer transition-colors">Security Audit</span>
              <span className="text-sm font-medium text-muted-foreground hover:text-primary cursor-pointer transition-colors">Terms of Service</span>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 pt-10 border-t">
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">
            © 2024 CapFinder identity protocol v2.4.0
          </p>
          <div className="flex gap-8">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
               <ShieldCheck className="w-3.5 h-3.5" /> SECURE HUB
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
               <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED ECOSYSTEM
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
