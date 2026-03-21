
"use client";

import { useState, useEffect } from 'react';
import { collection, query, serverTimestamp, where, doc } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, TrendingUp, Mail, Landmark, Bookmark, BookmarkCheck, Clock, ShieldCheck, ArrowRight, Users, LayoutGrid, FilterX, CheckCircle2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CATEGORIES = [
  "AI",
  "Fintech",
  "SaaS",
  "Health",
  "EdTech",
  "Web3",
  "Ecommerce",
  "Robotics",
  "Gaming",
  "Other"
];

export default function PitchesFeedPage() {
  const { user, profile, loading: authLoading, emailVerified } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [fundingFilter, setFundingFilter] = useState('all');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (!emailVerified) {
        router.push('/verify-email');
      }
    }
  }, [user, authLoading, emailVerified, router]);

  const isInvestor = profile?.role === 'investor';
  const isStartup = profile?.role === 'startup';
  const isAdmin = profile?.role === 'admin';

  const pitchesQuery = useMemoFirebase(() => {
    if (!profile || profile.disabled === true || (!isAdmin && !isInvestor)) return null;
    return query(collection(db, 'pitches'));
  }, [db, profile, isAdmin, isInvestor]);

  const { data: pitches, isLoading: loadingPitches } = useCollection(pitchesQuery);

  const investorsQuery = useMemoFirebase(() => {
    if (!profile || profile.disabled === true || (!isAdmin && !isStartup)) return null;
    return query(
      collection(db, 'users'), 
      where('role', '==', 'investor'), 
      where('disabled', '==', false)
    );
  }, [db, profile, isAdmin, isStartup]);

  const { data: investors, isLoading: loadingInvestors } = useCollection(investorsQuery);

  const interestsQuery = useMemoFirebase(() => {
    if (!user || !profile || !isInvestor || profile.disabled === true) return null;
    return query(collection(db, 'interests'), where('investorId', '==', user.uid));
  }, [db, user, profile, isInvestor]);
  const { data: userInterestsData } = useCollection(interestsQuery);

  const favoritesQuery = useMemoFirebase(() => {
    if (!user || !profile || !isInvestor || profile.disabled === true) return null;
    return query(collection(db, 'favorites'), where('investorId', '==', user.uid));
  }, [db, user, profile, isInvestor]);
  const { data: userFavoritesData } = useCollection(favoritesQuery);

  const contactRequestsQuery = useMemoFirebase(() => {
    if (!user || !profile || !isInvestor || profile.disabled === true) return null;
    return query(collection(db, 'contactRequests'), where('senderId', '==', user.uid));
  }, [db, user, profile, isInvestor]);
  const { data: userContactRequestsData } = useCollection(contactRequestsQuery);

  const userInterests = userInterestsData?.map(i => i.pitchId) || [];
  const favoritePitchIds = userFavoritesData?.map(f => f.pitchId) || [];
  const contactRequests = userContactRequestsData || [];

  const filteredPitches = pitches?.filter(p => {
    const searchLower = search.toLowerCase();
    const pCategory = p.category || p.industry || 'Other';
    const matchesSearch = (p.startupName?.toLowerCase() || "").includes(searchLower) || (p.description?.toLowerCase() || "").includes(searchLower) || (pCategory.toLowerCase()).includes(searchLower);
    const matchesCategory = categoryFilter === 'all' || pCategory === categoryFilter;
    const fundingVal = parseFloat(p.fundingNeeded?.toString().replace(/,/g, '') || "0");
    const matchesFunding = fundingFilter === 'all' || (() => {
      if (fundingFilter === '0-100k') return fundingVal <= 100000;
      if (fundingFilter === '100k-500k') return fundingVal > 100000 && fundingVal <= 500000;
      if (fundingFilter === '500k-1m') return fundingVal > 500000 && fundingVal <= 1000000;
      if (fundingFilter === '1m-plus') return fundingVal > 1000000;
      return true;
    })();
    return matchesSearch && matchesCategory && matchesFunding;
  }) || [];

  const filteredInvestors = investors?.filter(i => {
    const searchLower = search.toLowerCase();
    return (i.name?.toLowerCase() || "").includes(searchLower) || (i.company?.toLowerCase() || "").includes(searchLower) || (i.investmentInterest?.toLowerCase() || "").includes(searchLower);
  }) || [];

  const handleToggleFavorite = async (pitch: any) => {
    if (!user || !isInvestor) return;
    const existingFavorite = userFavoritesData?.find(f => f.pitchId === pitch.id);
    if (existingFavorite) {
      deleteDocumentNonBlocking(doc(db, 'favorites', existingFavorite.id));
      toast({ title: "Removed from saved" });
    } else {
      addDocumentNonBlocking(collection(db, 'favorites'), {
        pitchId: pitch.id,
        investorId: user.uid,
        startupName: pitch.startupName,
        industry: pitch.category || pitch.industry || 'Other',
        timestamp: serverTimestamp(),
      });
      toast({ title: "Pitch saved" });
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
      industry: pitch.category || pitch.industry || 'Other',
      timestamp: serverTimestamp(),
    });
    toast({ title: "Interest shown!" });
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
    toast({ title: "Connection requested" });
  };

  const getContactButton = (pitch: any) => {
    if (!isInvestor) return null;
    const request = contactRequests.find(r => r.pitchId === pitch.id);
    if (!request) return <Button variant="outline" className="flex-1 h-11 rounded-xl border-2 font-bold transition-all hover:bg-primary/5 active:scale-95" onClick={() => handleRequestContact(pitch)}><Mail className="mr-2 w-4 h-4" /> Connect</Button>;
    if (request.status === 'pending') return <Button variant="secondary" className="flex-1 h-11 rounded-xl opacity-70 cursor-default" disabled><Clock className="mr-2 w-4 h-4 animate-pulse" /> Pending</Button>;
    if (request.status === 'accepted') return (
      <div className="flex-1 flex gap-2">
        <Link href={`/messages`} className="flex-1">
          <Button variant="default" className="w-full h-11 rounded-xl bg-accent hover:bg-accent/90 shadow-md font-bold transition-all active:scale-95">Message</Button>
        </Link>
      </div>
    );
    return null;
  };

  if (authLoading || (user && !emailVerified)) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-10">
        <div className="flex flex-col gap-10">
          <div className="space-y-3 max-w-2xl">
            <h1 className="text-5xl font-black tracking-tighter">
              {isStartup ? "Investor Network" : isInvestor ? "Venture Marketplace" : "Market Hub"}
            </h1>
            <p className="text-muted-foreground text-xl leading-relaxed italic border-l-4 border-primary/20 pl-6">
              {isStartup ? `Bridge your vision with our ${investors?.length || 0} strategic investment partners.` : `Curated high-potential opportunities. Explore ${pitches?.length || 0} active ventures.`}
            </p>
          </div>

          <Card className="p-8 bg-white/50 backdrop-blur-sm rounded-[2.5rem] shadow-xl border-none ring-1 ring-black/5 space-y-8 transition-all hover:shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Landmark className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-black uppercase tracking-widest text-primary text-xs">Discovery Engine</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-5 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input 
                  placeholder={isStartup ? "Filter investors..." : "Search ventures, category, tech..."}
                  className="pl-12 h-14 w-full bg-white/80 border-none shadow-inner rounded-2xl text-lg font-medium placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {!isStartup ? (
                <>
                  <div className="md:col-span-3">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-14 bg-white/80 border-none shadow-inner rounded-2xl font-bold px-6 focus:ring-2 focus:ring-primary/20 transition-all">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl shadow-2xl">
                        <SelectItem value="all">All Sectors</SelectItem>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-3">
                    <Select value={fundingFilter} onValueChange={setFundingFilter}>
                      <SelectTrigger className="h-14 bg-white/80 border-none shadow-inner rounded-2xl font-bold px-6 focus:ring-2 focus:ring-primary/20 transition-all">
                        <SelectValue placeholder="Capital" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl shadow-2xl">
                        <SelectItem value="all">Any Goal</SelectItem>
                        <SelectItem value="0-100k">{"< $100K"}</SelectItem>
                        <SelectItem value="100k-500k">$100K - $500K</SelectItem>
                        <SelectItem value="500k-1m">$500K - $1M</SelectItem>
                        <SelectItem value="1m-plus">$1M+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <div className="md:col-span-6" />
              )}

              <div className="md:col-span-1">
                <Button variant="ghost" size="icon" className="h-14 w-full rounded-2xl hover:bg-white transition-all active:scale-95" onClick={() => { setSearch(''); setCategoryFilter('all'); setFundingFilter('all'); }}>
                  <FilterX className="w-6 h-6 text-muted-foreground" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue={isStartup ? "investors" : "pitches"} className="space-y-10">
          {(isAdmin || (isStartup && isInvestor)) && (
            <TabsList className="bg-muted/50 p-1.5 rounded-2xl h-14 w-fit">
              <TabsTrigger value="pitches" className="px-10 h-11 rounded-xl text-md font-bold data-[state=active]:shadow-lg transition-all">Ventures</TabsTrigger>
              <TabsTrigger value="investors" className="px-10 h-11 rounded-xl text-md font-bold data-[state=active]:shadow-lg transition-all">Investors</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="pitches" className="mt-0">
            {loadingPitches ? (
              <div className="flex justify-center p-32"><Loader2 className="animate-spin w-12 h-12 text-primary opacity-20" /></div>
            ) : filteredPitches.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredPitches.map((pitch) => (
                  <Card key={pitch.id} className="flex flex-col group hover:shadow-2xl transition-all border-none shadow-md overflow-hidden rounded-[2rem] bg-white relative hover:-translate-y-1">
                    <Link href={`/startup/${pitch.id}`} className="absolute inset-0 z-0" />
                    
                    {/* Pitch Hero Visual */}
                    <div className="relative aspect-video w-full overflow-hidden bg-muted/30">
                      {pitch.imageURL ? (
                        <Image src={pitch.imageURL} alt={pitch.startupName} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/20">
                          <ImageIcon className="w-16 h-16" />
                        </div>
                      )}
                      <div className="absolute top-4 left-4 z-10">
                        <Badge variant="outline" className="text-white border-white/20 bg-black/40 backdrop-blur-md px-4 py-1.5 font-black uppercase tracking-widest text-[9px] rounded-lg">
                          {pitch.category || pitch.industry || 'Other'}
                        </Badge>
                      </div>
                      {isInvestor && (
                        <div className="absolute top-4 right-4 z-10">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className={`h-10 w-10 rounded-full transition-all pointer-events-auto active:scale-90 shadow-lg ${favoritePitchIds.includes(pitch.id) ? 'bg-accent text-white' : 'bg-white/80 backdrop-blur-md text-muted-foreground hover:bg-white hover:text-accent'}`} 
                            onClick={(e) => { e.preventDefault(); handleToggleFavorite(pitch); }}
                          >
                            {favoritePitchIds.includes(pitch.id) ? <BookmarkCheck className="w-6 h-6 fill-current" /> : <Bookmark className="w-6 h-6" />}
                          </Button>
                        </div>
                      )}
                    </div>

                    <CardHeader className="space-y-2 relative z-10 pointer-events-none p-8">
                      <CardTitle className="text-2xl font-black group-hover:text-primary transition-colors leading-tight">{pitch.startupName}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-8 relative z-10 pointer-events-none p-8 pt-0">
                      <div className="text-muted-foreground text-sm line-clamp-2 leading-relaxed italic">
                        &quot;{pitch.description}&quot;
                      </div>
                      <div className="grid grid-cols-2 gap-6 pt-4 border-t border-muted/50">
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black flex items-center gap-2">
                            <TrendingUp className="w-3.5 h-3.5 text-primary" /> Goal
                          </p>
                          <p className="text-xl font-black text-primary">${typeof pitch.fundingNeeded === 'number' ? pitch.fundingNeeded.toLocaleString() : pitch.fundingNeeded}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black flex items-center gap-2">
                            <LayoutGrid className="w-3.5 h-3.5 text-accent" /> Insight
                          </p>
                          <p className="text-sm font-black flex items-center gap-1.5 text-accent">Review Details <ArrowRight className="w-3.5 h-3.5" /></p>
                        </div>
                      </div>
                    </CardContent>
                    {isInvestor && (
                      <CardFooter className="p-8 pt-0 flex gap-3 relative z-10 pointer-events-auto">
                        <div className="flex-1">{getContactButton(pitch)}</div>
                        <Button 
                          className={`flex-1 h-11 rounded-xl shadow-lg font-black transition-all active:scale-95 ${userInterests.includes(pitch.id) ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-primary hover:bg-primary/90 shadow-primary/20'}`} 
                          onClick={() => handleShowInterest(pitch)} 
                          disabled={userInterests.includes(pitch.id)}
                        >
                          {userInterests.includes(pitch.id) ? <><CheckCircle2 className="mr-2 w-5 h-5" /> Interested</> : <><Sparkles className="mr-2 w-5 h-5" /> Express Interest</>}
                        </Button>
                      </CardFooter>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-48 bg-white rounded-[3rem] shadow-xl border-4 border-dashed border-muted/50 flex flex-col items-center">
                <div className="p-8 bg-muted/10 rounded-full mb-8">
                  <Search className="w-16 h-16 text-muted-foreground opacity-30" />
                </div>
                <h3 className="text-3xl font-black mb-4">No matching ventures</h3>
                <p className="text-muted-foreground text-lg mb-8 max-w-md">Try refining your discovery filters or search terms to see more opportunities.</p>
                <Button variant="outline" size="lg" className="rounded-2xl px-10 border-2 font-bold transition-all hover:bg-primary/5 active:scale-95" onClick={() => { setSearch(''); setCategoryFilter('all'); setFundingFilter('all'); }}>Reset Filters</Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="investors" className="mt-0">
            {loadingInvestors ? (
              <div className="flex justify-center p-32"><Loader2 className="animate-spin w-12 h-12 text-primary opacity-20" /></div>
            ) : filteredInvestors.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredInvestors.map((investor) => (
                  <Link key={investor.id} href={`/investor/${investor.id}`}>
                    <Card className="group h-full hover:shadow-2xl transition-all border-none shadow-md overflow-hidden rounded-[2rem] bg-white hover:-translate-y-1">
                      <CardHeader className="p-8 pb-4">
                        <div className="flex justify-between items-start mb-6">
                          <Badge className="bg-primary/10 text-primary border-none font-black uppercase tracking-widest text-[9px] px-3 py-1">Capital Partner</Badge>
                          <div className="p-3 bg-primary/5 rounded-2xl group-hover:bg-primary group-hover:text-white transition-all">
                            <Users className="w-5 h-5" />
                          </div>
                        </div>
                        <CardTitle className="text-2xl font-black group-hover:text-primary transition-colors">{investor.name || 'Private Member'}</CardTitle>
                        <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">{investor.company || 'Venture Group'}</CardDescription>
                      </CardHeader>
                      <CardContent className="p-8 pt-4 pb-10">
                        <p className="text-sm text-muted-foreground italic leading-relaxed line-clamp-3 mb-8">&quot;{investor.bio || "Actively identifying the next generation of global market disruptions."}&quot;</p>
                        <div className="flex flex-wrap gap-2">
                          {investor.investmentInterest?.split(',').slice(0, 4).map((tag: string, i: number) => (
                            <Badge key={i} variant="secondary" className="bg-muted/30 text-muted-foreground font-bold px-3 py-1 rounded-lg border-none">{tag.trim()}</Badge>
                          ))}
                        </div>
                      </CardContent>
                      <CardFooter className="p-8 pt-6 border-t border-muted/50 bg-muted/5 flex justify-between items-center">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                          {investor.verified && <ShieldCheck className="w-4 h-4 text-emerald-500" />} {investor.verified ? "Identity Verified" : "Identity Unverified"}
                        </span>
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:translate-x-1 transition-transform">
                          <ArrowRight className="w-5 h-5 text-primary" />
                        </div>
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-48 bg-white rounded-[3rem] shadow-xl border-4 border-dashed border-muted/50 flex flex-col items-center">
                <div className="p-8 bg-muted/10 rounded-full mb-8">
                  <Users className="w-16 h-16 text-muted-foreground opacity-30" />
                </div>
                <h3 className="text-3xl font-black mb-4">No matching investors</h3>
                <p className="text-muted-foreground text-lg mb-8 max-w-md">Broaden your criteria to find more matching strategic partners for your venture.</p>
                <Button variant="outline" size="lg" className="rounded-2xl px-10 border-2 font-bold transition-all hover:bg-primary/5 active:scale-95" onClick={() => setSearch('')}>Clear Search</Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
