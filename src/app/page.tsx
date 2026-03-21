"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Briefcase, 
  Users, 
  ShieldCheck, 
  ArrowRight, 
  Zap, 
  CheckCircle2, 
  Star,
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
      try {
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
        // Silently handle stat loading errors
      }
    }

    fetchStats();
  }, [db]);

  const stats = [
    { label: 'Active Ventures', value: counts.pitches, icon: Briefcase },
    { label: 'Verified Members', value: counts.users, icon: Users },
    { label: 'Global Partners', value: counts.verifiedInvestors, icon: ShieldCheck },
    { label: 'Syndications', value: counts.connections, icon: Zap },
  ];

  const features = [
    {
      title: 'For Visionary Founders',
      description: 'Get your startup in front of high-intent, strategic investors. Our platform simplifies the fundraising journey from initial pitch to finalized term sheet.',
      icon: Zap,
      points: ['Direct Investor Access', 'Secure Digital Data Rooms', 'AI-Powered Narrative Refinement'],
      color: 'bg-primary'
    },
    {
      title: 'For Strategic Investors',
      description: 'Discover curated investment opportunities across global markets. Access detailed venture documentation and founder profiles instantly.',
      icon: Star,
      points: ['Curated Sector Deal Flow', 'Verified Identity Protocol', 'Encrypted Private Messaging'],
      color: 'bg-accent'
    }
  ];

  const steps = [
    { title: 'Establish Identity', description: 'Join as a Founder or Investor and complete our high-trust professional verification.' },
    { title: 'Market Alignment', description: 'Explore curated ventures or partner profiles tailored to your specific strategic objectives.' },
    { title: 'Secure Engagement', description: 'Initiate direct inquiries and transition to private, fully encrypted communication channels.' },
    { title: 'Execute Growth', description: 'Finalize terms and fuel the next generation of global innovation through CapFinder.' },
  ];

  return (
    <div className="flex flex-col min-h-screen selection:bg-primary/20 bg-white">
      {/* Header */}
      <header className="px-8 h-24 flex items-center justify-between border-b bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-all duration-500">
            <Zap className="text-white w-7 h-7 fill-current" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors">CapFinder</span>
        </Link>
        <nav className="flex gap-6 items-center">
          {user ? (
            <Link href="/dashboard">
              <Button className="bg-primary hover:bg-primary/90 font-black h-12 px-8 rounded-xl shadow-xl shadow-primary/20 transition-all active:scale-95 uppercase text-[10px] tracking-widest">
                Go to Console
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" className="font-black uppercase text-[10px] tracking-widest hover:bg-primary/5 hover:text-primary h-12 px-6 rounded-xl">Log in</Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-primary hover:bg-primary/90 font-black h-12 px-8 rounded-xl shadow-xl shadow-primary/20 transition-all active:scale-95 uppercase text-[10px] tracking-widest">
                  Join Hub
                </Button>
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-24 px-6 md:py-40 overflow-hidden bg-[#f8fafc]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
            <div className="absolute top-20 left-20 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-20 right-20 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[150px] animate-pulse delay-1000" />
          </div>
          
          <div className="max-w-7xl mx-auto text-center space-y-12 relative z-10">
            <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-white/80 backdrop-blur-md rounded-full shadow-2xl border border-white text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-6 ring-4 ring-primary/5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
              </span>
              Venture Intelligence Protocol v2.4
            </div>
            
            <h1 className="text-6xl md:text-9xl font-black tracking-tighter text-foreground leading-[0.9] max-w-5xl mx-auto">
              Connecting <span className="text-primary italic">Capital</span> and <span className="text-accent underline decoration-[12px] underline-offset-[16px]">Innovation</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium italic">
              The premier ecosystem where visionary founders meet strategic institutional capital. Built for speed, secured by identity.
            </p>
            
            <div className="flex flex-wrap justify-center gap-8 pt-10">
              <Link href="/signup">
                <Button size="lg" className="h-20 px-12 text-xl font-black bg-primary hover:bg-primary/90 rounded-[1.5rem] shadow-3xl shadow-primary/30 transition-all hover:scale-105 active:scale-95 uppercase tracking-widest">
                  Apply for Access <ArrowRight className="ml-3 w-6 h-6" />
                </Button>
              </Link>
              <Link href={browseLink}>
                <Button size="lg" variant="outline" className="h-20 px-12 text-xl font-black border-4 border-muted rounded-[1.5rem] hover:bg-white hover:border-primary/20 transition-all shadow-sm uppercase tracking-widest">
                  Browse Market
                </Button>
              </Link>
            </div>

            <div className="pt-24 flex items-center justify-center gap-12 opacity-30 grayscale pointer-events-none overflow-hidden select-none">
               {['TECHNIQUE', 'VENTURE.IO', 'CAPITAL.CO', 'FOUNDRY', 'SYNAPSE'].map((logo) => (
                 <span key={logo} className="text-2xl font-black tracking-[0.2em] uppercase italic">{logo}</span>
               ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 px-6 border-y bg-white relative z-20">
          <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-12 md:gap-20">
            {stats.map((stat, i) => (
              <div key={i} className="text-center space-y-4 group">
                <div className="mx-auto w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mb-6 transition-transform group-hover:scale-110 duration-500">
                  <stat.icon className="w-8 h-8" />
                </div>
                <div className="text-5xl font-black tracking-tighter leading-none">
                  {stat.value.toLocaleString()}
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section className="py-32 px-6 max-w-7xl mx-auto space-y-32">
          <div className="text-center space-y-6">
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">Engineered for Success</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-xl font-medium italic border-l-8 border-primary/20 pl-8 text-left">
              A comprehensive institutional toolkit designed for both sides of the venture table.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-16">
            {features.map((feature, i) => (
              <div key={i} className="p-16 rounded-[2.5rem] bg-white border-2 border-muted shadow-xl hover:shadow-primary/5 transition-all duration-700 group flex flex-col h-full relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-64 h-64 ${feature.color} opacity-[0.03] rounded-full translate-x-1/3 -translate-y-1/3 group-hover:scale-150 transition-transform duration-1000`} />
                
                <div className={`w-20 h-20 ${feature.color} rounded-3xl flex items-center justify-center text-white shadow-2xl mb-12 group-hover:rotate-12 transition-transform duration-500`}>
                  <feature.icon className="w-10 h-10" />
                </div>
                <h3 className="text-4xl font-black mb-8 tracking-tighter">{feature.title}</h3>
                <p className="text-muted-foreground text-xl mb-12 leading-relaxed font-medium">
                  {feature.description}
                </p>
                <div className="mt-auto space-y-6">
                  {feature.points.map((point, j) => (
                    <div key={j} className="flex items-center gap-4 font-black text-[10px] uppercase tracking-widest text-foreground/80">
                      <CheckCircle2 className={`w-6 h-6 ${feature.color.replace('bg-', 'text-')}`} />
                      {point}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-32 px-6 bg-muted/20">
          <div className="max-w-7xl mx-auto space-y-32">
            <div className="text-center space-y-6">
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">The CapFinder Protocol</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-xl font-medium italic border-r-8 border-accent/20 pr-8 text-right">
                From initial identity verification to finalized deal, our strategic workflow is seamless.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-12">
              {steps.map((step, i) => (
                <div key={i} className="relative space-y-8 group">
                  <div className="text-[10rem] font-black text-primary/5 absolute -top-20 -left-8 select-none transition-transform duration-700 group-hover:translate-x-4">0{i + 1}</div>
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center text-primary font-black text-2xl relative z-10 border-2 border-primary/5 group-hover:scale-110 transition-transform">
                    {i + 1}
                  </div>
                  <div className="space-y-4 relative z-10">
                    <h4 className="text-2xl font-black tracking-tighter leading-none">{step.title}</h4>
                    <p className="text-muted-foreground text-md leading-relaxed font-medium italic">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-32 px-6 text-center">
          <div className="max-w-6xl mx-auto p-20 rounded-[3rem] bg-primary text-white space-y-12 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] shadow-primary/40 relative overflow-hidden group">
             <Zap className="absolute -right-20 -bottom-20 w-96 h-96 text-white/10 -rotate-12 transition-transform duration-1000 group-hover:rotate-0 group-hover:scale-110" />
             <h2 className="text-5xl md:text-7xl font-black tracking-tighter relative z-10 leading-[0.95]">Ready to Fuel the <br /><span className="italic text-white/80">Future?</span></h2>
             <p className="text-xl md:text-2xl opacity-90 max-w-2xl mx-auto font-medium italic relative z-10 leading-relaxed border-l-4 border-white/20 pl-8">
               Join the premier global network where disruptive innovation meets strategic institutional capital.
             </p>
             <div className="flex flex-wrap justify-center gap-10 pt-10 relative z-10">
               <Link href="/signup">
                 <Button size="lg" className="h-20 px-16 text-xl font-black bg-white text-primary hover:bg-white/90 rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95 uppercase tracking-widest">
                   Apply for Access
                 </Button>
               </Link>
               <Link href="/login">
                 <Button size="lg" variant="outline" className="h-20 px-16 text-xl font-black border-4 border-white text-white hover:bg-white/10 rounded-2xl transition-all uppercase tracking-widest">
                   Enter Console
                 </Button>
               </Link>
             </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-24 border-t bg-white px-8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-12 gap-20 mb-20">
          <div className="md:col-span-5 space-y-10">
            <Link href="/" className="flex items-center gap-4 group">
              <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/20 group-hover:scale-110 transition-all duration-500">
                <Zap className="text-white w-8 h-8 fill-current" />
              </div>
              <span className="text-3xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors">CapFinder</span>
            </Link>
            <p className="text-muted-foreground max-w-md text-lg font-medium italic leading-relaxed border-l-4 border-primary/10 pl-6">
              Empowering the global venture ecosystem through secure, identity-verified connections between strategic capital and disruptive innovation.
            </p>
            <div className="flex gap-8">
               {['Twitter', 'LinkedIn', 'Crunchbase', 'AngelList'].map(social => (
                 <span key={social} className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary cursor-pointer transition-all hover:-translate-y-1">{social}</span>
               ))}
            </div>
          </div>
          
          <div className="md:col-span-2 space-y-8">
            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">Ecosystem</h5>
            <div className="flex flex-col gap-5">
              <Link href="/pitches" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Venture Marketplace</Link>
              <Link href="/login" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Member Console</Link>
              <Link href="/signup" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Apply for Access</Link>
              <span className="text-sm font-bold text-muted-foreground hover:text-primary cursor-pointer transition-colors">Institutional Partners</span>
            </div>
          </div>

          <div className="md:col-span-2 space-y-8">
            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">Governance</h5>
            <div className="flex flex-col gap-5">
              <span className="text-sm font-bold text-muted-foreground hover:text-primary cursor-pointer transition-colors">Security Audit</span>
              <span className="text-sm font-bold text-muted-foreground hover:text-primary cursor-pointer transition-colors">Privacy Policy</span>
              <span className="text-sm font-bold text-muted-foreground hover:text-primary cursor-pointer transition-colors">Terms of Service</span>
              <span className="text-sm font-bold text-muted-foreground hover:text-primary cursor-pointer transition-colors">Compliance</span>
            </div>
          </div>

          <div className="md:col-span-3 space-y-8">
            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">Status</h5>
            <div className="p-8 bg-muted/20 rounded-2xl border-2 border-muted space-y-4 shadow-inner">
               <div className="flex items-center gap-3">
                 <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">All Systems Operational</span>
               </div>
               <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-[0.1em] leading-relaxed italic">Identity protocols and encrypted communication channels are active.</p>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12 pt-12 border-t-2 border-muted/50">
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.3em]">
            © 2024 CapFinder identity protocol v2.4.0 • Enterprise Security Layer
          </p>
          <div className="flex gap-12">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-3">
               <ShieldCheck className="w-5 h-5 text-primary" /> SECURE HUB
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-3">
               <CheckCircle2 className="w-5 h-5 text-accent" /> VERIFIED NETWORK
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
