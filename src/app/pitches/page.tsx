"use client";

import { useState, useEffect } from 'react';
import { collection, query, serverTimestamp, where, doc, limit } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useCollection, useDoc, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, TrendingUp, Mail, Landmark, Bookmark, BookmarkCheck, Clock, ShieldCheck, ArrowRight, Users, LayoutGrid, FilterX, CheckCircle2, Sparkles, Image as ImageIcon, Building, MessageSquare } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

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

function OwnerLogo({ ownerId }: { ownerId: string }) {
  const db = useFirestore();
  const ownerRef = useMemoFirebase(() => doc(db, 'users', ownerId), [db, ownerId]);
  const { data: owner } = useDoc(ownerRef);

  if (!owner?.logoURL) return (
    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground/40 border-2 border-white shadow-sm">
      <Building className="w-5 h-5" />
    </div>
  );

  return (
    <div className="w-10 h-10 rounded-xl bg-white shadow-md border-2 border-white overflow-hidden flex items-center justify-center p-1.5 transition-transform group-hover:scale-110">
      <Image src={owner.logoURL} alt="Startup Logo" width={32} height={32} className="object-contain" unoptimized />
    </div>
  );
}

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

  // Optimized query with 100 limit
  const pitchesQuery = useMemoFirebase(() => {
    if (!profile || profile.disabled === true || (!isAdmin && !isInvestor)) return null;
    return query(collection(db, 'pitches'), limit(100));
  }, [db, profile, isAdmin, isInvestor]);

  const { data: pitches, isLoading: loadingPitches } = useCollection(pitchesQuery);

  // Optimized query with 50 limit
  const investorsQuery = useMemoFirebase(() => {
    if (!profile || profile.disabled === true || (!isAdmin && !isStartup)) return null;
    return query(
      collection(db, 'users'), 
      where('role', '==', 'investor'), 
      where('disabled', '==', false),
      limit(50)
    );
  }, [db, profile, isAdmin, isStartup]);

  const { data: investors, isLoading: loadingInvestors } = useCollection(investorsQuery);

  const interestsQuery = useMemoFirebase(() => {
    if (!user || !profile || !isInvestor || profile.disabled === true) return null;
    return query(collection(db, 'interests'), where('investorId', '==', user.uid), limit(100));
  }, [db, user, profile, isInvestor]);
  const { data: userInterestsData } = useCollection(interestsQuery);

  const favoritesQuery = useMemoFirebase(() => {
    if (!user || !profile || !isInvestor || profile.disabled === true) return null;
    return query(collection(db, 'favorites'), where('investorId', '==', user.uid), limit(100));
  }, [db, user, profile, isInvestor]);
  const { data: userFavoritesData } = useCollection(favoritesQuery);

  const contactRequestsQuery = useMemoFirebase(() => {
    if (!user || !profile || !isInvestor || profile.disabled === true) return null;
    return query(collection(db, 'contactRequests'), where('senderId', '==', user.uid), limit(100));
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
    if (!request) return <Button variant="outline" className="flex-1 h-12 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all hover:bg-primary hover:text-white hover:border-primary active:scale-95 shadow-sm" onClick={() => handleRequestContact(pitch)}><Mail className="mr-2 w-4 h-4" /> Connect</Button>;
    if (request.status === 'pending') return <Button variant="secondary" className="flex-1 h-12 rounded-xl opacity-70 cursor-default bg-muted font-black uppercase text-[10px] tracking-widest" disabled><Clock className="mr-2 w-4 h-4 animate-pulse" /> Pending</Button>;
    if (request.status === 'accepted') return (
      <div className="flex-1 flex gap-2">
        <Link href="/messages" className="flex-1">
          <Button variant="default" className="w-full h-12 rounded-xl bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20 font-black uppercase text-[10px] tracking-widest transition-all active:scale-95">
            <MessageSquare className="w-4 h-4 mr-2" /> Hub
          </Button>
        </Link>
      </div>
    );
    return null;
  };

  if (authLoading || (user && !emailVerified)) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full space-y-12">
        <div className="flex flex-col gap-12">
          <div className="space-y-4 max-w-3xl text-center md:text-left">
            <h1 className="text-6xl font-black tracking-tighter leading-tight">
              {isStartup ? "Investor Network" : isInvestor ? "Venture Marketplace" : "Market Hub"}
            </h1>
            <p className="text-2xl leading-relaxed italic border-l-8 border-primary/20 pl-8 text-muted-foreground">
              {isStartup ? `Bridge your vision with our ${investors?.length || 0} strategic investment partners.` : `Curated high-potential opportunities. Explore active ventures within our verified protocol.`}
            </p>
          </div>

          <Card className="p-10 bg-white/60 backdrop-blur-xl rounded-[2rem] shadow-xl border-none ring-1 ring-black/5 space-y-10 transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary rounded-xl shadow-lg shadow-primary/20">
                <Landmark className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-black uppercase tracking-[0.3em] text-primary text-[10px]">Strategic Discovery Engine</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-5 relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground w-6 h-6 group-focus-within:text-primary transition-colors" />
                <input 
                  placeholder={isStartup ? "Filter potential partners..." : "Search ventures, sectors, technology..."}
                  className="pl-14 h-16 w-full bg-white border-none shadow-inner rounded-xl text-lg font-medium placeholder:text-muted-foreground/40 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {!isStartup ? (
                <>
                  <div className="md:col-span-3">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-16 bg-white border-none shadow-inner rounded-xl font-black uppercase text-[10px] tracking-widest px-8 focus:ring-4 focus:ring-primary/10 transition-all">
                        <SelectValue placeholder="All Sectors" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-2xl border-none p-2">
                        <SelectItem value="all" className="rounded-lg font-bold">All Sectors</SelectItem>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat} className="rounded-lg font-bold">{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-3">
                    <Select value={fundingFilter} onValueChange={setFundingFilter}>
                      <SelectTrigger className="h-16 bg-white border-none shadow-inner rounded-xl font-black uppercase text-[10px] tracking-widest px-8 focus:ring-4 focus:ring-primary/10 transition-all">
                        <SelectValue placeholder="Target Capital" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-2xl border-none p-2">
                        <SelectItem value="all" className="rounded-lg font-bold">Any Goal</SelectItem>
                        <SelectItem value="0-100k" className="rounded-lg font-bold">{"< $100K"}</SelectItem>
                        <SelectItem value="100k-500k" className="rounded-lg font-bold">$100K - $500K</SelectItem>
                        <SelectItem value="500k-1m" className="rounded-lg font-bold">$500K - $1M</SelectItem>
                        <SelectItem value="1m-plus" className="rounded-lg font-bold">$1M+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <div className="hidden md:block md:col-span-6" />
              )}

              <div className="md:col-span-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-16 w-full rounded-xl hover:bg-white hover:shadow-md transition-all active:scale-95 group" 
                  onClick={() => { setSearch(''); setCategoryFilter('all'); setFundingFilter('all'); }}
                >
                  <FilterX className="w-6 h-6 text-muted-foreground group-hover:text-destructive transition-colors" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue={isStartup ? "investors" : "pitches"} className="space-y-12">
          {(isAdmin || (isStartup && isInvestor)) && (
            <div className="flex justify-center">
              <TabsList className="bg-muted/50 p-1.5 rounded-2xl h-16 w-full sm:w-fit shadow-inner">
                <TabsTrigger value="pitches" className="flex-1 sm:flex-none px-12 h-13 rounded-xl text-sm font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all">Ventures</TabsTrigger>
                <TabsTrigger value="investors" className="flex-1 sm:flex-none px-12 h-13 rounded-xl text-sm font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all">Investors</TabsTrigger>
              </TabsList>
            </div>
          )}

          <TabsContent value="pitches" className="mt-0 outline-none">
            {loadingPitches ? (
              <div className="flex justify-center p-48"><Loader2 className="animate-spin w-16 h-16 text-primary opacity-20" /></div>
            ) : filteredPitches.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                {filteredPitches.map((pitch) => (
                  <Card key={pitch.id} className={cn(
                    "flex flex-col group hover:shadow-2xl transition-all duration-500 border-none shadow-xl overflow-hidden rounded-[2rem] bg-white relative hover:-translate-y-2",
                    pitch.ownerVerified && "ring-4 ring-primary/10"
                  )}>
                    <Link href={`/startup/${pitch.id}`} className="absolute inset-0 z-0" />
                    
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted/30">
                      {pitch.imageURL ? (
                        <Image src={pitch.imageURL} alt={pitch.startupName} fill className="object-cover transition-transform duration-700 ease-out group-hover:scale-110" unoptimized />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/10">
                          <ImageIcon className="w-24 h-24" />
                        </div>
                      )}
                      
                      <div className="absolute top-6 left-6 z-10 flex flex-col gap-3">
                        <Badge variant="outline" className="w-fit text-white border-white/30 bg-black/40 backdrop-blur-md px-5 py-2 font-black uppercase tracking-[0.2em] text-[10px] rounded-lg shadow-lg">
                          {pitch.category || pitch.industry || 'Other'}
                        </Badge>
                        {pitch.ownerVerified && (
                          <Badge className="w-fit bg-primary text-white border-none px-4 py-2 font-black uppercase tracking-[0.2em] text-[10px] rounded-lg shadow-xl shadow-primary/20">
                            <ShieldCheck className="w-3.5 h-3.5 mr-2" /> Verified
                          </Badge>
                        )}
                      </div>

                      {isInvestor && (
                        <div className="absolute top-6 right-6 z-10">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className={cn(
                              "h-12 w-12 rounded-xl transition-all pointer-events-auto active:scale-90 shadow-2xl",
                              favoritePitchIds.includes(pitch.id) ? 'bg-accent text-white' : 'bg-white/90 backdrop-blur-md text-muted-foreground hover:bg-white hover:text-accent'
                            )} 
                            onClick={(e) => { e.preventDefault(); handleToggleFavorite(pitch); }}
                          >
                            {favoritePitchIds.includes(pitch.id) ? <BookmarkCheck className="w-6 h-6 fill-current" /> : <Bookmark className="w-6 h-6" />}
                          </Button>
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>

                    <CardHeader className="space-y-5 relative z-10 pointer-events-none p-8 pb-0">
                      <div className="flex items-center gap-4">
                        <OwnerLogo ownerId={pitch.ownerId} />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-2xl font-black tracking-tight group-hover:text-primary transition-colors leading-none">{pitch.startupName}</CardTitle>
                            {pitch.ownerVerified && <ShieldCheck className="w-5 h-5 text-primary" />}
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Strategic Venture</p>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 space-y-8 relative z-10 pointer-events-none p-8">
                      <div className="text-muted-foreground text-sm line-clamp-3 leading-relaxed italic border-l-2 border-muted-foreground/10 pl-4">
                        &quot;{pitch.description}&quot;
                      </div>
                      
                      <div className="grid grid-cols-2 gap-8 pt-6 border-t border-muted/50">
                        <div className="space-y-1.5">
                          <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-black flex items-center gap-2">
                            <TrendingUp className="w-3 h-3 text-primary" /> Goal
                          </p>
                          <p className="text-2xl font-black text-primary leading-none tracking-tighter">
                            ${typeof pitch.fundingNeeded === 'number' ? pitch.fundingNeeded.toLocaleString() : pitch.fundingNeeded}
                          </p>
                        </div>
                        <div className="space-y-1.5 flex flex-col justify-end">
                          <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-black flex items-center gap-2">
                            <LayoutGrid className="w-3 h-3 text-accent" /> Analysis
                          </p>
                          <p className="text-[10px] font-black flex items-center gap-1.5 text-accent uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                            Details <ArrowRight className="w-3 h-3" />
                          </p>
                        </div>
                      </div>
                    </CardContent>

                    {isInvestor && (
                      <CardFooter className="p-8 pt-0 flex gap-4 relative z-10 pointer-events-auto">
                        <div className="flex-1">{getContactButton(pitch)}</div>
                        <Button 
                          className={cn(
                            "flex-1 h-12 rounded-xl shadow-lg font-black uppercase text-[10px] tracking-widest transition-all active:scale-95",
                            userInterests.includes(pitch.id) ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-primary hover:bg-primary/90 shadow-primary/20'
                          )} 
                          onClick={() => handleShowInterest(pitch)} 
                          disabled={userInterests.includes(pitch.id)}
                        >
                          {userInterests.includes(pitch.id) ? <><CheckCircle2 className="mr-2 w-4 h-4" /> Logged</> : <><Sparkles className="mr-2 w-4 h-4" /> Interest</>}
                        </Button>
                      </CardFooter>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-48 bg-white rounded-[2rem] shadow-xl border-4 border-dashed border-muted/50 flex flex-col items-center p-6">
                <div className="p-10 bg-muted/10 rounded-full mb-10 scale-125">
                  <Search className="w-16 h-16 text-muted-foreground opacity-20" />
                </div>
                <h3 className="text-4xl font-black mb-4 tracking-tighter">No Ventures Match Criteria</h3>
                <p className="text-xl mb-10 max-w-md font-medium italic text-muted-foreground">Adjust your discovery protocols or reset filters to broaden your search.</p>
                <Button variant="outline" size="lg" className="rounded-xl px-12 h-16 border-2 font-black uppercase tracking-widest text-[10px] transition-all hover:bg-primary hover:text-white hover:border-primary active:scale-95 shadow-xl" onClick={() => { setSearch(''); setCategoryFilter('all'); setFundingFilter('all'); }}>Reset All Protocols</Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="investors" className="mt-0 outline-none">
            {loadingInvestors ? (
              <div className="flex justify-center p-48"><Loader2 className="animate-spin w-16 h-16 text-primary opacity-20" /></div>
            ) : filteredInvestors.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                {filteredInvestors.map((investor) => (
                  <Link key={investor.id} href={`/investor/${investor.id}`}>
                    <Card className={cn(
                      "group h-full hover:shadow-2xl transition-all duration-500 border-none shadow-xl overflow-hidden rounded-[2rem] bg-white hover:-translate-y-2 relative",
                      investor.verified && "ring-4 ring-primary/10"
                    )}>
                      <CardHeader className="p-10 pb-6">
                        <div className="flex justify-between items-start mb-8">
                          <Badge className="bg-primary/10 text-primary border-none font-black uppercase tracking-[0.2em] text-[10px] px-5 py-1.5 rounded-lg">Capital Partner</Badge>
                          <div className="p-4 bg-primary/5 rounded-xl group-hover:bg-primary group-hover:text-white group-hover:shadow-lg shadow-primary/20 transition-all duration-500">
                            <Users className="w-6 h-6" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <CardTitle className="text-3xl font-black tracking-tight group-hover:text-primary transition-colors leading-none">{investor.name || 'Private Member'}</CardTitle>
                            {investor.verified && <ShieldCheck className="w-6 h-6 text-primary" />}
                          </div>
                          <CardDescription className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{investor.company || 'Institutional Group'}</CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="p-10 pt-4 pb-12">
                        <p className="text-md text-muted-foreground italic leading-relaxed line-clamp-3 mb-10 border-l-2 border-primary/10 pl-6">&quot;{investor.bio || "Actively identifying and fueling the next generation of global market disruptions through strategic capital deployment."}&quot;</p>
                        <div className="flex flex-wrap gap-2.5">
                          {investor.investmentInterest?.split(',').slice(0, 4).map((tag: string, i: number) => (
                            <Badge key={i} variant="secondary" className="bg-muted/40 text-muted-foreground font-black uppercase tracking-widest text-[8px] px-4 py-1.5 rounded-lg border-none hover:bg-primary/5 hover:text-primary transition-colors">{tag.trim()}</Badge>
                          ))}
                        </div>
                      </CardContent>
                      <CardFooter className="p-10 pt-8 border-t border-muted/50 bg-muted/5 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-full", investor.verified ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground")}>
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                            {investor.verified ? "Verified Identity" : "Member Identity"}
                          </span>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-md group-hover:translate-x-2 transition-transform duration-500">
                          <ArrowRight className="w-6 h-6 text-primary" />
                        </div>
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-48 bg-white rounded-[2rem] shadow-xl border-4 border-dashed border-muted/50 flex flex-col items-center p-6">
                <div className="p-10 bg-muted/10 rounded-full mb-10 scale-125">
                  <Users className="w-16 h-16 text-muted-foreground opacity-20" />
                </div>
                <h3 className="text-4xl font-black mb-4 tracking-tighter">No Investors Found</h3>
                <p className="text-xl mb-10 max-w-md font-medium italic text-muted-foreground">Broaden your sector criteria to identify matching strategic partners within the ecosystem.</p>
                <Button variant="outline" size="lg" className="rounded-xl px-12 h-16 border-2 font-black uppercase tracking-widest text-[10px] transition-all hover:bg-primary hover:text-white hover:border-primary active:scale-95 shadow-xl" onClick={() => setSearch('')}>Clear Selection Protocol</Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
