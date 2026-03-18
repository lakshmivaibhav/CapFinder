"use client";

import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Plus, Megaphone, Calendar, ArrowRight, Briefcase, Users, DollarSign, Mail, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/navbar';

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const db = useFirestore();
  const router = useRouter();

  // Memoized Queries with explicit role guards and direct UID matching to satisfy security rules
  const pitchesQuery = useMemoFirebase(() => {
    if (!user || !profile || !profile.role) return null;
    if (profile.role === 'startup') {
      // Direct ownerId filter satisfies security rules
      return query(collection(db, 'pitches'), where('ownerId', '==', user.uid));
    }
    // General read for investors is allowed
    return query(collection(db, 'pitches'), limit(10));
  }, [db, user, profile]);

  const interestsQuery = useMemoFirebase(() => {
    if (!user || !profile || !profile.role) return null;
    
    // Split queries by role to match the specific 'list' rules in firestore.rules
    if (profile.role === 'startup') {
      return query(collection(db, 'interests'), where('startupOwnerId', '==', user.uid));
    }
    if (profile.role === 'investor') {
      return query(collection(db, 'interests'), where('investorId', '==', user.uid));
    }
    return null;
  }, [db, user, profile]);

  const { data: pitches, isLoading: loadingPitches } = useCollection(pitchesQuery);
  const { data: interests, isLoading: loadingInterests } = useCollection(interestsQuery);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto w-10 h-10 text-primary" /></div>;
  if (!user) return null;

  const activePitchesCount = pitches?.length || 0;
  const connectionsCount = interests?.length || 0;

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
                <p className="text-xl font-bold capitalize">{profile?.role || 'User'}</p>
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
                <p className="text-xl font-bold">{activePitchesCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Interests</p>
                <p className="text-xl font-bold">{connectionsCount}</p>
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
                {profile?.role === 'startup' ? "My Active Pitches" : "Latest Opportunities"}
              </h2>
              <Link href="/pitches" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
                View marketplace <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {loadingPitches ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-32 w-full bg-muted animate-pulse rounded-xl" />)}
              </div>
            ) : (pitches && pitches.length > 0) ? (
              <div className="space-y-4">
                {pitches.map((pitch) => (
                  <Card key={pitch.id} className="group hover:shadow-md transition-all overflow-hidden border-none shadow-sm">
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                      <div>
                        <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">{pitch.startupName}</CardTitle>
                        <CardDescription>{pitch.industry}</CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="secondary" className="bg-primary/5 text-primary">
                          ${pitch.fundingNeeded}
                        </Badge>
                        {profile?.role === 'startup' && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold uppercase">
                            <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                            {interests?.filter(i => i.pitchId === pitch.id).length || 0} interested
                          </div>
                        )}
                      </div>
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
            <h2 className="text-xl font-bold">
              {profile?.role === 'startup' ? "Interested Investors" : "My Expressions of Interest"}
            </h2>
            <Card className="border-none shadow-sm">
              <CardContent className="p-0">
                {loadingInterests ? (
                  <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>
                ) : (interests && interests.length > 0) ? (
                  <div className="divide-y">
                    {interests.map((interest) => (
                      <div key={interest.id} className="p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-bold text-sm">
                            {profile?.role === 'startup' ? interest.investorEmail : interest.startupName}
                          </p>
                          <Badge variant="outline" className="text-[10px] h-4">
                            {interest.timestamp?.toDate ? interest.timestamp.toDate().toLocaleDateString() : 'New'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          {profile?.role === 'startup' ? 'Expressed interest in your pitch' : 'You expressed interest'}
                        </p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="h-8 text-xs flex-1" asChild>
                            <Link href={`mailto:${profile?.role === 'startup' ? interest.investorEmail : interest.contactEmail}`}>
                              <Mail className="w-3 h-3 mr-2" /> Message
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No interest activity yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-primary text-white">
              <CardHeader>
                <CardTitle className="text-lg">Network Insight</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-primary-foreground/90 leading-relaxed">
                  {profile?.role === 'startup' 
                    ? "Startups that respond to interested investors within 24 hours are 3x more likely to secure a follow-up meeting."
                    : "Following up with founders after expressing interest helps clarify goals and accelerates the due diligence process."}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}