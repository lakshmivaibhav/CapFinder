
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
  HelpCircle,
  Mail,
  Info,
  Search,
  PlusCircle,
  Eye,
  MessageSquare,
  Inbox,
  TrendingUp,
  LayoutGrid,
  ShieldAlert,
  Trophy,
  Flame,
  Image as ImageIcon,
  BookOpen
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Footer } from '@/components/footer';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export default function HomePage() {
  const { user } = useAuth();
  const db = useFirestore();
  
  const [counts, setCounts] = useState({
    pitches: 0,
    users: 0,
    verifiedInvestors: 0,
    connections: 0
  });

  const [topPitches, setTopPitches] = useState<any[]>([]);
  const [loadingTop, setLoadingTop] = useState(true);

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

        // Fetch Top Pitches by views
        const topSnap = await getDocs(query(collection(db, 'pitches'), orderBy('views', 'desc'), limit(3)));
        const top = topSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTopPitches(top);
      } catch (error) {
        // Silently handle stat loading errors
      } finally {
        setLoadingTop(false);
      }
    }

    fetchStats();
  }, [db]);

  const stats = [
    { label: 'Startups', value: counts.pitches, icon: Briefcase },
    { label: 'Members', value: counts.users, icon: Users },
    { label: 'Investors', value: counts.verifiedInvestors, icon: ShieldCheck },
    { label: 'Connections', value: counts.connections, icon: Zap },
  ];

  const features = [
    {
      title: 'For Startup Founders',
      description: 'Get your startup in front of verified, high-intent investors. Simplify your fundraising journey and find the right capital partners.',
      icon: Zap,
      points: ['Direct Access to Investors', 'Secure Data Room', 'AI-Powered Pitch Assistant'],
      color: 'bg-primary'
    },
    {
      title: 'For Investors',
      description: 'Discover curated investment opportunities. Access detailed pitch information and connect with founders instantly.',
      icon: Star,
      points: ['Curated Deal Flow', 'Verified Profiles', 'Secure Messaging'],
      color: 'bg-accent'
    }
  ];

  const startupSteps = [
    { 
      title: 'Create Pitch', 
      description: 'Build a compelling profile with our AI assistant to showcase your unique value proposition.',
      icon: PlusCircle,
      color: 'text-primary',
      bg: 'bg-primary/10'
    },
    { 
      title: 'Get Discovered', 
      description: 'Your venture is shared with a curated feed of verified, high-intent capital partners.',
      icon: Eye,
      color: 'text-primary',
      bg: 'bg-primary/10'
    },
    { 
      title: 'Connect with Investors', 
      description: 'Initiate secure dialogues, share metrics, and finalize your next funding round.',
      icon: MessageSquare,
      color: 'text-primary',
      bg: 'bg-primary/10'
    },
  ];

  const investorSteps = [
    { 
      title: 'Explore Startups', 
      description: 'Browse a high-signal feed of vetted ventures filtered by sector, stage, and capital goals.',
      icon: Search,
      color: 'text-accent',
      bg: 'bg-accent/10'
    },
    { 
      title: 'Receive Requests', 
      description: 'Monitor your pipeline for institutional-grade proposals from high-growth founders.',
      icon: Inbox,
      color: 'text-accent',
      bg: 'bg-accent/10'
    },
    { 
      title: 'Invest & Connect', 
      description: 'Open secure hubs to perform due diligence and finalize strategic partnerships.',
      icon: TrendingUp,
      color: 'text-accent',
      bg: 'bg-accent/10'
    },
  ];

  return (
    <div className="flex flex-col min-h-screen selection:bg-primary/20 bg-white">
      <header className="px-8 h-24 flex items-center justify-between border-b bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-all duration-500">
            <Zap className="text-white w-7 h-7 fill-current" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors">CapFinder</span>
        </Link>
        
        <nav className="hidden lg:flex gap-8 items-center mr-8">
          <Link href="/guide" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Guide</Link>
          <Link href="/about" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">About</Link>
          <Link href="/faq" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">FAQ</Link>
          <Link href="/contact" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Contact</Link>
        </nav>

        <nav className="flex gap-6 items-center">
          {user ? (
            <Link href="/dashboard">
              <Button className="bg-primary hover:bg-primary/90 font-black h-12 px-8 rounded-xl shadow-xl shadow-primary/20 transition-all active:scale-95 uppercase text-[10px] tracking-widest">
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" className="font-black uppercase text-[10px] tracking-widest hover:bg-primary/5 hover:text-primary h-12 px-6 rounded-xl">Login</Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-primary hover:bg-primary/90 font-black h-12 px-8 rounded-xl shadow-xl shadow-primary/20 transition-all active:scale-95 uppercase text-[10px] tracking-widest">
                  Sign Up
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
              Connecting Capital & Innovation
            </div>
            
            <h1 className="text-6xl md:text-9xl font-black tracking-tighter text-foreground leading-[0.9] max-w-5xl mx-auto">
              Connecting <span className="text-primary italic">Capital</span> and <span className="text-accent underline decoration-[12px] underline-offset-[16px]">Innovation</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium italic">
              The premier platform where founders meet investors. Built for speed, secured for you.
            </p>
            
            <div className="flex flex-wrap justify-center gap-8 pt-10">
              <Link href="/signup">
                <Button size="lg" className="h-20 px-12 text-xl font-black bg-primary hover:bg-primary/90 rounded-[1.5rem] shadow-3xl shadow-primary/30 transition-all hover:scale-105 active:scale-95 uppercase tracking-widest">
                  Get Started <ArrowRight className="ml-3 w-6 h-6" />
                </Button>
              </Link>
              <Link href="/guide">
                <Button size="lg" variant="outline" className="h-20 px-12 text-xl font-black border-4 border-muted rounded-[1.5rem] hover:bg-white hover:border-primary/20 transition-all shadow-sm uppercase tracking-widest">
                  Platform Guide
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Top Startups Section */}
        {!loadingTop && topPitches.length > 0 && (
          <section className="py-32 px-6 bg-white">
            <div className="max-w-7xl mx-auto space-y-20">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-4 py-1 bg-amber-50 rounded-lg text-amber-600 font-black text-[10px] uppercase tracking-widest border border-amber-100">
                    <Trophy className="w-3.5 h-3.5" /> Market Selection
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">Featured <span className="text-primary italic">Ventures</span></h2>
                  <p className="text-lg text-muted-foreground font-medium italic border-l-4 border-primary/20 pl-6">
                    High-intent startups gaining institutional momentum.
                  </p>
                </div>
                <Link href="/signup">
                  <Button variant="outline" className="h-14 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest border-2">Explore All Pitches <ArrowRight className="ml-2 w-4 h-4" /></Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {topPitches.map((pitch) => (
                  <div key={pitch.id} className="group relative rounded-[2.5rem] overflow-hidden bg-white shadow-2xl border border-muted hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-2">
                    <div className="relative aspect-[16/10] w-full overflow-hidden">
                      {pitch.imageURL ? (
                        <Image src={pitch.imageURL} alt={pitch.startupName} fill className="object-cover transition-transform duration-700 group-hover:scale-110" unoptimized />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/10 bg-muted/20">
                          <ImageIcon className="w-16 h-16" />
                        </div>
                      )}
                      <div className="absolute top-6 left-6 flex flex-col gap-2">
                        <Badge className="bg-black/50 backdrop-blur-md text-white border-none px-4 py-1.5 font-black uppercase text-[9px] tracking-widest">
                          {pitch.category || pitch.industry}
                        </Badge>
                      </div>
                      <div className="absolute bottom-4 right-6">
                         <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg">
                           <Flame className="w-3.5 h-3.5 text-orange-500" />
                           <span className="text-[10px] font-black uppercase text-foreground">{pitch.views || 0} Discoveries</span>
                         </div>
                      </div>
                    </div>
                    <div className="p-10 space-y-6">
                      <h3 className="text-2xl font-black tracking-tight group-hover:text-primary transition-colors">{pitch.startupName}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-3 italic leading-relaxed">&quot;{pitch.description}&quot;</p>
                      <div className="pt-6 border-t border-dashed flex items-center justify-between">
                         <div className="space-y-0.5">
                           <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Seeking</p>
                           <p className="text-xl font-black text-primary">${pitch.fundingNeeded?.toLocaleString()}</p>
                         </div>
                         <Link href={`/startup/${pitch.id}`}>
                           <Button size="icon" className="rounded-full w-12 h-12 shadow-lg shadow-primary/20 transition-transform group-hover:translate-x-1">
                             <ArrowRight className="w-5 h-5" />
                           </Button>
                         </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

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
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">Built for Success</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-xl font-medium italic border-l-8 border-primary/20 pl-8 text-left">
              A comprehensive toolkit designed for both startups and investors.
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
        <section className="py-32 px-6 bg-[#f8fafc] border-y">
          <div className="max-w-7xl mx-auto space-y-24">
            <div className="text-center space-y-6">
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">Venture Lifecycle</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-xl font-medium italic border-r-8 border-accent/20 pr-8 text-right">
                Dual roadmaps designed for frictionless strategic matching.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-20 relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-muted hidden lg:block" />
              
              {/* Startup Column */}
              <div className="space-y-12">
                <div className="flex items-center gap-4 mb-12">
                  <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl">
                    <Briefcase className="w-7 h-7" />
                  </div>
                  <h3 className="text-3xl font-black tracking-tight">Founder Path</h3>
                </div>

                <div className="space-y-10">
                  {startupSteps.map((step, i) => (
                    <div key={i} className="flex gap-8 group">
                      <div className={cn("w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110", step.bg)}>
                        <step.icon className={cn("w-8 h-8", step.color)} />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xl font-black tracking-tight">{step.title}</h4>
                        <p className="text-muted-foreground font-medium italic leading-relaxed text-sm">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Investor Column */}
              <div className="space-y-12">
                <div className="flex items-center gap-4 mb-12">
                  <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center text-white shadow-xl">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <h3 className="text-3xl font-black tracking-tight">Investor Path</h3>
                </div>

                <div className="space-y-10">
                  {investorSteps.map((step, i) => (
                    <div key={i} className="flex gap-8 group">
                      <div className={cn("w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110", step.bg)}>
                        <step.icon className={cn("w-8 h-8", step.color)} />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xl font-black tracking-tight">{step.title}</h4>
                        <p className="text-muted-foreground font-medium italic leading-relaxed text-sm">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-6 text-center bg-white">
          <div className="max-w-6xl mx-auto p-20 rounded-[3rem] bg-primary text-white space-y-12 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] shadow-primary/40 relative overflow-hidden group">
             <Zap className="absolute -right-20 -bottom-20 w-96 h-96 text-white/10 -rotate-12 transition-transform duration-1000 group-hover:rotate-0 group-hover:scale-110" />
             <h2 className="text-5xl md:text-7xl font-black tracking-tighter relative z-10 leading-[0.95]">Ready to Fuel the <br /><span className="italic text-white/80">Future?</span></h2>
             <p className="text-xl md:text-2xl opacity-90 max-w-2xl mx-auto font-medium italic relative z-10 leading-relaxed border-l-4 border-white/20 pl-8">
               Join our network where startups meet investors.
             </p>
             <div className="flex flex-wrap justify-center gap-10 pt-10 relative z-10">
               <Link href="/signup">
                 <Button size="lg" className="h-20 px-16 text-xl font-black bg-white text-primary hover:bg-white/90 rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95 uppercase tracking-widest">
                   Sign Up Now
                 </Button>
               </Link>
               <Link href="/login">
                 <Button size="lg" variant="outline" className="h-20 px-16 text-xl font-black border-4 border-white text-white hover:bg-white/10 rounded-2xl transition-all uppercase tracking-widest">
                   Login
                 </Button>
               </Link>
             </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
