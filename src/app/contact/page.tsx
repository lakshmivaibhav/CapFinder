
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, MessageSquare, ShieldCheck, Zap, ArrowLeft, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';

export default function ContactPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({ title: "Message Sent", description: "Our support team will get back to you within 24-48 hours." });
      (e.target as HTMLFormElement).reset();
    }, 1500);
  };

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
        </header>
      ) : (
        <Navbar />
      )}

      <main className="flex-1 p-6 md:p-20 max-w-6xl mx-auto w-full space-y-16">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-all group w-fit">
          <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Return to gateway
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          <div className="lg:col-span-5 space-y-12">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight">Get in <span className="text-primary">Touch</span></h1>
              <p className="text-xl text-muted-foreground font-medium italic border-l-4 border-primary/20 pl-6 leading-relaxed">
                Have questions about verification, account management, or institutional support? Our team is here to help.
              </p>
            </div>

            <div className="space-y-8">
              <div className="flex items-center gap-6 p-8 bg-white rounded-[2rem] shadow-lg border-2 border-muted group hover:border-primary/20 transition-all">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Support Email</p>
                  <p className="text-lg font-black">support@capfinder.com</p>
                </div>
              </div>

              <div className="flex items-center gap-6 p-8 bg-white rounded-[2rem] shadow-lg border-2 border-muted group hover:border-primary/20 transition-all">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Partnerships</p>
                  <p className="text-lg font-black">partners@capfinder.com</p>
                </div>
              </div>
            </div>

            <div className="p-10 bg-muted/30 rounded-[2.5rem] space-y-4">
              <h3 className="font-black text-xl tracking-tight">Need immediate help?</h3>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed italic">
                Check our <Link href="/faq" className="text-primary hover:underline font-bold">FAQ page</Link> for instant answers to common platform inquiries.
              </p>
            </div>
          </div>

          <Card className="lg:col-span-7 border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
            <CardHeader className="p-10 md:p-12 border-b bg-muted/20">
              <div className="flex items-center gap-3 mb-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <CardTitle className="text-2xl font-black tracking-tight">Send a Message</CardTitle>
              </div>
              <CardDescription className="text-sm font-medium">Complete the form below and we'll route your request to the appropriate department.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 md:p-12">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                    <Input id="name" required className="h-14 rounded-2xl bg-muted/30 border-none shadow-inner focus:ring-4 focus:ring-primary/10 text-lg font-medium px-6" placeholder="Your Name" />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</Label>
                    <Input id="email" type="email" required className="h-14 rounded-2xl bg-muted/30 border-none shadow-inner focus:ring-4 focus:ring-primary/10 text-lg font-medium px-6" placeholder="name@company.com" />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="subject" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Subject</Label>
                  <Input id="subject" required className="h-14 rounded-2xl bg-muted/30 border-none shadow-inner focus:ring-4 focus:ring-primary/10 text-lg font-medium px-6" placeholder="How can we help?" />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="message" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Message</Label>
                  <Textarea id="message" required className="min-h-[200px] rounded-[1.5rem] bg-muted/30 border-none shadow-inner focus:ring-4 focus:ring-primary/10 text-lg font-medium p-8 italic" placeholder="Provide as much detail as possible..." />
                </div>

                <Button type="submit" className="w-full h-16 bg-primary shadow-xl shadow-primary/20 rounded-2xl font-black text-lg gap-3 transition-all hover:scale-[1.01] active:scale-95 uppercase tracking-widest" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : <><Send className="w-5 h-5" /> Submit Request</>}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
