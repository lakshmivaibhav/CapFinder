"use client";

import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Briefcase, 
  ShieldCheck, 
  Search, 
  MessageSquare, 
  TrendingUp, 
  ArrowLeft, 
  PlusCircle,
  Inbox,
  Sparkles,
  BookOpen,
  BarChart3,
  CheckCircle2,
  Lightbulb,
  Target,
  Mail,
  Star,
  Clock
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Platform guide for CapFinder.
 * Provides a structured roadmap for Founders and Investors to maximize platform utility.
 */
export default function GuidePage() {
  const { user } = useAuth();
  
  const startupSteps = [
    {
      title: "1. Create Your Pitch",
      desc: "Start by adding your startup's core details. Head to your dashboard and fill out the pitch form with your company name, industry, and funding goals.",
      icon: PlusCircle,
      color: "text-primary",
      bg: "bg-primary/10"
    },
    {
      title: "2. Improve Your Pitch",
      desc: "A great description is key. Focus on clearly explaining your product, how you'll use the funds, and your long-term vision to attract high-quality partners.",
      icon: Sparkles,
      color: "text-primary",
      bg: "bg-primary/10"
    },
    {
      title: "3. Send Requests to Investors",
      desc: "Identify potential capital partners in the market hub. Send connection requests to initiate professional introductions and share your vision.",
      icon: Mail,
      color: "text-primary",
      bg: "bg-primary/10"
    },
    {
      title: "4. Track Analytics",
      desc: "Keep a pulse on your progress. Monitor real-time data including pitch views, expressions of interest, and active messaging trends.",
      icon: BarChart3,
      color: "text-primary",
      bg: "bg-primary/10"
    },
    {
      title: "5. Chat with Investors",
      desc: "Once an investor accepts your connection, a secure channel opens. Use this hub to answer questions and move toward a partnership.",
      icon: MessageSquare,
      color: "text-primary",
      bg: "bg-primary/10"
    }
  ];

  const investorSteps = [
    {
      title: "1. Explore Pitches",
      desc: "Browse a curated feed of high-potential ventures. Filter by sector, capital goals, and industry to find startups that align with your strategy.",
      icon: Search,
      color: "text-accent",
      bg: "bg-accent/10"
    },
    {
      title: "2. Check Investor Score",
      desc: "Look for the Maturity Index on every pitch. This helps you understand the quality and completeness of a founder's submission at a glance.",
      icon: Target,
      color: "text-accent",
      bg: "bg-accent/10"
    },
    {
      title: "3. Receive Requests",
      desc: "Monitor your connection pipeline. High-growth founders will reach out to you directly with strategic investment opportunities.",
      icon: Inbox,
      color: "text-accent",
      bg: "bg-accent/10"
    },
    {
      title: "4. Accept & Connect",
      desc: "Approve connection requests from promising startups to open a direct, secure hub for dialogue and due diligence.",
      icon: Zap,
      color: "text-accent",
      bg: "bg-accent/10"
    },
    {
      title: "5. Save Interesting Pitches",
      desc: "Use your personal watchlist to track high-potential startups. Saving a pitch makes it easy to revisit during your next review cycle.",
      icon: Star,
      color: "text-accent",
      bg: "bg-accent/10"
    }
  ];

  const tips = [
    { title: "Be Clear and Honest", desc: "Transparency is the foundation of trust. Accurate data leads to better matches.", icon: CheckCircle2 },
    { title: "Keep it Simple", desc: "Focus on your core value. Avoid over-complicating your pitch description.", icon: Lightbulb },
    { title: "Respond Quickly", desc: "Momentum matters in venture capital. Quick replies show professional commitment.", icon: Clock },
    { title: "Focus on Value", desc: "Always highlight how your venture or partnership solves a real market problem.", icon: Target }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20">
      {user ? <Navbar /> : (
        <header className="px-8 h-24 flex items-center justify-between border-b bg-white/80 backdrop-blur-xl sticky top-0 z-50">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-all duration-500">
              <Zap className="text-white w-7 h-7 fill-current" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors">CapFinder</span>
          </Link>
          <Link href="/login">
            <Button variant="ghost" className="font-black uppercase text-[10px] tracking-widest h-12 px-6 rounded-xl">Login</Button>
          </Link>
        </header>
      )}

      <main className="flex-1 p-6 md:p-20 max-w-7xl mx-auto w-full space-y-24">
        <div className="space-y-8 text-center">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-all group w-fit mx-auto">
            <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-all">
              <ArrowLeft className="w-4 h-4" />
            </div>
            Return to {user ? "Dashboard" : "Gateway"}
          </Link>

          <div className="space-y-4">
            <Badge className="bg-primary/10 text-primary border-none rounded-lg px-4 py-1.5 font-black uppercase text-[10px] tracking-widest">Ecosystem Roadmap</Badge>
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-none">How to Use <span className="text-primary italic">CapFinder</span></h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto font-medium italic">
              Master the strategic protocols of the global venture capital gateway.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-24">
          {/* Startup Section */}
          <div className="space-y-12">
            <div className="flex items-center gap-6 border-b pb-8">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-primary/20">
                <Briefcase className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-4xl font-black tracking-tight">For Startups</h2>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mt-1">Growth Protocol</p>
              </div>
            </div>

            <div className="grid gap-6">
              {startupSteps.map((step, i) => (
                <Card key={i} className="border-none shadow-xl rounded-[2.5rem] overflow-hidden group hover:shadow-2xl transition-all duration-500 bg-white hover:-translate-y-1">
                  <CardHeader className="p-8 md:p-10 flex flex-row items-start gap-8">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500 shadow-inner", step.bg)}>
                      <step.icon className={cn("w-7 h-7", step.color)} />
                    </div>
                    <div className="space-y-3">
                      <CardTitle className="text-2xl font-black tracking-tight leading-none">{step.title}</CardTitle>
                      <CardDescription className="text-md font-medium leading-relaxed italic text-muted-foreground/80">{step.desc}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          {/* Investor Section */}
          <div className="space-y-12">
            <div className="flex items-center gap-6 border-b pb-8">
              <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-accent/20">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-4xl font-black tracking-tight">For Investors</h2>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mt-1">Capital Deployment</p>
              </div>
            </div>

            <div className="grid gap-6">
              {investorSteps.map((step, i) => (
                <Card key={i} className="border-none shadow-xl rounded-[2.5rem] overflow-hidden group hover:shadow-2xl transition-all duration-500 bg-white hover:-translate-y-1">
                  <CardHeader className="p-8 md:p-10 flex flex-row items-start gap-8">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500 shadow-inner", step.bg)}>
                      <step.icon className={cn("w-7 h-7", step.color)} />
                    </div>
                    <div className="space-y-3">
                      <CardTitle className="text-2xl font-black tracking-tight leading-none">{step.title}</CardTitle>
                      <CardDescription className="text-md font-medium leading-relaxed italic text-muted-foreground/80">{step.desc}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <section className="space-y-16 pt-16 border-t border-dashed">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center p-4 bg-amber-100 rounded-3xl mb-4 shadow-inner">
              <Lightbulb className="w-10 h-10 text-amber-600" />
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight">Tips for Best Results</h2>
            <p className="text-lg text-muted-foreground font-medium italic">Maximize your strategic impact within the network.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {tips.map((tip, i) => (
              <Card key={i} className="border-none shadow-xl rounded-[2.5rem] bg-white group hover:-translate-y-2 transition-all duration-500 border-b-8 border-transparent hover:border-amber-400">
                <CardContent className="p-10 space-y-6">
                  <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                    <tip.icon className="w-6 h-6 text-amber-600" />
                  </div>
                  <h4 className="font-black text-xl tracking-tight leading-none">{tip.title}</h4>
                  <p className="text-sm text-muted-foreground font-medium italic leading-relaxed">{tip.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="p-16 md:p-24 rounded-[4rem] bg-[#1a1a1a] text-white text-center space-y-12 relative overflow-hidden group shadow-3xl">
          <Zap className="absolute -right-20 -bottom-20 w-96 h-96 text-white/5 -rotate-12 transition-transform duration-1000 group-hover:rotate-0 group-hover:scale-110" />
          <BookOpen className="w-16 h-16 mx-auto text-primary animate-pulse" />
          <div className="space-y-4 relative z-10">
            <h2 className="text-4xl md:text-7xl font-black tracking-tighter leading-none">Ready to begin?</h2>
            <p className="text-xl md:text-2xl text-white/60 max-w-2xl mx-auto font-medium italic">
              The future of venture discovery is operational. Initialize your presence today.
            </p>
          </div>
          <div className="pt-8 relative z-10 flex justify-center">
            <Link href={user ? "/dashboard" : "/signup"}>
              <Button size="lg" className="h-20 px-16 bg-primary hover:bg-primary/90 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all text-sm">
                {user ? "Enter Console" : "Join Ecosystem"}
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
