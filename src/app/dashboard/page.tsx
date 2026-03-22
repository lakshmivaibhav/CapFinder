
"use client";

import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, limit, doc, getDocs, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Plus, Megaphone, ArrowRight, Users, Star, Search, LayoutGrid, Inbox, Sparkles, Zap, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const { user, profile, loading: authLoading, emailVerified } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (!emailVerified) {
        router.push('/verify-email');
      } else if (!profile) {
        router.push('/onboarding');
      }
    }
  }, [user, profile, authLoading, emailVerified, router]);

  const isStartup = profile?.role === 'startup';
  const isInvestor = profile?.role === 'investor';
  const isAdmin = profile?.role === 'admin';

  // Startup Specific Queries - Optimized with limits
  const startupPitchesQuery = useMemoFirebase(() => {
    if (!user || !profile || !isStartup || profile.disabled === true) return null;
    return query(collection(db, 'pitches'), where('ownerId', '==', user.uid), limit(20));
  }, [db, user, profile, isStartup]);

  const startupInterestsQuery = useMemoFirebase(() => {
    if (!user || !profile || !isStartup || profile.disabled === true) return null;
    return query(collection(db, 'interests'), where('startupOwnerId', '==', user.uid), limit(50));
  }, [db, user, profile, isStartup]);

  const startupContactRequestsQuery = useMemoFirebase(() => {
    if (!user || !profile || !isStartup || profile.disabled === true) return null;
    return query(collection(db, 'contactRequests'), where('receiverId', '==', user.uid), limit(50));
  }, [db, user, profile, isStartup]);

  // Investor Specific Queries - Optimized with limits
  const investorInterestsQuery = useMemoFirebase(() => {
    if (!user || !profile || !isInvestor || profile.disabled === true) return null;
    return query(collection(db, 'interests'), where('investorId', '==', user.uid), limit(50));
  }, [db, user, profile, isInvestor]);

  const investorContactRequestsQuery = useMemoFirebase(() => {
    if (!user || !profile || !isInvestor || profile.disabled === true) return null;
    return query(collection(db, 'contactRequests'), where('senderId', '==', user.uid), limit(50));
  }, [db, user, profile, isInvestor]);

  // General Market Feed - Limit 50 for performance
  const allPitchesQuery = useMemoFirebase(() => {
    if (!user || !profile || (!isInvestor && !isAdmin) || profile.disabled === true) return null;
    return query(collection(db, 'pitches'), limit(50));
  }, [db, user, profile, isInvestor, isAdmin]);

  const { data: startupPitches, isLoading: loadingStartupPitches } = useCollection(startupPitchesQuery);
  const { data: startupInterests } = useCollection(startupInterestsQuery);
  const { data: startupContactRequests } = useCollection(startupContactRequestsQuery);
  
  const { data: investorInterests } = useCollection(investorInterestsQuery);
  const { data: investorContactRequests } = useCollection(investorContactRequestsQuery);
  
  const { data: allPitches, isLoading: loadingAllPitches } = useCollection(allPitchesQuery);

  const handleResolveConnection = async (pitchId: string, startupOwnerId: string, startupName: string) => {
    if (!user || !isInvestor) return;
    if (!confirm(`Resolve connection with ${startupName}? This will clear your interest, requests, and associated data.`)) return;

    setResolving(pitchId);
    try {
      const reqSnap = await getDocs(query(
        collection(db, 'contactRequests'), 
        where('pitchId', '==', pitchId),
        where('senderId', '==', user.uid)
      ));
      reqSnap.docs.forEach(d => deleteDocumentNonBlocking(doc(db, 'contactRequests', d.id)));

      const intSnap = await getDocs(query(
        collection(db, 'interests'), 
        where('pitchId', '==', pitchId),
        where('investorId', '==', user.uid)
      ));
      intSnap.docs.forEach(d => deleteDocumentNonBlocking(doc(db, 'interests', d.id)));

      toast({ title: "Connection resolved", description: "Records for this pitch have been cleared." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Resolve failed", description: e.message });
    } finally {
      setResolving(null);
    }
  };

  const recommendedPitches = useMemo(() => {
    if (!isInvestor || !allPitches || !profile?.investmentInterest) return [];
    const rawInterests = profile.investmentInterest.toLowerCase().split(',');
    const interests = rawInterests.map(i => i.trim()).filter(Boolean);
    if (interests.length === 0) return [];

    return allPitches
      .map(pitch => {
        let score = 0;
        const pCategory = (pitch.category || pitch.industry || 'Other').toLowerCase();
        const description = (pitch.description || '').toLowerCase();
        interests.forEach(interest => {
          if (pCategory.includes(interest)) score += 10;
          if (description.includes(interest)) score += 2;
        });
        return { ...pitch, score };
      })
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [isInvestor, allPitches, profile]);

  if (authLoading || (user && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin w-12 h-12 text-primary opacity-20" />
      </div>
    );
  }

  if (!user || !profile || !emailVerified) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">System Overview</p>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-none">Welcome, {profile.name || user.email?.split('@')[0]}</h1>
            <div className="text-muted-foreground flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs md:text-sm font-medium">
              Console authenticated for <span className="text-foreground capitalize font-black underline decoration-primary decoration-4 underline-offset-8">{profile.role}</span>
              {isAdmin && <Badge className="bg-destructive text-white border-none ml-2 rounded-lg font-black uppercase text-[8px] px-3">Root Admin</Badge>}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            {isStartup && (
              <Link href="/pitches/new" className="w-full sm:w-auto">
                <Button className="w-full gap-3 h-14 px-8 rounded-xl bg-primary shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all font-black uppercase tracking-widest text-[10px]">
                  <Plus className="w-5 h-5" /> New Venture Pitch
                </Button>
              </Link>
            )}
            {(isInvestor || isAdmin) && (
              <Link href="/pitches" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full gap-3 h-14 px-8 rounded-xl border-2 hover:bg-primary/5 transition-all font-black uppercase tracking-widest text-[10px]">
                  <Search className="w-5 h-5" /> Browse Marketplace
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mb-16">
          <Card className="border-none shadow-xl bg-primary/5 rounded-[2rem] overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <CardContent className="p-10 flex items-center gap-8">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-primary/30">
                <Megaphone className="w-8 h-8" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">{isStartup ? 'Total Portfolio' : 'Strategic Interests'}</p>
                <p className="text-4xl font-black tracking-tighter">
                  {isStartup ? (startupPitches?.length || 0) : (investorInterests?.length || 0)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-xl bg-accent/5 rounded-[2rem] overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <CardContent className="p-10 flex items-center gap-8">
              <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-accent/30">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">{isStartup ? 'Engagements' : 'Access Requests'}</p>
                <p className="text-4xl font-black tracking-tighter">
                  {isStartup ? (startupInterests?.length || 0) : (investorContactRequests?.length || 0)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-xl bg-emerald-50 rounded-[2rem] overflow-hidden relative group sm:col-span-2 md:col-span-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <CardContent className="p-10 flex items-center gap-8">
              <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-emerald-500/30">
                {isStartup ? <Inbox className="w-8 h-8" /> : <MessageSquare className="w-8 h-8" />}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">{isStartup ? 'Connections' : 'Inbox Volume'}</p>
                <p className="text-4xl font-black tracking-tighter">
                  {isStartup ? (startupContactRequests?.length || 0) : 0}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {isInvestor && recommendedPitches.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-accent/10 rounded-2xl">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-3xl font-black tracking-tight">Strategic Matches</h2>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">AI-Driven Venture Alignment</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {recommendedPitches.map((pitch) => (
                <Link key={pitch.id} href={`/startup/${pitch.id}`}>
                  <Card className="group hover:border-accent/30 border-2 border-transparent transition-all h-full shadow-xl hover:shadow-2xl rounded-[2rem] flex flex-col bg-white overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                      <Badge className="w-fit bg-accent/10 text-accent border-none font-black text-[9px] uppercase tracking-[0.2em] mb-4 px-4 py-1.5 rounded-lg">
                        {pitch.category || pitch.industry || 'Other'}
                      </Badge>
                      <CardTitle className="text-2xl font-black group-hover:text-accent transition-colors line-clamp-1 leading-none">{pitch.startupName}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-8 pt-0">
                      <p className="text-md text-muted-foreground line-clamp-3 leading-relaxed italic border-l-2 border-accent/10 pl-4">&quot;{pitch.description}&quot;</p>
                    </CardContent>
                    <CardFooter className="p-8 pt-0 flex justify-between items-center border-t border-muted/50 mt-4 bg-muted/5">
                       <div className="space-y-1">
                         <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Goal</p>
                         <span className="text-xl font-black text-accent">${pitch.fundingNeeded?.toLocaleString()}</span>
                       </div>
                       <div className="w-12 h-12 rounded-xl bg-white shadow-md flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all duration-500 group-hover:translate-x-2">
                        <ArrowRight className="w-6 h-6" />
                       </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        <Tabs defaultValue="primary" className="space-y-10">
          <div className="flex justify-between items-center border-b pb-6">
            <TabsList className="bg-muted/50 p-1.5 rounded-2xl h-14 w-full sm:w-fit shadow-inner">
              <TabsTrigger value="primary" className="flex-1 sm:flex-none gap-3 px-8 h-11 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all">
                {isStartup ? <><Megaphone className="w-4 h-4" /> Active</> : <><LayoutGrid className="w-4 h-4" /> Feed</>}
              </TabsTrigger>
              <TabsTrigger value="secondary" className="flex-1 sm:flex-none gap-3 px-8 h-11 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all">
                {isStartup ? <><Users className="w-4 h-4" /> Partners</> : <><Star className="w-4 h-4" /> Saved</>}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="primary" className="mt-0 outline-none">
            {(isStartup ? loadingStartupPitches : loadingAllPitches) ? (
              <div className="flex justify-center p-32"><Loader2 className="animate-spin w-16 h-16 text-primary opacity-20" /></div>
            ) : (isStartup ? startupPitches : allPitches)?.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                {(isStartup ? startupPitches : allPitches)?.map((pitch) => {
                  const hasActiveConnection = isInvestor && (
                    investorInterests?.some(i => i.pitchId === pitch.id) || 
                    investorContactRequests?.some(r => r.pitchId === pitch.id && r.status === 'accepted')
                  );
                  
                  return (
                    <Card key={pitch.id} className="relative group overflow-hidden border-none shadow-xl transition-all duration-500 rounded-[2rem] flex flex-col bg-white">
                      <CardHeader className="p-8 pb-4">
                        <div className="flex justify-between items-start mb-4">
                          <Badge variant="outline" className="border-primary/20 text-primary font-black uppercase text-[9px] tracking-[0.2em] px-4 py-1.5 rounded-lg bg-primary/5">{pitch.category || pitch.industry || 'Other'}</Badge>
                          {hasActiveConnection && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-10 px-4 text-[9px] font-black uppercase tracking-widest text-amber-600 hover:bg-amber-50 rounded-full z-10 border-2 border-amber-100 shadow-sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleResolveConnection(pitch.id, pitch.ownerId, pitch.startupName);
                              }}
                              disabled={!!resolving && resolving === pitch.id}
                            >
                              {resolving === pitch.id ? <Loader2 className="animate-spin w-3 h-3" /> : <Zap className="w-3 h-3 mr-2" />}
                              <span className="hidden sm:inline">Resolve Protocol</span>
                            </Button>
                          )}
                        </div>
                        <CardTitle className="text-2xl font-black group-hover:text-primary transition-colors leading-none tracking-tight">{pitch.startupName}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 p-8 pt-0">
                        <p className="text-md text-muted-foreground line-clamp-3 leading-relaxed mb-8 border-l-2 border-primary/10 pl-4">{pitch.description}</p>
                        <div className="flex justify-between items-center pt-6 border-t border-muted/50">
                          <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Goal</p>
                            <span className="font-black text-primary text-2xl tracking-tighter">${pitch.fundingNeeded?.toLocaleString()}</span>
                          </div>
                          <Link href={`/startup/${pitch.id}`}>
                            <Button variant="ghost" size="sm" className="gap-2 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary/5 hover:text-primary transition-all">Details <ArrowRight className="w-4 h-4" /></Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-32 bg-muted/10 rounded-[2rem] border-4 border-dashed flex flex-col items-center p-6">
                <Search className="w-20 h-20 text-muted-foreground opacity-10 mb-6" />
                <h3 className="text-3xl font-black tracking-tight text-muted-foreground">No ventures identified.</h3>
                {isStartup && (
                  <Link href="/pitches/new" className="mt-8">
                    <Button variant="outline" className="rounded-xl px-10 h-14 border-2 font-black uppercase text-[10px] tracking-widest">Initialize Your First Pitch</Button>
                  </Link>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="secondary" className="mt-0 outline-none">
            {(isStartup ? startupInterests : investorInterests)?.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                {(isStartup ? startupInterests : investorInterests)?.map((interest) => (
                  <Card key={interest.id} className="border-none shadow-xl transition-all duration-500 rounded-[2rem] bg-white group">
                    <CardHeader className="p-8 pb-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">{isStartup ? 'Investor Identity' : 'Venture Opportunity'}</p>
                      <CardTitle className="text-2xl font-black truncate leading-none tracking-tight group-hover:text-primary transition-colors">
                        {isStartup ? interest.investorEmail : interest.startupName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                      <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-lg">{interest.industry}</Badge>
                    </CardContent>
                    <CardFooter className="p-8 pt-4 border-t border-muted/50 bg-muted/5">
                      <Link href={isStartup ? `/investor/${interest.investorId}` : `/startup/${interest.pitchId}`} className="w-full">
                        <Button variant="outline" className="w-full h-14 rounded-xl font-black uppercase text-[10px] tracking-widest border-2 hover:bg-primary/5 shadow-sm transition-all">Analyze Context</Button>
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-32 bg-muted/10 rounded-[2rem] border-4 border-dashed flex flex-col items-center p-6">
                <Star className="w-20 h-20 text-muted-foreground opacity-10 mb-6" />
                <h3 className="text-3xl font-black tracking-tight text-muted-foreground">Strategic queue is empty.</h3>
                <p className="text-muted-foreground text-sm italic mt-2">Active interests will appear here once identified in the ecosystem.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
