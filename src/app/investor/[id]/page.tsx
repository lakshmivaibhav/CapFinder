"use client";

import { use, useEffect, useState } from 'react';
import { doc } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, User, Briefcase, Mail, Globe, ShieldCheck, TrendingUp, Sparkles, Clock, Circle, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

export default function InvestorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user: currentUser, profile: currentProfile, loading: authLoading, emailVerified } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.push('/login');
      } else if (!emailVerified) {
        router.push('/verify-email');
      }
    }
  }, [currentUser, authLoading, emailVerified, router]);

  const userRef = useMemoFirebase(() => {
    if (!currentUser) return null;
    return doc(db, 'users', id);
  }, [db, id, currentUser]);
  const { data: targetProfile, isLoading: loadingProfile } = useDoc(userRef);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  if (loadingProfile || authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin w-12 h-12 text-primary opacity-20" />
        </div>
      </div>
    );
  }

  if (!currentUser || !emailVerified) return null;

  if (!targetProfile || targetProfile.role !== 'investor') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center space-y-8">
          <div className="p-6 bg-muted rounded-full">
            <User className="w-16 h-16 text-muted-foreground opacity-20" />
          </div>
          <h2 className="text-3xl font-black tracking-tight">Investor Profile Not Found</h2>
          <p className="text-muted-foreground text-center max-w-sm">The requested identity is either private or does not match our investor credentials.</p>
          <Link href="/dashboard">
            <Button variant="outline" className="rounded-xl border-2 px-8 font-bold">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const lastActiveDate = targetProfile.lastActive?.toDate ? targetProfile.lastActive.toDate() : null;
  const isOnline = lastActiveDate && (now.getTime() - lastActiveDate.getTime()) < 300000;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto py-16 px-6 w-full space-y-12">
        <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all w-fit font-black text-xs uppercase tracking-widest group">
          <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Back to marketplace
        </Link>

        <div className="grid md:grid-cols-3 gap-12">
          <div className="md:col-span-1 space-y-8">
            <Card className="border-none shadow-2xl text-center p-12 bg-white rounded-[2.5rem] overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-2 bg-accent" />
              <div className="relative inline-block mx-auto mb-8">
                <div className="w-40 h-40 bg-muted rounded-[2rem] flex items-center justify-center border-4 border-white shadow-inner relative overflow-hidden">
                  {targetProfile.photoURL ? (
                    <Image src={targetProfile.photoURL} alt={targetProfile.name || 'Investor'} fill className="object-cover" />
                  ) : (
                    <User className="text-muted-foreground opacity-30 w-16 h-16" />
                  )}
                </div>
                {targetProfile.verified && (
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2.5 rounded-2xl border-4 border-white shadow-lg">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                )}
              </div>
              
              <div className="space-y-3 mb-8">
                <h1 className="text-3xl font-black leading-tight tracking-tight">{targetProfile.name || 'Anonymous Investor'}</h1>
                <div className="flex items-center justify-center gap-3">
                  {isOnline ? (
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none px-4 py-1 gap-2 rounded-lg font-black text-[10px] uppercase tracking-widest">
                      <Circle className="w-2 h-2 fill-current animate-pulse" /> Active Now
                    </Badge>
                  ) : lastActiveDate ? (
                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-2 justify-center">
                      <Clock className="w-3.5 h-3.5 text-primary" /> Last Seen {formatDistanceToNow(lastActiveDate, { addSuffix: true })}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-black italic uppercase tracking-widest">Session Inactive</span>
                  )}
                </div>
              </div>

              <Badge className="bg-accent/10 text-accent border-none rounded-xl px-6 py-2 text-[10px] font-black uppercase tracking-widest mb-10">
                Capital Partner
              </Badge>
              
              <div className="flex flex-col gap-4 py-8 border-t border-dashed">
                <div className="flex items-center gap-3 text-sm font-bold text-foreground justify-center">
                  <Briefcase className="w-4 h-4 text-accent" />
                  <span>{targetProfile.company || 'Venture Group'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-bold text-muted-foreground justify-center">
                  <Mail className="w-4 h-4 text-accent" />
                  <span className="truncate max-w-[200px]">{targetProfile.email}</span>
                </div>
              </div>
            </Card>

            {targetProfile.verified && (
              <Card className="border-none shadow-xl bg-emerald-600 text-white overflow-hidden rounded-[2rem] p-10 relative">
                <Sparkles className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5 -rotate-12" />
                <h3 className="text-xl font-black mb-4 flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6" /> Verified Partner
                </h3>
                <p className="text-sm opacity-90 leading-relaxed font-medium italic">
                  "This identity has satisfied the preliminary verification protocols required for verified strategic interactions."
                </p>
                <div className="h-1.5 w-full bg-white/20 rounded-full mt-6" />
              </Card>
            )}
          </div>

          <div className="md:col-span-2 space-y-8">
            <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-[2.5rem]">
              <CardHeader className="bg-muted/30 border-b p-10">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-3xl font-black tracking-tight">Investment Thesis</CardTitle>
                    <CardDescription className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Strategic Objectives & Focus</CardDescription>
                  </div>
                  {targetProfile.verified && (
                    <Badge className="bg-accent text-white border-none rounded-lg px-4 py-1 text-[10px] font-black uppercase tracking-widest">
                      Certified
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-10 space-y-12">
                <div className="space-y-6">
                  <h4 className="text-[10px] uppercase font-black text-accent tracking-[0.3em] flex items-center gap-3">
                    <div className="w-2 h-2 bg-accent rounded-full" /> Narrative
                  </h4>
                  <div className="p-10 bg-muted/20 rounded-[2rem] italic text-2xl leading-relaxed text-foreground/80 border-l-8 border-accent/20 shadow-inner">
                    "{targetProfile.bio || "This investor is actively identifying the next generation of global market disruptions and looking for strategic partnerships within the CapFinder network."}"
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-8 pt-6">
                  <div className="p-8 bg-accent/5 rounded-3xl border-2 border-accent/10 group hover:border-accent transition-all">
                    <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-6 flex items-center gap-3">
                      <Sparkles className="w-4 h-4" /> Strategic Focus
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {targetProfile.investmentInterest ? (
                        targetProfile.investmentInterest.split(',').map((interest: string, i: number) => (
                          <Badge key={i} variant="secondary" className="bg-white text-accent border-2 border-accent/10 font-black text-[11px] uppercase px-6 py-2 rounded-xl">
                            {interest.trim()}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground font-medium italic p-4 bg-white rounded-xl border border-dashed">General Venture Interests</span>
                      )}
                    </div>
                  </div>

                  <div className="p-8 bg-white border-2 border-muted shadow-sm rounded-3xl group hover:border-accent transition-all">
                    <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-4 flex items-center gap-3">
                      <Globe className="w-4 h-4 text-accent" /> Institutional Affiliation
                    </p>
                    <p className="font-black text-2xl group-hover:text-accent transition-colors">{targetProfile.company || 'Private Investment Group'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-[2.5rem]">
              <CardHeader className="p-10 pb-4">
                <CardTitle className="text-2xl font-black flex items-center gap-3">
                  <LayoutGrid className="w-6 h-6 text-accent" /> Engagement History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10 pt-4">
                <p className="text-md text-muted-foreground leading-relaxed italic border-l-4 border-accent/20 pl-6">
                  Historical investment performance and syndicate participation data is restricted to verified founders during active inquiry phases. Visit the <Link href="/pitches" className="text-accent hover:underline font-black">Market Feed</Link> for more context.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
