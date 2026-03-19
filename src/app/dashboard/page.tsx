
"use client";

import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, limit, doc, getDocs } from 'firebase/firestore';
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

  // Startup Specific Queries
  const startupPitchesQuery = useMemoFirebase(() => {
    if (!user || !profile || !isStartup || profile.disabled === true) return null;
    return query(collection(db, 'pitches'), where('ownerId', '==', user.uid));
  }, [db, user, profile, isStartup]);

  const startupInterestsQuery = useMemoFirebase(() => {
    if (!user || !profile || !isStartup || profile.disabled === true) return null;
    return query(collection(db, 'interests'), where('startupOwnerId', '==', user.uid));
  }, [db, user, profile, isStartup]);

  const startupContactRequestsQuery = useMemoFirebase(() => {
    if (!user || !profile || !isStartup || profile.disabled === true) return null;
    return query(collection(db, 'contactRequests'), where('receiverId', '==', user.uid));
  }, [db, user, profile, isStartup]);

  // Investor Specific Queries
  const investorInterestsQuery = useMemoFirebase(() => {
    if (!user || !profile || !isInvestor || profile.disabled === true) return null;
    return query(collection(db, 'interests'), where('investorId', '==', user.uid));
  }, [db, user, profile, isInvestor]);

  const investorContactRequestsQuery = useMemoFirebase(() => {
    if (!user || !profile || !isInvestor || profile.disabled === true) return null;
    return query(collection(db, 'contactRequests'), where('senderId', '==', user.uid));
  }, [db, user, profile, isInvestor]);

  const investorMessagesQuery = useMemoFirebase(() => {
    if (!user || !profile || !isInvestor || profile.disabled === true) return null;
    return query(collection(db, 'messages'), where('receiverId', '==', user.uid));
  }, [db, user, profile, isInvestor]);

  // General Market Feed
  const allPitchesQuery = useMemoFirebase(() => {
    if (!user || !profile || (!isInvestor && !isAdmin) || profile.disabled === true) return null;
    return query(collection(db, 'pitches'), limit(50));
  }, [db, user, profile, isInvestor, isAdmin]);

  const { data: startupPitches, isLoading: loadingStartupPitches } = useCollection(startupPitchesQuery);
  const { data: startupInterests } = useCollection(startupInterestsQuery);
  const { data: startupContactRequests } = useCollection(startupContactRequestsQuery);
  
  const { data: investorInterests } = useCollection(investorInterestsQuery);
  const { data: investorContactRequests } = useCollection(investorContactRequestsQuery);
  const { data: investorMessages } = useCollection(investorMessagesQuery);
  
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

      const msgsSnap = await getDocs(query(collection(db, 'messages'), where('pitchId', '==', pitchId)));
      msgsSnap.docs.forEach(d => {
        const m = d.data();
        if ((m.senderId === user.uid && m.receiverId === startupOwnerId) || (m.senderId === startupOwnerId && m.receiverId === user.uid)) {
          deleteDocumentNonBlocking(doc(db, 'messages', d.id));
        }
      });

      toast({ title: "Connection resolved", description: "Records for this pitch have been cleared." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Resolve failed", description: e.message });
    } finally {
      setResolving(null);
    }
  };

  const recommendedPitches = useMemo(() => {
    if (!isInvestor || !allPitches || !profile?.investmentInterest) return [];
    const interests = profile.investmentInterest.toLowerCase().split(',').map(i => i.trim()).filter(Boolean);
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
        <Loader2 className="animate-spin w-12 h-12 text-primary" />
      </div>
    );
  }

  if (!user || !profile || !emailVerified) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Overview</p>
            <h1 className="text-4xl font-black tracking-tight">Welcome, {profile.name || user.email}</h1>
            <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
              Dashboard for <span className="text-foreground capitalize font-bold underline decoration-primary decoration-2 underline-offset-4">{profile.role}</span>
              {isAdmin && <Badge className="bg-destructive text-white border-none ml-2">Admin Access</Badge>}
            </div>
          </div>
          <div className="flex gap-3">
            {isStartup && (
              <Link href="/pitches/new">
                <Button className="gap-2 h-12 px-6 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                  <Plus className="w-5 h-5" /> New Pitch
                </Button>
              </Link>
            )}
            {(isInvestor || isAdmin) && (
              <Link href="/pitches">
                <Button variant="outline" className="gap-2 h-12 px-6 rounded-xl border-2 hover:bg-primary/5 transition-all">
                  <Search className="w-5 h-5" /> Market Marketplace
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Dynamic Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="border-none shadow-sm hover:shadow-md transition-shadow bg-primary/5 rounded-2xl overflow-hidden">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <Megaphone className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{isStartup ? 'Total Pitches' : 'Total Interests'}</p>
                <p className="text-3xl font-black">
                  {isStartup ? (startupPitches?.length || 0) : (investorInterests?.length || 0)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm hover:shadow-md transition-shadow bg-accent/5 rounded-2xl overflow-hidden">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center text-white shadow-lg shadow-accent/20">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{isStartup ? 'Engagements' : 'Contact Requests'}</p>
                <p className="text-3xl font-black">
                  {isStartup ? (startupInterests?.length || 0) : (investorContactRequests?.length || 0)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm hover:shadow-md transition-shadow bg-emerald-50 rounded-2xl overflow-hidden">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                {isStartup ? <Inbox className="w-7 h-7" /> : <MessageSquare className="w-7 h-7" />}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{isStartup ? 'Connections' : 'Inbox Messages'}</p>
                <p className="text-3xl font-black">
                  {isStartup ? (startupContactRequests?.length || 0) : (investorMessages?.length || 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {isInvestor && recommendedPitches.length > 0 && (
          <section className="mb-14">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">Personalized Matches</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {recommendedPitches.map((pitch) => (
                <Link key={pitch.id} href={`/startup/${pitch.id}`}>
                  <Card className="group hover:border-accent border-2 border-transparent transition-all h-full shadow-md hover:shadow-xl rounded-2xl flex flex-col">
                    <CardHeader className="pb-4">
                      <Badge className="w-fit bg-accent/10 text-accent border-none font-black text-[9px] uppercase tracking-wider mb-2">{pitch.category || pitch.industry || 'Other'}</Badge>
                      <CardTitle className="text-xl font-black group-hover:text-accent transition-colors line-clamp-1">{pitch.startupName}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed italic">&quot;{pitch.description}&quot;</p>
                    </CardContent>
                    <CardFooter className="pt-0 flex justify-between items-center border-t border-muted/50 mt-4 p-6">
                       <span className="text-lg font-black text-accent">${pitch.fundingNeeded?.toLocaleString()}</span>
                       <div className="w-10 h-10 rounded-full bg-accent/5 flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all">
                        <ArrowRight className="w-5 h-5" />
                       </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        <Tabs defaultValue="primary" className="space-y-8">
          <TabsList className="bg-muted/50 p-1 rounded-xl h-12">
            <TabsTrigger value="primary" className="gap-2 h-10 px-6 rounded-lg data-[state=active]:shadow-sm">
              {isStartup ? <><Megaphone className="w-4 h-4" /> My Active Pitches</> : <><LayoutGrid className="w-4 h-4" /> Venture Feed</>}
            </TabsTrigger>
            <TabsTrigger value="secondary" className="gap-2 h-10 px-6 rounded-lg data-[state=active]:shadow-sm">
              {isStartup ? <><Users className="w-4 h-4" /> Interested Investors</> : <><Star className="w-4 h-4" /> Saved Interests</>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="primary">
            {isStartup && loadingStartupPitches ? (
              <div className="flex justify-center p-20"><Loader2 className="animate-spin w-10 h-10 text-primary opacity-20" /></div>
            ) : (isStartup ? startupPitches : allPitches)?.length ? (
              <div className="grid md:grid-cols-3 gap-8">
                {(isStartup ? startupPitches : allPitches)?.map((pitch) => {
                  const hasActiveConnection = isInvestor && (
                    investorInterests?.some(i => i.pitchId === pitch.id) || 
                    investorContactRequests?.some(r => r.pitchId === pitch.id && r.status === 'accepted')
                  );
                  
                  return (
                    <Card key={pitch.id} className="relative group overflow-hidden border-none shadow-md hover:shadow-xl transition-all rounded-2xl flex flex-col">
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className="border-primary/20 text-primary font-bold uppercase text-[9px] tracking-widest">{pitch.category || pitch.industry || 'Other'}</Badge>
                          {hasActiveConnection && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-[9px] font-black uppercase text-amber-600 hover:bg-amber-50 rounded-full z-10 border border-amber-100"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleResolveConnection(pitch.id, pitch.ownerId, pitch.startupName);
                              }}
                              disabled={resolving === pitch.id}
                            >
                              {resolving === pitch.id ? <Loader2 className="animate-spin w-3 h-3" /> : <Zap className="w-3 h-3 mr-1" />}
                              Resolve
                            </Button>
                          )}
                        </div>
                        <CardTitle className="text-xl font-black group-hover:text-primary transition-colors">{pitch.startupName}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed mb-6">{pitch.description}</p>
                        <div className="flex justify-between items-center pt-4 border-t border-muted">
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Goal</p>
                            <span className="font-black text-primary text-lg">${pitch.fundingNeeded?.toLocaleString()}</span>
                          </div>
                          <Link href={`/startup/${pitch.id}`}>
                            <Button variant="ghost" size="sm" className="gap-2 rounded-full font-bold hover:bg-primary/5">Details <ArrowRight className="w-3 h-3" /></Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed flex flex-col items-center">
                <Search className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
                <h3 className="text-xl font-bold text-muted-foreground">No ventures found.</h3>
                {isStartup && (
                  <Link href="/pitches/new" className="mt-4">
                    <Button variant="outline">Create your first pitch</Button>
                  </Link>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="secondary">
            {(isStartup ? startupInterests : investorInterests)?.length ? (
              <div className="grid md:grid-cols-3 gap-8">
                {(isStartup ? startupInterests : investorInterests)?.map((interest) => (
                  <Card key={interest.id} className="border-none shadow-md hover:shadow-lg transition-all rounded-2xl">
                    <CardHeader className="pb-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{isStartup ? 'Investor' : 'Venture'}</p>
                      <CardTitle className="text-lg font-black truncate">
                        {isStartup ? interest.investorEmail : interest.startupName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[10px] font-bold uppercase">{interest.industry}</Badge>
                    </CardContent>
                    <CardFooter className="pt-2">
                      <Link href={isStartup ? `/investor/${interest.investorId}` : `/startup/${interest.pitchId}`} className="w-full">
                        <Button variant="outline" className="w-full h-11 rounded-xl font-bold border-2 hover:bg-primary/5">View Context</Button>
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed flex flex-col items-center">
                <Star className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
                <h3 className="text-xl font-bold text-muted-foreground">No interests recorded yet.</h3>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
