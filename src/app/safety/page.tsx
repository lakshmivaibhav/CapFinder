
"use client";

import Link from 'next/link';
import { Footer } from '@/components/footer';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, ArrowLeft, Zap, Lock, Eye, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

export default function SafetyPage() {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20">
      {user && <Navbar />}

      <main className="flex-1 p-6 md:p-20 max-w-5xl mx-auto w-full space-y-16">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-all group w-fit">
          <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Return to gateway
        </Link>

        <section className="space-y-6 text-center md:text-left">
          <Badge className="bg-emerald-500/10 text-emerald-600 border-none rounded-lg px-4 py-1.5 font-black uppercase text-[10px] tracking-widest">Trust Protocol</Badge>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight">Trust & <span className="text-primary">Safety</span></h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl font-medium italic border-l-8 border-emerald-500/20 pl-8 leading-relaxed">
            Our mission is to maintain the highest levels of integrity within the CapFinder ecosystem.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-10 bg-white rounded-[2.5rem] shadow-xl border-2 border-muted space-y-6">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-black tracking-tight">Identity Verification</h3>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">Every account undergoes a preliminary manual review to confirm professional background and institutional affiliation.</p>
          </div>
          <div className="p-10 bg-white rounded-[2.5rem] shadow-xl border-2 border-muted space-y-6">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <Eye className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-black tracking-tight">Venture Integrity</h3>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">We monitor venture activities to prevent fraudulent pitches or misleading financial metrics from entering the feed.</p>
          </div>
          <div className="p-10 bg-white rounded-[2.5rem] shadow-xl border-2 border-muted space-y-6">
            <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
              <Zap className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-black tracking-tight">Secure Channels</h3>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">Private messages are strictly isolated between connected partners, ensuring your strategy remains proprietary.</p>
          </div>
        </div>

        <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white">
          <CardHeader className="p-10 md:p-16 border-b bg-muted/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-primary" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Security Guidelines</p>
            </div>
            <CardTitle className="text-4xl font-black tracking-tighter">Stay Safe on the Platform</CardTitle>
          </CardHeader>
          <CardContent className="p-10 md:p-16 space-y-12">
            <div className="grid gap-10">
              <div className="space-y-4">
                <h4 className="font-black text-xl tracking-tight flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  Keep it on CapFinder
                </h4>
                <p className="text-muted-foreground font-medium leading-relaxed italic border-l-4 border-primary/20 pl-6">
                  For your safety and protection, always maintain your initial venture discussions and document exchanges within our secure messaging hub. This allows us to maintain a record in case of disputes.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-black text-xl tracking-tight flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  Reporting Abuse
                </h4>
                <p className="text-muted-foreground font-medium leading-relaxed italic border-l-4 border-primary/20 pl-6">
                  If you encounter a user engaging in harassment, spam, or suspicious financial requests, use our report feature or contact us directly. We maintain a zero-tolerance policy for ecosystem abuse.
                </p>
              </div>
            </div>

            <div className="p-12 bg-destructive text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
               <ShieldAlert className="absolute -right-10 -bottom-10 w-48 h-48 text-white/10 -rotate-12 transition-transform duration-1000 group-hover:rotate-0" />
               <h3 className="text-2xl font-black tracking-tighter mb-4">Fraud Prevention</h3>
               <p className="text-lg opacity-90 italic leading-relaxed">
                 "CapFinder will NEVER ask for your password via email or request financial transfers directly. Always verify the 'Verified ID' badge on partner profiles before sharing sensitive data."
               </p>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
