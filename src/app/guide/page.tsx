"use client";

import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Eye,
  Inbox,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

/**
 * @fileOverview Platform guide for CapFinder.
 * Provides a structured roadmap for Founders and Investors to maximize platform utility.
 */
export default function GuidePage() {
  const { user } = useAuth();
  
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

      <main className="flex-1 p-6 md:p-20 max-w-6xl mx-auto w-full space-y-16">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-all group w-fit">
          <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Return to {user ? "Dashboard" : "Gateway"}
        </Link>

        <section className="space-y-6 text-center">
          <Badge className="bg-primary/10 text-primary border-none rounded-lg px-4 py-1.5 font-black uppercase text-[10px] tracking-widest">Platform Manual</Badge>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">How to Use <span className="text-primary italic">CapFinder</span></h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium italic">
            A tactical guide to navigating the global venture capital ecosystem.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Startup Section */}
          <div className="space-y-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl">
                <Briefcase className="w-7 h-7" />
              </div>
              <h2 className="text-3xl font-black tracking-tight">For Founders</h2>
            </div>

            <div className="space-y-6">
              {[
                {
                  title: "1. Create Your Venture Pitch",
                  desc: "Initialize your profile and use our AI Pitch Assistant to craft a compelling narrative that resonates with institutional investors.",
                  icon: PlusCircle
                },
                {
                  title: "2. Verify Your Identity",
                  desc: "Complete the verification protocol to earn the 'Verified' badge, signaling trust and institutional quality to the network.",
                  icon: ShieldCheck
                },
                {
                  title: "3. Gain Market Discovery",
                  desc: "Your pitch enters the discovery feed where it is matched with capital partners based on sector, stage, and capital goals.",
                  icon: Eye
                },
                {
                  title: "4. Manage Engagements",
                  desc: "Accept connection requests to open secure messaging hubs. Share detailed metrics and term sheets privately.",
                  icon: MessageSquare
                }
              ].map((step, i) => (
                <Card key={i} className="border-none shadow-lg rounded-[2rem] overflow-hidden group hover:shadow-xl transition-all">
                  <CardHeader className="p-8 flex flex-row items-center gap-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
                      <step.icon className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-xl font-black">{step.title}</CardTitle>
                      <CardDescription className="text-sm font-medium leading-relaxed italic">{step.desc}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          {/* Investor Section */}
          <div className="space-y-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center text-white shadow-xl">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h2 className="text-3xl font-black tracking-tight">For Capital Partners</h2>
            </div>

            <div className="space-y-6">
              {[
                {
                  title: "1. Define Strategic Thesis",
                  desc: "Set your investment interests in your profile to power the recommendation engine and see ventures that align with your focus.",
                  icon: Sparkles
                },
                {
                  title: "2. Explore the Feed",
                  desc: "Filter through verified startup pitches. Use discovery tools to identify high-velocity ventures early.",
                  icon: Search
                },
                {
                  title: "3. Initiate Inquiries",
                  desc: "Log 'Strategic Interest' to track ventures or send a 'Contact Request' to open a direct channel with the founders.",
                  icon: Inbox
                },
                {
                  title: "4. Execute Due Diligence",
                  desc: "Enter secure hubs to review venture data rooms, exchange documents, and finalize institutional partnerships.",
                  icon: TrendingUp
                }
              ].map((step, i) => (
                <Card key={i} className="border-none shadow-lg rounded-[2rem] overflow-hidden group hover:shadow-xl transition-all">
                  <CardHeader className="p-8 flex flex-row items-center gap-6">
                    <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent shrink-0 group-hover:scale-110 transition-transform">
                      <step.icon className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-xl font-black">{step.title}</CardTitle>
                      <CardDescription className="text-sm font-medium leading-relaxed italic">{step.desc}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <section className="p-12 md:p-16 rounded-[3rem] bg-muted/30 border-2 border-muted text-center space-y-8">
          <BookOpen className="w-12 h-12 mx-auto text-primary" />
          <h2 className="text-3xl font-black tracking-tight leading-none">Ready to begin?</h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto font-medium italic">
            The future of early-stage investing is here. Start your discovery today.
          </p>
          <div className="pt-4">
            <Link href={user ? "/dashboard" : "/signup"}>
              <Button size="lg" className="h-16 px-12 bg-primary rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all text-xs">
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
