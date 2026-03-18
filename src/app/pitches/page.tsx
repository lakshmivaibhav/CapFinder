"use client";

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Filter, TrendingUp, Mail, ExternalLink, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PitchesFeedPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [pitches, setPitches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchPitches = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'pitches'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedPitches = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPitches(fetchedPitches);
      } catch (error) {
        console.error("Error fetching pitches:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPitches();
  }, []);

  const filteredPitches = pitches.filter(p => 
    p.startupName.toLowerCase().includes(search.toLowerCase()) || 
    p.industry.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto w-10 h-10 text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 h-20 flex items-center justify-between border-b bg-white shadow-sm sticky top-0 z-50">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <TrendingUp className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-bold text-primary">CapFinder</span>
        </Link>
        <Link href="/dashboard">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Investment Opportunities</h1>
            <p className="text-muted-foreground text-lg">Discover high-potential startups seeking capital.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Search startups, industries..." 
                className="pl-10 h-12 rounded-xl"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" className="h-12 rounded-xl">
              <Filter className="mr-2 w-4 h-4" /> Filter
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-64 w-full bg-muted animate-pulse rounded-2xl" />)}
          </div>
        ) : filteredPitches.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPitches.map((pitch) => (
              <Card key={pitch.id} className="flex flex-col group hover:shadow-xl transition-all border-none shadow-md overflow-hidden rounded-2xl">
                <div className="h-2 bg-primary" />
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary" className="bg-accent/10 text-accent-foreground hover:bg-accent/20 border-none px-3 py-1">
                      {pitch.industry}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl font-bold group-hover:text-primary transition-colors">{pitch.startupName}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <p className="text-muted-foreground line-clamp-4 leading-relaxed italic">
                    &quot;{pitch.description}&quot;
                  </p>
                  <div className="pt-4 border-t flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Funding Goal</p>
                      <p className="text-xl font-bold text-primary">${pitch.fundingNeeded}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/30 pt-4 flex gap-2">
                  <Link href={`mailto:${pitch.contactEmail}`} className="flex-1">
                    <Button variant="outline" className="w-full bg-white border-primary/20 hover:bg-primary/5">
                      <Mail className="mr-2 w-4 h-4" /> Contact
                    </Button>
                  </Link>
                  <Button className="bg-primary hover:bg-primary/90 flex-1">
                    Details <ExternalLink className="ml-2 w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-40">
            <h3 className="text-2xl font-bold mb-2">No results found</h3>
            <p className="text-muted-foreground">Try adjusting your search criteria.</p>
          </div>
        )}
      </main>
    </div>
  );
}