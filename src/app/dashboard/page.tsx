"use client";

import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Plus, Megaphone, Calendar, ArrowRight, Briefcase, Users, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/navbar';

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
          q = query(collection(db, 'pitches'), orderBy('createdAt', 'desc'), limit(5));
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

  if (authLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto w-10 h-10 text-primary" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {profile?.name || user.email}</p>
          </div>
          <div className="flex gap-3">
            {profile?.role === 'startup' && (
              <Link href="/pitches/new">
                <Button className="h-11 px-6 shadow-md">
                  <Plus className="mr-2 w-5 h-5" /> Create Pitch
                </Button>
              </Link>
            )}
            <Link href="/profile">
              <Button variant="outline" className="h-11 px-6">Edit Profile</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <Card className="border-none shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">My Role</p>
                <p className="text-xl font-bold capitalize">{profile?.role}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                <Megaphone className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Pitches</p>
                <p className="text-xl font-bold">{pitches.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Connections</p>
                <p className="text-xl font-bold">12</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Target Capital</p>
                <p className="text-xl font-bold">${profile?.fundingNeeded || '0'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {profile?.role === 'startup' ? "Recent Pitches" : "Latest Opportunities"}
              </h2>
              <Link href="/pitches" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {loadingPitches ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-32 w-full bg-muted animate-pulse rounded-xl" />)}
              </div>
            ) : pitches.length > 0 ? (
              <div className="space-y-4">
                {pitches.map((pitch) => (
                  <Card key={pitch.id} className="group hover:shadow-md transition-all overflow-hidden border-none shadow-sm">
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                      <div>
                        <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">{pitch.startupName}</CardTitle>
                        <CardDescription>{pitch.industry}</CardDescription>
                      </div>
                      <Badge variant="secondary" className="bg-primary/5 text-primary">
                        ${pitch.fundingNeeded}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">{pitch.description}</p>
                    </CardContent>
                    <CardFooter className="pt-0 flex justify-between items-center text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {pitch.createdAt?.toDate ? pitch.createdAt.toDate().toLocaleDateString() : 'Recent'}
                      </div>
                      <Link href={`/pitches`} className="text-primary font-semibold hover:underline">
                        Details
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
            <h2 className="text-xl font-bold">Recommended for You</h2>
            <Card className="border-none shadow-sm bg-primary text-white">
              <CardHeader>
                <CardTitle className="text-lg">Pro Tip</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-primary-foreground/90 leading-relaxed">
                  Keeping your pitch description concise and problem-focused increases investor engagement by up to 40%. Use our AI assistant to refine your message!
                </p>
                <Link href="/pitches/new">
                  <Button variant="secondary" className="w-full mt-4 bg-white text-primary hover:bg-white/90">
                    Try AI Refiner
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Network Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Users className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Investor viewed your pitch</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}