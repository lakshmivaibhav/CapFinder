"use client";

import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, TrendingUp, Plus, User, LogOut, Search, Megaphone, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [pitches, setPitches] = useState<any[]>([]);
  const [loadingPitches, setLoadingPitches] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchPitches = async () => {
      if (!user || !profile) return;
      setLoadingPitches(true);
      try {
        let q;
        if (profile.role === 'startup') {
          q = query(collection(db, 'pitches'), where('ownerId', '==', user.uid), orderBy('createdAt', 'desc'));
        } else {
          // Investors see recently added pitches
          q = query(collection(db, 'pitches'), orderBy('createdAt', 'desc'), limit(10));
        }
        const querySnapshot = await getDocs(q);
        const fetchedPitches = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPitches(fetchedPitches);
      } catch (error) {
        console.error("Error fetching pitches:", error);
      } finally {
        setLoadingPitches(false);
      }
    };

    if (user && profile) fetchPitches();
  }, [user, profile]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  if (authLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto w-10 h-10 text-primary" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 h-20 flex items-center justify-between border-b bg-white shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <TrendingUp className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-bold text-primary hidden sm:inline">CapFinder</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/profile">
            <Button variant="ghost" className="gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </Button>
          </Link>
          <Button variant="ghost" className="gap-2 text-destructive hover:text-destructive" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome, {profile?.name || user.email}</h1>
            <p className="text-muted-foreground">Here is what is happening with your {profile?.role} account.</p>
          </div>
          {profile?.role === 'startup' && (
            <Link href="/pitches/new">
              <Button className="bg-primary h-12 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all">
                <Plus className="mr-2 w-5 h-5" /> Post New Pitch
              </Button>
            </Link>
          )}
          {profile?.role === 'investor' && (
            <Link href="/pitches">
              <Button className="bg-accent text-white h-12 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all">
                <Search className="mr-2 w-5 h-5" /> Explore All Pitches
              </Button>
            </Link>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-primary" />
                {profile?.role === 'startup' ? "Your Pitches" : "Recent Opportunities"}
              </h2>
            </div>

            {loadingPitches ? (
              <div className="grid gap-4">
                {[1, 2, 3].map(i => <div key={i} className="h-32 w-full bg-muted animate-pulse rounded-xl" />)}
              </div>
            ) : pitches.length > 0 ? (
              <div className="grid gap-4">
                {pitches.map((pitch) => (
                  <Card key={pitch.id} className="hover:shadow-md transition-all border-l-4 border-l-primary overflow-hidden">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <div>
                        <CardTitle className="text-lg font-bold">{pitch.startupName}</CardTitle>
                        <CardDescription>{pitch.industry}</CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                        ${pitch.fundingNeeded} Needed
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm line-clamp-2 text-muted-foreground">{pitch.description}</p>
                    </CardContent>
                    <CardFooter className="pt-0 flex justify-between items-center text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {pitch.createdAt?.toDate ? pitch.createdAt.toDate().toLocaleDateString() : 'Just now'}
                      </div>
                      <Link href={`/pitches/${pitch.id}`} className="text-primary font-semibold hover:underline">
                        View Details
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed flex flex-col items-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Megaphone className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No pitches yet</h3>
                <p className="text-muted-foreground max-w-xs mx-auto mb-6">
                  {profile?.role === 'startup' 
                    ? "Start by creating your first pitch to attract investors." 
                    : "Wait for startups to post their innovative ideas."}
                </p>
                {profile?.role === 'startup' && (
                  <Link href="/pitches/new">
                    <Button variant="outline">Create a Pitch</Button>
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold">Quick Insights</h2>
            <Card className="bg-primary text-white overflow-hidden relative">
              <div className="absolute right-[-20px] top-[-20px] w-32 h-32 bg-white/10 rounded-full" />
              <CardHeader>
                <CardTitle className="text-lg">Network Stats</CardTitle>
                <CardDescription className="text-white/70">Performance across CapFinder</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/20 pb-2">
                  <span>Views</span>
                  <span className="text-xl font-bold">128</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/20 pb-2">
                  <span>Inquiries</span>
                  <span className="text-xl font-bold">12</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Trust Score</span>
                  <span className="text-xl font-bold">98%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Profile Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="font-medium text-green-600">85%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '85%' }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Complete your profile to increase visibility to {profile?.role === 'startup' ? 'investors' : 'founders'}.
                </p>
                <Link href="/profile">
                  <Button variant="outline" className="w-full mt-2">Edit Profile</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}