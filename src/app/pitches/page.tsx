
"use client";

import { useState } from 'react';
import { collection, query, serverTimestamp, where, doc } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, TrendingUp, Mail, Globe, Sparkles, CheckCircle2, FilterX, Landmark, Bookmark, BookmarkCheck, Clock, ShieldCheck, XCircle } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function PitchesFeedPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [fundingFilter, setFundingFilter] = useState('all');

  // Fetch all pitches
  const pitchesQuery = useMemoFirebase(() => query(collection(db, 'pitches')), [db]);
  const { data: pitches, isLoading: loadingPitches } = useCollection(pitchesQuery);

  // Fetch interests for current investor to prevent double-interest
  const interestsQuery = useMemoFirebase(() => {
    if (!user || profile?.role !== 'investor') return null;
    return query(collection(db, 'interests'), where('investorId', '==', user.uid));
  }, [db, user, profile]);
  const { data: userInterestsData } = useCollection(interestsQuery);

  // Fetch favorites for current investor
  const favoritesQuery = useMemoFirebase(() => {
    if (!user || profile?.role !== 'investor') return null;
    return query(collection(db, 'favorites'), where('investorId', '==', user.uid));
  }, [db, user, profile]);
  const { data: userFavoritesData } = useCollection(favoritesQuery);

  // Fetch contact requests for current investor
  const contactRequestsQuery = useMemoFirebase(() => {
    if (!user || profile?.role !== 'investor') return null;
    return query(collection(db, 'contactRequests'), where('senderId', '==', user.uid));
  }, [db, user, profile]);
  const { data: userContactRequestsData } = useCollection(contactRequestsQuery);

  const userInterests = userInterestsData?.map(i => i.pitchId) || [];
  const favoritePitchIds = userFavoritesData?.map(f => f.pitchId) || [];
  const contactRequests = userContactRequestsData || [];

  const industries = Array.from(new Set(pitches?.map(p => p.industry) || [])).filter(Boolean);

  const filteredPitches = pitches?.filter(p => {
    const matchesSearch = (p.startupName?.toLowerCase() || "").includes(search.toLowerCase());
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

  const handleShowInterest = async (pitch: any) => {
    if (!user || profile?.role !== 'investor') return;
    if (userInterests.includes(pitch.id)) return;

    addDocumentNonBlocking(collection(db, 'interests'), {
      pitchId: pitch.id,
      investorId: user.uid,
      investorEmail: user.email,
      startupOwnerId: pitch.ownerId,
      startupName: pitch.startupName,
      industry: pitch.industry,
      timestamp: serverTimestamp(),
    });
    
    toast({
      title: "Interest Registered",
      description: `The founders of ${pitch.startupName} have been notified.`,
    });
  };

  const handleToggleFavorite = async (pitch: any) => {
    if (!user || profile?.role !== 'investor') return;

    const existingFavorite = userFavoritesData?.find(f => f.pitchId === pitch.id);

    if (existingFavorite) {
      deleteDocumentNonBlocking(doc(db, 'favorites', existingFavorite.id));
      toast({
        title: "Removed from favorites",
        description: `${pitch.startupName} has been removed from your saved pitches.`,
      });
    } else {
      addDocumentNonBlocking(collection(db, 'favorites'), {
        pitchId: pitch.id,
        investorId: user.uid,
        startupName: pitch.startupName,
        industry: pitch.industry,
        timestamp: serverTimestamp(),
      });
      toast({
        title: "Saved to favorites",
        description: `${pitch.startupName} is now in your saved list.`,
      });
    }
  };

  const handleRequestContact = async (pitch: any) => {
    if (!user || profile?.role !== 'investor') return;
    
    const existing = contactRequests.find(r => r.pitchId === pitch.id);
    if (existing) return;

    // Use a deterministic ID for security rules lookup: investorId_startupOwnerId_pitchId
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

    toast({
      title: "Contact Request Sent",
      description: `You've requested contact details from ${pitch.startupName}.`,
    });
  };

  const getContactButton = (pitch: any) => {
    if (profile?.role !== 'investor') {
        return (
            <Link href={`mailto:${pitch.contactEmail}`} className="flex-1">
                <Button variant="outline" className="w-full h-10 border-primary/20 hover:bg-primary/5">
                <Mail className="mr-2 w-4 h-4" /> Contact
                </Button>
            </Link>
        );
    }

    const request = contactRequests.find(r => r.pitchId === pitch.id);

    if (!request) {
      return (
        <Button 
          variant="outline" 
          className="flex-1 h-10 border-primary/20 hover:bg-primary/5"
          onClick={() => handleRequestContact(pitch)}
        >
          <Mail className="mr-2 w-4 h-4" /> Request Contact
        </Button>
      );
    }

    if (request.status === 'pending') {
      return (
        <Button variant="secondary" className="flex-1 h-10 opacity-70 cursor-default" disabled>
          <Clock className="mr-2 w-4 h-4" /> Pending Approval
        </Button>
      );
    }

    if (request.status === 'accepted') {
      return (
        <div className="flex-1 flex gap-2">
          <Link href={`mailto:${pitch.contactEmail}`} className="flex-1">
            <Button variant="outline" className="w-full h-10 border-green-500/20 bg-green-50 text-green-700 hover:bg-green-100">
              <Mail className="mr-2 w-4 h-4 text-green-600" /> Email
            </Button>
          </Link>
          <Link href="/messages" className="flex-1">
            <Button variant="default" className="w-full h-10 bg-primary">
              Chat
            </Button>
          </Link>
        </div>
      );
    }

    if (request.status === 'rejected') {
      return (
        <Button variant="outline" className="flex-1 h-10 border-red-200 text-red-400 opacity-60" disabled>
          <XCircle className="mr-2 w-4 h-4" /> Request Declined
        </Button>
      );
    }

    return null;
  };

  if (authLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto w-10 h-10 text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-col gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Investment Marketplace</h1>
            <p className="text-muted-foreground text-lg">
              Discover and connect with {pitches?.length || 0} high-potential ventures.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl shadow-sm border space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Landmark className="w-4 h-4" />
              Filter Opportunities
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-5 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input 
                  placeholder="Search by startup name..." 
                  className="pl-10 h-11 bg-muted/30 border-none"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="md:col-span-3">
                <Select value={industryFilter} onValueChange={setIndustryFilter}>
                  <SelectTrigger className="h-11 bg-muted/30 border-none">
                    <SelectValue placeholder="All Industries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Industries</SelectItem>
                    {industries.map(ind => (
                      <SelectItem key={ind as string} value={ind as string}>{ind as string}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-3">
                <Select value={fundingFilter} onValueChange={setFundingFilter}>
                  <SelectTrigger className="h-11 bg-muted/30 border-none">
                    <SelectValue placeholder="Funding Amount" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Funding Amount</SelectItem>
                    <SelectItem value="0-100k">Up to $100k</SelectItem>
                    <SelectItem value="100k-500k">$100k - $500k</SelectItem>
                    <SelectItem value="500k-1m">$500k - $1M</SelectItem>
                    <SelectItem value="1m-plus">$1M+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-11 w-full text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => { setSearch(''); setIndustryFilter('all'); setFundingFilter('all'); }}
                  title="Clear Filters"
                >
                  <FilterX className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {loadingPitches ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-64 w-full bg-muted animate-pulse rounded-2xl" />)}
          </div>
        ) : filteredPitches.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPitches.map((pitch) => (
              <Card key={pitch.id} className="flex flex-col group hover:shadow-xl transition-all border-none shadow-sm overflow-hidden rounded-2xl bg-white relative">
                <CardHeader className="space-y-4">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 px-3 py-1">
                      {pitch.industry}
                    </Badge>
                    {profile?.role === 'investor' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 rounded-full ${favoritePitchIds.includes(pitch.id) ? 'text-accent' : 'text-muted-foreground hover:text-accent'}`}
                        onClick={() => handleToggleFavorite(pitch)}
                      >
                        {favoritePitchIds.includes(pitch.id) ? <BookmarkCheck className="w-5 h-5 fill-current" /> : <Bookmark className="w-5 h-5" />}
                      </Button>
                    )}
                  </div>
                  <CardTitle className="text-2xl font-bold group-hover:text-primary transition-colors">{pitch.startupName}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-6">
                  <div className="text-muted-foreground text-sm line-clamp-4 leading-relaxed bg-muted/30 p-4 rounded-xl italic">
                    &quot;{pitch.description}&quot;
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Target
                      </p>
                      <p className="text-lg font-bold text-primary">
                        ${typeof pitch.fundingNeeded === 'number' ? pitch.fundingNeeded.toLocaleString() : pitch.fundingNeeded}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Stage
                      </p>
                      <p className="text-lg font-bold">Seed</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-6 pt-0 flex gap-2">
                  {getContactButton(pitch)}
                  {profile?.role === 'investor' && (
                    <Button 
                      className={`flex-1 h-10 shadow-sm ${userInterests.includes(pitch.id) ? 'bg-green-600 hover:bg-green-600' : 'bg-primary'}`}
                      onClick={() => handleShowInterest(pitch)}
                      disabled={userInterests.includes(pitch.id)}
                    >
                      {userInterests.includes(pitch.id) ? (
                        <>Interested <CheckCircle2 className="ml-2 w-4 h-4" /></>
                      ) : (
                        <>Show Interest <Sparkles className="ml-2 w-4 h-4" /></>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-40 bg-white rounded-3xl shadow-sm border border-dashed">
            <FilterX className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-2xl font-bold mb-2">No matching startups</h3>
            <p className="text-muted-foreground">Try broadening your search or adjusting your filters.</p>
            <Button variant="link" onClick={() => { setSearch(''); setIndustryFilter('all'); setFundingFilter('all'); }} className="mt-4 text-primary">
              Reset all filters
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
