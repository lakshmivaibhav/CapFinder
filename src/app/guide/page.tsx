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
  Eye,
  Inbox,
  Sparkles,
  BookOpen,
  BarChart3,
  CheckCircle2,
  Lightbulb,
  Target
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
            A friendly roadmap for navigating the global venture capital ecosystem.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Startup Section */}
          <div className="space-y-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl">
                <Briefcase className="w-7 h-7" />
              </div>
              <h2 className="text-3xl font-black tracking-tight">For Startups</h2>
            </div>

            <div className="space-y-6">
              {[
                {
                  title: "1. Create Your Pitch",
                  desc: "Start by adding your startup's core details. Head to your dashboard and fill out the pitch form with your company name, industry, and funding goals.",
                  icon: PlusCircle
                },
                {
                  title: "2. Improve Your Pitch",
                  desc: "A great description is key. Focus on clearly explaining your product, how you'll use the funds, and your long-term vision to attract high-quality partners.",
                  icon: Sparkles
                },
                {
                  title: "3. Send Requests to Investors",
                  desc: "Identify potential capital partners in the market hub. Send connection requests to initiate professional introductions and share your vision.",
                  icon: Mail
                },
                {
                  title: "4. Track Analytics",
                  desc: "Keep a pulse on your progress. Monitor real-time data including pitch views, expressions of interest, and active messaging trends.",
                  icon: BarChart3
                },
                {
                  title: "5. Chat with Investors",
                  desc: "Once an investor accepts your connection, a secure channel opens. Use this hub to answer questions and move toward a partnership.",
                  icon: MessageSquare
                }
              ].map((step, i) => (
                <Card key={i} className="border-none shadow-lg rounded-[2rem] overflow-hidden group hover:shadow-xl transition-all bg-white">
                  <CardHeader className="p-8 flex flex-row items-start gap-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
                      <step.icon className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                      <CardTitle className="text-xl font-black">{step.title}</CardTitle>
                      <CardDescription className="text-sm font-medium leading-relaxed italic text-muted-foreground">{step.desc}</CardDescription>
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
              <h2 className="text-3xl font-black tracking-tight">For Investors</h2>
            </div>

            <div className="space-y-6">
              {[
                {
                  title: "1. Explore Pitches",
                  desc: "Browse a curated feed of high-potential ventures. Filter by sector, capital goals, and industry to find startups that align with your strategy.",
                  icon: Search
                },
                {
                  title: "2. Check Investor Score",
                  desc: "Look for the Maturity Index on every pitch. This helps you understand the quality and completeness of a founder's submission at a glance.",
                  icon: Target
                },
                {
                  title: "3. Receive Requests",
                  desc: "Monitor your connection pipeline. High-growth founders will reach out to you directly with strategic investment opportunities.",
                  icon: Inbox
                },
                {
                  title: "4. Accept & Connect",
                  desc: "Approve connection requests from promising startups to open a direct, secure hub for dialogue and due diligence.",
                  icon: Zap
                },
                {
                  title: "5. Save Interesting Pitches",
                  desc: "Use your personal watchlist to track high-potential startups. Saving a pitch makes it easy to revisit during your next review cycle.",
                  icon: Star
                }
              ].map((step, i) => (
                <Card key={i} className="border-none shadow-lg rounded-[2rem] overflow-hidden group hover:shadow-xl transition-all bg-white">
                  <CardHeader className="p-8 flex flex-row items-start gap-6">
                    <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent shrink-0 group-hover:scale-110 transition-transform">
                      <step.icon className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                      <CardTitle className="text-xl font-black">{step.title}</CardTitle>
                      <CardDescription className="text-sm font-medium leading-relaxed italic text-muted-foreground">{step.desc}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <section className="space-y-10 pt-16">
          <div className="flex items-center justify-center gap-4 text-center">
            <div className="p-4 bg-amber-100 rounded-2xl">
              <Lightbulb className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-4xl font-black tracking-tight">Tips for Best Results</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: "Be Clear and Honest", desc: "Transparency is the foundation of trust. Accurate data leads to better matches." },
              { title: "Keep it Simple", desc: "Focus on your core value. Avoid over-complicating your pitch description." },
              { title: "Respond Quickly", desc: "Momentum matters in venture capital. Quick replies show professional commitment." },
              { title: "Focus on Value", desc: "Always highlight how your venture or partnership solves a real market problem." }
            ].map((tip, i) => (
              <Card key={i} className="border-none shadow-xl rounded-[2rem] bg-white group hover:-translate-y-1 transition-all duration-300">
                <CardContent className="p-8 space-y-4">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  <h4 className="font-black text-lg tracking-tight leading-none">{tip.title}</h4>
                  <p className="text-sm text-muted-foreground font-medium italic">{tip.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

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
