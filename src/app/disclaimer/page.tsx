
"use client";

import Link from 'next/link';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, ArrowLeft, Info, HelpCircle } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

export default function DisclaimerPage() {
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
          <CardHeader className="p-10 md:p-16 border-b bg-destructive/5">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-destructive/10 rounded-xl">
                <ShieldAlert className="w-6 h-6 text-destructive" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-destructive">Notice</p>
            </div>
            <CardTitle className="text-4xl md:text-6xl font-black tracking-tighter leading-none">Legal Disclaimer</CardTitle>
          </CardHeader>
          <CardContent className="p-10 md:p-16 space-y-12">
            <section className="space-y-6">
              <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                <Info className="w-5 h-5 text-primary" />
                Not an Investment Advisor
              </h3>
              <p className="text-muted-foreground leading-relaxed italic border-l-4 border-destructive/20 pl-6 text-lg">
                CapFinder is not a broker, investment advisor, or financial portal. We do not provide investment, legal, or tax advice. The platform's sole purpose is to provide an introduction layer between professional innovators and capital partners.
              </p>
            </section>

            <section className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 bg-muted/20 rounded-3xl space-y-4">
                  <h4 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-primary" /> No Guarantees
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">CapFinder does not guarantee that startups will receive funding or that investors will find suitable opportunities. Success in the ecosystem is subject to market forces and individual negotiations.</p>
                </div>
                <div className="p-8 bg-muted/20 rounded-3xl space-y-4">
                  <h4 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-primary" /> High Risk Notice
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">Early-stage startups are high-risk ventures. Investors may lose some or all of their capital. CapFinder is not liable for any financial losses incurred through connections made on the platform.</p>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-xl font-black tracking-tight">Due Diligence</h3>
              <p className="text-muted-foreground leading-relaxed font-medium">
                The presence of a "Verified" badge on a member's profile indicates that we have confirmed their basic identity and professional credentials through a preliminary check. It is not an endorsement of their character, business viability, or financial health. <strong>Full due diligence is the sole responsibility of the participating parties.</strong>
              </p>
            </section>

            <section className="pt-10 border-t border-dashed">
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] text-center italic">
                Platform protocols updated for Q4 2024 compliance.
              </p>
            </section>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
