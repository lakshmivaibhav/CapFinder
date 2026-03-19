"use client";

import { use, useEffect, useState } from 'react';
import { doc } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, User, Briefcase, Mail, Globe, ShieldCheck, TrendingUp, Sparkles, Clock, Circle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';

export default function UserProfileViewPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = use(params);
  const { user: currentUser, profile: currentProfile, loading: authLoading } = useAuth();
  const db = useFirestore();
  const [now, setNow] = useState(new Date());

  const userRef = useMemoFirebase(() => doc(db, 'users', uid), [db, uid]);
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
          <Loader2 className="animate-spin w-10 h-10 text-primary" />
        </div>
      </div>
    );
  }

  if (!targetProfile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <User className="w-16 h-16 text-muted-foreground opacity-20" />
          <h2 className="text-2xl font-bold">Profile Not Found</h2>
          <p className="text-muted-foreground">The user you are looking for does not exist or is private.</p>
          <Link href="/dashboard">
            <Button variant="outline">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isStartup = targetProfile.role === 'startup';
  const isInvestor = targetProfile.role === 'investor';

  const lastActiveDate = targetProfile.lastActive?.toDate ? targetProfile.lastActive.toDate() : null;
  const isOnline = lastActiveDate && (now.getTime() - lastActiveDate.getTime()) < 300000; // 5 minutes

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto py-10 px-6 w-full space-y-8">
        <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors w-fit font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Sidebar / Identity Card */}
          <div className="md:col-span-1 space-y-6">
            <Card className="border-none shadow-sm text-center p-8 bg-white overflow-hidden">
              <div className="relative inline-block mx-auto mb-6">
                <div className="w-32 h-32 bg-primary/5 rounded-3xl flex items-center justify-center border-2 border-primary/10 shadow-inner relative overflow-hidden">
                  {targetProfile.photoURL ? (
                    <Image src={targetProfile.photoURL} alt={targetProfile.name || 'Profile'} fill className="object-cover" />
                  ) : (
                    <User className="text-primary w-16 h-16" />
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-full border-4 border-white shadow-sm">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <h1 className="text-2xl font-bold leading-tight mb-1">{targetProfile.name || 'Anonymous'}</h1>
                <div className="flex items-center justify-center gap-2">
                  {isOnline ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-3 py-0.5 gap-1.5">
                      <Circle className="w-2 h-2 fill-current animate-pulse" /> Online
                    </Badge>
                  ) : lastActiveDate ? (
                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 justify-center">
                      <Clock className="w-3 h-3" /> Active {formatDistanceToNow(lastActiveDate, { addSuffix: true })}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-medium italic">Status unknown</span>
                  )}
                </div>
              </div>

              <p className="text-sm font-bold text-primary uppercase tracking-widest mb-4">
                {targetProfile.role}
              </p>
              
              <div className="flex flex-col gap-3 py-6 border-t border-dashed">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium justify-center">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>{targetProfile.company || 'Private Entity'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium justify-center">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{targetProfile.email}</span>
                </div>
              </div>

              {currentUser?.uid === uid && (
                <Link href="/profile" className="w-full">
                  <Button variant="outline" size="sm" className="w-full mt-2">Edit My Profile</Button>
                </Link>
              )}
            </Card>

            <Card className="border-none shadow-sm bg-primary text-white overflow-hidden p-6">
              <h3 className="font-bold mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Verified Status
              </h3>
              <p className="text-[10px] opacity-80 leading-relaxed mb-4">
                This profile has been verified by CapFinder to ensure transparency and trust within our ecosystem.
              </p>
              <div className="h-1 w-full bg-white/20 rounded-full" />
            </Card>
          </div>

          {/* Main Profile Content */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-muted/30 border-b p-8">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl font-bold">About {targetProfile.name || 'User'}</CardTitle>
                    <CardDescription className="mt-1">Professional background and objectives</CardDescription>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-none capitalize px-4 py-1">
                    {targetProfile.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="space-y-4">
                  <h4 className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Biography</h4>
                  <div className="p-6 bg-muted/20 rounded-2xl italic text-lg leading-relaxed text-foreground/80 border-l-4 border-primary/20">
                    "{targetProfile.bio || "This professional has chosen to keep their biography private but is actively looking for strategic partnerships within the CapFinder network."}"
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                  <div className="p-6 bg-muted/10 rounded-2xl border">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5" /> Organization
                    </p>
                    <p className="font-bold text-lg">{targetProfile.company || 'Not Specified'}</p>
                  </div>

                  {isStartup && (
                    <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-widest mb-2 flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5" /> Funding Needed
                      </p>
                      <p className="font-bold text-lg text-emerald-700">
                        ${targetProfile.fundingNeeded?.toLocaleString() || '0'}
                      </p>
                    </div>
                  )}

                  {isInvestor && (
                    <div className="p-6 bg-accent/5 rounded-2xl border border-accent/10 col-span-1 sm:col-span-2">
                      <p className="text-[10px] uppercase font-bold text-accent tracking-widest mb-2 flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5" /> Investment Interests
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {targetProfile.investmentInterest ? (
                          targetProfile.investmentInterest.split(',').map((interest: string, i: number) => (
                            <Badge key={i} variant="secondary" className="bg-accent/10 text-accent border-none font-medium">
                              {interest.trim()}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground italic">No specific interests listed.</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {isStartup && (
              <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="p-8 pb-4">
                  <CardTitle className="text-xl font-bold">Latest Ventures</CardTitle>
                  <CardDescription>Active investment pitches posted by this founder</CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-2">
                  <p className="text-sm text-muted-foreground italic">
                    Visit the <Link href="/pitches" className="text-primary hover:underline">Marketplace</Link> to view all active pitches from {targetProfile.name}.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
