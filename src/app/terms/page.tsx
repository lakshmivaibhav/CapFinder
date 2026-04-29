
"use client";

import Link from 'next/link';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, ShieldCheck, ArrowLeft, BookOpen, AlertCircle } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

export default function TermsPage() {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20">
      <main className="flex-1 p-6 md:p-20 max-w-4xl mx-auto w-full space-y-12">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-all group w-fit">
          <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Return to gateway
        </Link>

        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="p-10 md:p-16 border-b bg-muted/30">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Member Agreement</p>
            </div>
            <CardTitle className="text-4xl md:text-6xl font-black tracking-tighter leading-none">Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="p-10 md:p-16 space-y-12">
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-black tracking-tight">Platform Purpose</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed italic border-l-4 border-primary/20 pl-6">
                CapFinder is an introductory platform designed to facilitate connections between startup founders and potential investors. We provide the tools for discovery and communication, but we are not a financial institution, broker-dealer, or investment advisor.
              </p>
            </section>

            <section className="space-y-8">
              <h3 className="text-xl font-black tracking-tight">User Responsibilities</h3>
              <div className="grid gap-6">
                <div className="p-8 bg-muted/20 rounded-2xl border-l-4 border-primary">
                  <h4 className="font-black text-sm uppercase tracking-widest mb-2">Startup Founders</h4>
                  <p className="text-sm text-muted-foreground">Founders are responsible for the accuracy and legality of all pitch materials. You agree to represent your venture honestly and acknowledge that platform verification does not constitute an endorsement of your business model.</p>
                </div>
                <div className="p-8 bg-muted/20 rounded-2xl border-l-4 border-accent">
                  <h4 className="font-black text-sm uppercase tracking-widest mb-2">Investors</h4>
                  <p className="text-sm text-muted-foreground">Investors acknowledge that early-stage investing carries high risk. You are responsible for conducting your own due diligence before entering into any financial agreements with startups found on the platform.</p>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-xl font-black tracking-tight">Prohibited Activities</h3>
              <ul className="space-y-4">
                {["Submission of fraudulent or misleading information", "Harassment or unsolicited spamming of other members", "Attempting to bypass platform security or scraping member data", "Using the platform for illegal transactions or money laundering"].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
                    <div className="w-1.5 h-1.5 bg-destructive rounded-full shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="pt-10 border-t border-dashed">
              <div className="p-10 bg-primary text-white rounded-[2rem] shadow-xl relative overflow-hidden">
                <ShieldCheck className="absolute -right-10 -bottom-10 w-48 h-48 text-white/10 -rotate-12" />
                <h3 className="text-2xl font-black tracking-tighter mb-4">Agreement to Terms</h3>
                <p className="text-lg opacity-90 italic leading-relaxed">
                  "By creating an account and accessing the platform, you agree to abide by these terms. CapFinder reserves the right to suspend or terminate accounts that violate our community standards or legal protocols."
                </p>
              </div>
            </section>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
