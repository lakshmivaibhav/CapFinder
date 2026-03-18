
"use client";

import { useState } from 'react';
import { collection, query, serverTimestamp, where, doc } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, TrendingUp, Mail, Globe, Sparkles, CheckCircle2, FilterX, Landmark, Bookmark, BookmarkCheck, Clock, ShieldCheck, XCircle, ArrowRight, Users, Building2, User } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PitchesFeedPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [fundingFilter, setFundingFilter] = useState('all');

  const isInvestor = profile?.role === 'investor';
  const isStartup = profile?.role === 'startup';
  const isAdmin = profile?.role === 'admin';

  // 1. Fetch Pitches (For Investors and Admins)
  const pitchesQuery = useMemoFirebase(() => {
    if (!isAdmin && !isInvestor) return null;
    return query(collection(db, 'pitches'));
  }, [db, isAdmin, isInvestor]);
  const { data: pitches, isLoading: loadingPitches } = useCollection(pitchesQuery);

  // 2. Fetch Investors (For Startups and Admins)
  const investorsQuery = useMemoFirebase(() => {
    if (!isAdmin && !isStartup) return null;
    return query(collection(db, 'users'), where('role', '==', 'investor'));
  }, [db, isAdmin, isStartup]);
  const { data: investors, isLoading: loadingInvestors } = useCollection(investorsQuery);

  // 3. User Interactions Data (Favorites, Interests, Requests)
  const interestsQuery = useMemoFirebase(() => {
    if (!user || !isInvestor) return null;
    return query(collection(db, 'interests'), where('investorId', '==', user.uid));
  }, [db, user, isInvestor]);
  const { data: userInterestsData } = useCollection(interestsQuery);

  const favoritesQuery = useMemoFirebase(() => {
    if (!user || !isInvestor) return null;
    return query(collection(db, 'favorites'), where('investorId', '==', user.uid));
  }, [db, user, isInvestor]);
  const { data: userFavoritesData } = useCollection(favoritesQuery);

  const contactRequestsQuery = useMemoFirebase(() => {
    if (!user || !isInvestor) return null;
    return query(collection(db, 'contactRequests'), where('senderId', '==', user.uid));
  }, [db, user, isInvestor]);
  const { data: userContactRequestsData } = useCollection(contactRequestsQuery);

  const userInterests = userInterestsData?.map(i => i.pitchId) || [];
  const favoritePitchIds = userFavoritesData?.map(f => f.pitchId) || [];
  const contactRequests = userContactRequestsData || [];

  // 4. Filtering Logic for Pitches
  const industries = Array.from(new Set(pitches?.map(p => p.industry) || [])).filter(Boolean);
  const filteredPitches = pitches?.filter(p => {
    const searchLower = search.toLowerCase();
    const matchesSearch = (p.startupName?.toLowerCase() || "").includes(searchLower) || (p.description?.toLowerCase() || "").includes(searchLower) || (p.industry?.toLowerCase() || "").includes(searchLower);
    const matchesIndustry = industryFilter === 'all' || p.industry === industryFilter;
    const fundingVal = parseFloat(p.fundingNeeded?.toString().replace(/,/g, '') || "0");
    const matchesFunding = fundingFilter === 'all' || (() => {
      if (fundingFilter === '0-100k') return fundingVal <= 100000;
      if (fundingFilter === '100k-500k') return fundingVal > 100000 && fundingVal <= 500000;
      if (fundingFilter === '500k-1m') return fundingVal > 500000 && fundingVal <= 1000000;
      if (fundingFilter === '1m-plus') return fundingVal > 1000000;
      return true;
    })();
    return matchesSearch && matchesIndustry && matchesFunding;
  }) || [];

  // 5. Filtering Logic for Investors
  const filteredInvestors = investors?.filter(i => {
    const searchLower = search.toLowerCase();
    return (i.name?.toLowerCase() || "").includes(searchLower) || (i.company?.toLowerCase() || "").includes(searchLower) || (i.investmentInterest?.toLowerCase() || "").includes(searchLower);
  }) || [];

  // 6. Actions
  const handleToggleFavorite = async (pitch: any) => {
    if (!user || !isInvestor) return;
    const existingFavorite = userFavoritesData?.find(f => f.pitchId === pitch.id);
    if (existingFavorite) {
      deleteDocumentNonBlocking(doc(db, 'favorites', existingFavorite.id));
      toast({ title: "Removed from favorites" });
    } else {
      addDocumentNonBlocking(collection(db, 'favorites'), {
        pitchId: pitch.id,
        investorId: user.uid,
        startupName: pitch.startupName,
        industry: pitch.industry,
        timestamp: serverTimestamp(),
      });
      toast({ title: "Saved to favorites" });
    }
  };

  const handleShowInterest = async (pitch: any) => {
    if (!user || !isInvestor || userInterests.includes(pitch.id)) return;
    addDocumentNonBlocking(collection(db, 'interests'), {
      pitchId: pitch.id,
      investorId: user.uid,
      investorEmail: user.email,
      startupOwnerId: pitch.ownerId,
      startupName: pitch.startupName,
      industry: pitch.industry,
      timestamp: serverTimestamp(),
    });
    toast({ title: "Interest Registered" });
  };

  const handleRequestContact = async (pitch: any) => {
    if (!user || !isInvestor) return;
    const existing = contactRequests.find(r => r.pitchId === pitch.id);
    if (existing) return;
    const requestId = `${user.uid}_${pitch.ownerId}_${pitch.id}`;
    setDocumentNonBlocking(doc(db, 'contactRequests', requestId), {
      senderId: user.uid,
      receiverId: pitch.ownerId,
      pitchId: pitch.id,
      startupName: pitch.startupName,
      investorEmail: user.email,
      status: 'pending',
      timestamp: serverTimestamp(),
    }, { merge: true });
    toast({ title: "Contact Request Sent" });
  };

  const getContactButton = (pitch: any) => {
    if (!isInvestor) return null;
    const request = contactRequests.find(r => r.pitchId === pitch.id);
    if (!request) return <Button variant="outline" className="flex-1 h-10" onClick={() => handleRequestContact(pitch)}><Mail className="mr-2 w-4 h-4" /> Request Contact</Button>;
    if (request.status === 'pending') return <Button variant="secondary" className="flex-1 h-10 opacity-70" disabled><Clock className="mr-2 w-4 h-4" /> Pending</Button>;
    if (request.status === 'accepted') return (
      <div className="flex-1 flex gap-2">
        <Link href={`mailto:${pitch.contactEmail}`} className="flex-1"><Button variant="outline" className="w-full h-10 border-green-200 bg-green-50 text-green-700"><Mail className="mr-2 w-4 h-4" /> Email</Button></Link>
        <Link href="/messages" className="flex-1"><Button variant="default" className="w-full h-10 bg-primary">Chat</Button></Link>
      </div>
    );
    return null;
  };

  if (authLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto w-10 h-10 text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-col gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">
              {isStartup ? "Investor Marketplace" : isInvestor ? "Investment Marketplace" : "Platform Marketplace"}
            </h1>
            <p className="text-muted-foreground text-lg italic">
              {isStartup ? `Find the right strategic partners among our ${investors?.length || 0} verified investors.` : `Discover and connect with ${pitches?.length || 0} high-potential ventures.`}
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl shadow-sm border space-y-6">
            <div className="flex items-center gap-2 text-sm font-bold text-primary uppercase tracking-widest">
              <Landmark className="w-4 h-4" /> Advanced Search
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-5 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input 
                  placeholder={isStartup ? "Search investors by name or interest..." : "Search pitches by name or industry..."}
                  className="pl-10 h-11 bg-muted/30 border-none"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {!isStartup && (
                <>
                  <div className="md:col-span-3">
                    <Select value={industryFilter} onValueChange={setIndustryFilter}>
                      <SelectTrigger className="h-11 bg-muted/30 border-none"><SelectValue placeholder="All Industries" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Industries</SelectItem>
                        {industries.sort().map(ind => (
                          <SelectItem key={ind as string} value={ind as string}>{ind as string}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-3">
                    <Select value={fundingFilter} onValueChange={setFundingFilter}>
                      <SelectTrigger className="h-11 bg-muted/30 border-none"><SelectValue placeholder="Funding Goal" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any Amount</SelectItem>
                        <SelectItem value="0-100k">Up to $100k</SelectItem>
                        <SelectItem value="100k-500k">$100k - $500k</SelectItem>
                        <SelectItem value="500k-1m">$500k - $1M</SelectItem>
                        <SelectItem value="1m-plus">$1M+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="md:col-span-1">
                <Button variant="ghost" size="icon" className="h-11 w-full" onClick={() => { setSearch(''); setIndustryFilter('all'); setFundingFilter('all'); }}><FilterX className="w-5 h-5" /></Button>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue={isStartup ? "investors" : "pitches"} className="space-y-8">
          {isAdmin && (
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="pitches" className="px-8">Startup Pitches</TabsTrigger>
              <TabsTrigger value="investors" className="px-8">Investors</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="pitches">
            {loadingPitches ? (
              <div className="flex justify-center p-20"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>
            ) : filteredPitches.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPitches.map((pitch) => (
                  <Card key={pitch.id} className="flex flex-col group hover:shadow-xl transition-all border-none shadow-sm overflow-hidden rounded-2xl bg-white relative">
                    <Link href={`/pitches/${pitch.id}`} className="absolute inset-0 z-0" />
                    <CardHeader className="space-y-4 relative z-10 pointer-events-none">
                      <div className="flex justify-between items-start pointer-events-auto">
                        <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 px-3 py-1 font-bold uppercase tracking-tighter text-[10px]">{pitch.industry}</Badge>
                        {isInvestor && (
                          <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-full ${favoritePitchIds.includes(pitch.id) ? 'text-accent' : 'text-muted-foreground'}`} onClick={(e) => { e.preventDefault(); handleToggleFavorite(pitch); }}>
                            {favoritePitchIds.includes(pitch.id) ? <BookmarkCheck className="w-5 h-5 fill-current" /> : <Bookmark className="w-5 h-5" />}
                          </Button>
                        )}
                      </div>
                      <CardTitle className="text-2xl font-bold group-hover:text-primary transition-colors leading-tight">{pitch.startupName}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-6 relative z-10 pointer-events-none">
                      <div className="text-muted-foreground text-sm line-clamp-3 leading-relaxed bg-muted/20 p-4 rounded-xl italic border-l-2 border-primary/10">&quot;{pitch.description}&quot;</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-black flex items-center gap-1"><TrendingUp className="w-3 h-3 text-primary" /> Goal</p>
                          <p className="text-lg font-black text-primary">${typeof pitch.fundingNeeded === 'number' ? pitch.fundingNeeded.toLocaleString() : pitch.fundingNeeded}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-black flex items-center gap-1"><ArrowRight className="w-3 h-3 text-accent" /> Detail</p>
                          <p className="text-sm font-bold flex items-center gap-1 text-accent">Review <ArrowRight className="w-3 h-3" /></p>
                        </div>
                      </div>
                    </CardContent>
                    {isInvestor && (
                      <CardFooter className="p-6 pt-0 flex gap-2 relative z-10">
                        <div className="flex-1">{getContactButton(pitch)}</div>
                        <Button className={`flex-1 h-10 shadow-md font-bold ${userInterests.includes(pitch.id) ? 'bg-green-600' : 'bg-primary'}`} onClick={() => handleShowInterest(pitch)} disabled={userInterests.includes(pitch.id)}>
                          {userInterests.includes(pitch.id) ? <><CheckCircle2 className="mr-2 w-4 h-4" /> Interested</> : <><Sparkles className="mr-2 w-4 h-4" /> Show Interest</>}
                        </Button>
                      </CardFooter>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-40 bg-white rounded-3xl shadow-sm border-2 border-dashed flex flex-col items-center">
                <Search className="w-10 h-10 text-muted-foreground opacity-30 mb-4" />
                <h3 className="text-2xl font-bold mb-2">No pitches found</h3>
                <Button variant="outline" onClick={() => { setSearch(''); setIndustryFilter('all'); setFundingFilter('all'); }}>Clear Filters</Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="investors">
            {loadingInvestors ? (
              <div className="flex justify-center p-20"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>
            ) : filteredInvestors.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredInvestors.map((investor) => (
                  <Link key={investor.id} href={`/profile/${investor.id}`}>
                    <Card className="group h-full hover:shadow-xl transition-all border-none shadow-sm overflow-hidden rounded-2xl bg-white">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start mb-2">
                          <Badge className="bg-primary/5 text-primary border-none font-bold uppercase tracking-tighter text-[10px]">Strategic Partner</Badge>
                          <div className="p-2 bg-primary/5 rounded-full"><User className="w-4 h-4 text-primary" /></div>
                        </div>
                        <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">{investor.name || 'Private Investor'}</CardTitle>
                        <CardDescription className="text-xs font-black uppercase tracking-widest text-muted-foreground">{investor.company || 'Venture Group'}</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-6">
                        <p className="text-sm text-muted-foreground italic line-clamp-2 mb-4">&quot;{investor.bio || "Active investor looking for the next big disruption."}&quot;</p>
                        <div className="flex flex-wrap gap-1.5">
                          {investor.investmentInterest?.split(',').slice(0, 3).map((tag: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-[9px] bg-muted/30">{tag.trim()}</Badge>
                          ))}
                        </div>
                      </CardContent>
                      <CardFooter className="pt-4 border-t bg-muted/10 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-500" /> Verified Identity</span>
                        <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-all" />
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-40 bg-white rounded-3xl shadow-sm border-2 border-dashed flex flex-col items-center">
                <Users className="w-10 h-10 text-muted-foreground opacity-30 mb-4" />
                <h3 className="text-2xl font-bold mb-2">No investors match your criteria</h3>
                <Button variant="outline" onClick={() => setSearch('')}>Clear Search</Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
