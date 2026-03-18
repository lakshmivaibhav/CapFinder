"use client";

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, TrendingUp, Mail, ExternalLink, Globe, Sparkles, CheckCircle2 } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking } from '@/firebase';

export default function PitchesFeedPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [pitches, setPitches] = useState<any[]>([]);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'pitches'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedPitches = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPitches(fetchedPitches);

        // Explicitly guard interest fetch with role check to avoid permission errors
        if (user && profile?.role === 'investor') {
          const interestQuery = query(collection(db, 'interests'), where('investorId', '==', user.uid));
          const interestSnap = await getDocs(interestQuery);
          setUserInterests(interestSnap.docs.map(doc => doc.data().pitchId));
        }
      } catch (error) {
        console.error("Error fetching marketplace data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [db, user, profile]);

  const industries = Array.from(new Set(pitches.map(p => p.industry))).filter(Boolean);

  const filteredPitches = pitches.filter(p => {
    const matchesSearch = (p.startupName?.toLowerCase() || "").includes(search.toLowerCase()) || 
                          (p.industry?.toLowerCase() || "").includes(search.toLowerCase()) ||
                          (p.description?.toLowerCase() || "").includes(search.toLowerCase());
    const matchesIndustry = industryFilter === 'all' || p.industry === industryFilter;
    return matchesSearch && matchesIndustry;
  });

  const handleShowInterest = async (pitch: any) => {
    if (!user || !profile || profile.role !== 'investor') return;
    if (userInterests.includes(pitch.id)) return;

    try {
      addDocumentNonBlocking(collection(db, 'interests'), {
        pitchId: pitch.id,
        investorId: user.uid,
        investorEmail: user.email,
        startupOwnerId: pitch.ownerId,
        startupName: pitch.startupName,
        timestamp: serverTimestamp(),
      });
      
      setUserInterests([...userInterests, pitch.id]);
      toast({
        title: "Interest Sent!",
        description: `You've expressed interest in ${pitch.startupName}.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Action failed",
        description: "Could not express interest at this time."
      });
    }
  };

  if (authLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto w-10 h-10 text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Marketplace</h1>
            <p className="text-muted-foreground text-lg">Browse {pitches.length} investment opportunities.</p>
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Search startups, keywords..." 
                className="pl-10 h-11 bg-white border-none shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger className="w-[180px] h-11 bg-white border-none shadow-sm">
                <SelectValue placeholder="Industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {industries.map(ind => (
                  <SelectItem key={ind as string} value={ind as string}>{ind as string}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-64 w-full bg-muted animate-pulse rounded-2xl" />)}
          </div>
        ) : filteredPitches.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPitches.map((pitch) => (
              <Card key={pitch.id} className="flex flex-col group hover:shadow-xl transition-all border-none shadow-sm overflow-hidden rounded-2xl bg-white">
                <CardHeader className="space-y-4">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 px-3 py-1">
                      {pitch.industry}
                    </Badge>
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
                      <p className="text-lg font-bold text-primary">${pitch.fundingNeeded}</p>
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
                  <Link href={`mailto:${pitch.contactEmail}`} className="flex-1">
                    <Button variant="outline" className="w-full h-10 border-primary/20 hover:bg-primary/5">
                      <Mail className="mr-2 w-4 h-4" /> Contact
                    </Button>
                  </Link>
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
          <div className="text-center py-40 bg-white rounded-3xl shadow-inner border border-dashed">
            <h3 className="text-2xl font-bold mb-2">No results found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters.</p>
            <Button variant="link" onClick={() => { setSearch(''); setIndustryFilter('all'); }} className="mt-4">
              Clear all filters
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}