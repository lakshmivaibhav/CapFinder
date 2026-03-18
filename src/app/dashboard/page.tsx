"use client";

import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, limit, doc, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Plus, Megaphone, ArrowRight, Users, Star, Search, LayoutGrid, Inbox, Sparkles, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && user && !profile) {
      router.push('/onboarding');
    }
  }, [user, profile, authLoading, router]);

  const isStartup = profile?.role === 'startup';
  const isInvestor = profile?.role === 'investor';
  const isAdmin = profile?.role === 'admin';

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

  const allPitchesQuery = useMemoFirebase(() => {
    if (!user || !profile || (!isInvestor && !isAdmin) || profile.disabled === true) return null;
    return query(collection(db, 'pitches'), limit(50));
  }, [db, user, profile, isInvestor, isAdmin]);

  const investorInterestsQuery = useMemoFirebase(() => {
    if (!user || !profile || !isInvestor || profile.disabled === true) return null;
    return query(collection(db, 'interests'), where('investorId', '==', user.uid));
  }, [db, user, profile, isInvestor]);

  const investorFavoritesQuery = useMemoFirebase(() => {
    if (!user || !profile || !isInvestor || profile.disabled === true) return null;
    return query(collection(db, 'favorites'), where('investorId', '==', user.uid));
  }, [db, user, profile, isInvestor]);

  const { data: startupPitches } = useCollection(startupPitchesQuery);
  const { data: startupInterests } = useCollection(startupInterestsQuery);
  const { data: startupContactRequests } = useCollection(startupContactRequestsQuery);
  const { data: allPitches } = useCollection(allPitchesQuery);
  const { data: investorInterests } = useCollection(investorInterestsQuery);
  const { data: investorFavorites } = useCollection(investorFavoritesQuery);

  const pendingRequestsCount = startupContactRequests?.filter(r => r.status === 'pending').length || 0;

  const handleResolveConnection = async (pitchId: string, startupOwnerId: string, startupName: string) => {
    if (!user || !isInvestor) return;
    if (!confirm(`Resolve connection with ${startupName}? This will clear your interest, requests, and messages.`)) return;

    setResolving(pitchId);
    try {
      const intSnap = await getDocs(query(collection(db, 'interests'), where('investorId', '==', user.uid), where('pitchId', '==', pitchId)));
      intSnap.docs.forEach(d => deleteDocumentNonBlocking(doc(db, 'interests', d.id)));

      const reqSnap = await getDocs(query(collection(db, 'contactRequests'), where('senderId', '==', user.uid), where('pitchId', '==', pitchId)));
      reqSnap.docs.forEach(d => deleteDocumentNonBlocking(doc(db, 'contactRequests', d.id)));

      const msgsSnap = await getDocs(query(collection(db, 'messages'), where('pitchId', '==', pitchId)));
      msgsSnap.docs.forEach(d => {
        const m = d.data();
        if ((m.senderId === user.uid && m.receiverId === startupOwnerId) || (m.senderId === startupOwnerId && m.receiverId === user.uid)) {
          deleteDocumentNonBlocking(doc(db, 'messages', d.id));
        }
      });

      toast({ title: "Connection Resolved", description: "All records for this pitch have been cleared." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to resolve connection." });
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
        const industry = (pitch.industry || '').toLowerCase();
        const description = (pitch.description || '').toLowerCase();
        interests.forEach(interest => {
          if (industry.includes(interest)) score += 10;
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

  if (!user || !profile) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Welcome, {profile.name || user.email}</h1>
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              Dashboard for <span className="font-bold text-primary capitalize">{profile.role}</span>
              {isAdmin && <Badge className="bg-destructive text-white border-none">Admin</Badge>}
            </div>
          </div>
          <div className="flex gap-3">
            {isStartup && (
              <Link href="/pitches/new">
                <Button className="gap-2"><Plus className="w-5 h-5" /> New Pitch</Button>
              </Link>
            )}
            {(isInvestor || isAdmin) && (
              <Link href="/pitches">
                <Button variant="outline" className="gap-2"><Search className="w-5 h-5" /> Explore</Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="border-none shadow-sm bg-primary/5">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white">
                <Megaphone className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{isStartup ? 'My Pitches' : 'Opportunities'}</p>
                <p className="text-2xl font-bold">{isStartup ? (startupPitches?.length || 0) : (allPitches?.length || 0)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-accent/5">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center text-white">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{isStartup ? 'Interests' : 'Watchlist'}</p>
                <p className="text-2xl font-bold">{isStartup ? (startupInterests?.length || 0) : (investorInterests?.length || 0)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-emerald-50">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                <Inbox className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{isStartup ? 'Requests' : 'Saved'}</p>
                <p className="text-2xl font-bold">{isStartup ? pendingRequestsCount : (investorFavorites?.length || 0)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {isInvestor && recommendedPitches.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-accent" />
              <h2 className="text-2xl font-bold tracking-tight">Recommended for You</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {recommendedPitches.map((pitch) => (
                <Link key={pitch.id} href={`/pitches/${pitch.id}`}>
                  <Card className="group hover:border-accent transition-all h-full shadow-sm">
                    <CardHeader>
                      <Badge className="w-fit bg-accent text-white border-none uppercase text-[10px]">{pitch.industry}</Badge>
                      <CardTitle className="text-lg font-bold truncate group-hover:text-accent">{pitch.startupName}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 italic">&quot;{pitch.description}&quot;</p>
                      <div className="mt-4 flex justify-between items-center">
                         <span className="text-sm font-bold text-accent">${pitch.fundingNeeded?.toLocaleString()}</span>
                         <ArrowRight className="w-4 h-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        <Tabs defaultValue="primary" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="primary" className="gap-2">
              {isStartup ? <><Megaphone className="w-4 h-4" /> My Pitches</> : <><LayoutGrid className="w-4 h-4" /> Market Feed</>}
            </TabsTrigger>
            <TabsTrigger value="secondary" className="gap-2">
              {isStartup ? <><Users className="w-4 h-4" /> Investor Interest</> : <><Star className="w-4 h-4" /> My Watchlist</>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="primary">
            <div className="grid md:grid-cols-3 gap-6">
              {(isStartup ? startupPitches : allPitches)?.map((pitch) => (
                <Card key={pitch.id} className="relative group overflow-hidden">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <Badge variant="outline">{pitch.industry}</Badge>
                      {isInvestor && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-[10px] text-amber-600 hover:bg-amber-50"
                          onClick={() => handleResolveConnection(pitch.id, pitch.ownerId, pitch.startupName)}
                          disabled={resolving === pitch.id}
                        >
                          {resolving === pitch.id ? <Loader2 className="animate-spin w-3 h-3" /> : <Zap className="w-3 h-3 mr-1" />}
                          Resolve
                        </Button>
                      )}
                    </div>
                    <CardTitle className="text-lg font-bold">{pitch.startupName}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{pitch.description}</p>
                    <div className="mt-4 flex justify-between items-center text-sm">
                      <span className="font-bold text-primary">${pitch.fundingNeeded?.toLocaleString()}</span>
                      <Link href={`/pitches/${pitch.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1">View <ArrowRight className="w-3 h-3" /></Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="secondary">
            <div className="grid md:grid-cols-3 gap-6">
              {(isStartup ? startupInterests : investorInterests)?.map((interest) => (
                <Card key={interest.id}>
                  <CardHeader>
                    <CardTitle className="text-lg truncate">
                      {isStartup ? interest.investorEmail : interest.startupName}
                    </CardTitle>
                    <CardDescription>{interest.industry}</CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Link href={isStartup ? `/profile/${interest.investorId}` : `/pitches/${interest.pitchId}`} className="w-full">
                      <Button variant="outline" className="w-full text-xs">View Details</Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}