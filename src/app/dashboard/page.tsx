
"use client";

import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, limit, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Plus, Megaphone, Calendar, ArrowRight, Users, DollarSign, Mail, Heart, LayoutGrid, Star, Search, Bookmark, Inbox, CheckCircle2, XCircle, User, ShieldAlert, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  // Unified guards for queries - strictly derived from Firestore profile
  const isStartup = profile?.role === 'startup';
  const isInvestor = profile?.role === 'investor';
  const isAdmin = profile?.role === 'admin';

  // Queries for Startups
  const startupPitchesQuery = useMemoFirebase(() => {
    if (!user || !isStartup) return null;
    return query(
      collection(db, 'pitches'), 
      where('ownerId', '==', user.uid)
    );
  }, [db, user, isStartup]);

  const startupInterestsQuery = useMemoFirebase(() => {
    if (!user || !isStartup) return null;
    return query(
      collection(db, 'interests'), 
      where('startupOwnerId', '==', user.uid)
    );
  }, [db, user, isStartup]);

  const startupContactRequestsQuery = useMemoFirebase(() => {
    if (!user || !isStartup) return null;
    return query(
      collection(db, 'contactRequests'),
      where('receiverId', '==', user.uid)
    );
  }, [db, user, isStartup]);

  // Queries for Investors
  const allPitchesQuery = useMemoFirebase(() => {
    if (!user || (!isInvestor && !isAdmin)) return null;
    return query(collection(db, 'pitches'), limit(50));
  }, [db, user, isInvestor, isAdmin]);

  const investorInterestsQuery = useMemoFirebase(() => {
    if (!user || !isInvestor) return null;
    return query(
      collection(db, 'interests'), 
      where('investorId', '==', user.uid)
    );
  }, [db, user, isInvestor]);

  const investorFavoritesQuery = useMemoFirebase(() => {
    if (!user || !isInvestor) return null;
    return query(
      collection(db, 'favorites'),
      where('investorId', '==', user.uid)
    );
  }, [db, user, isInvestor]);

  // Queries for Admin
  const allUsersQuery = useMemoFirebase(() => {
    if (!user || !isAdmin) return null;
    return query(collection(db, 'users'), limit(50));
  }, [db, user, isAdmin]);

  const { data: startupPitches, isLoading: loadingStartupPitches } = useCollection(startupPitchesQuery);
  const { data: startupInterests, isLoading: loadingStartupInterests } = useCollection(startupInterestsQuery);
  const { data: startupContactRequests, isLoading: loadingStartupContactRequests } = useCollection(startupContactRequestsQuery);
  const { data: allPitches, isLoading: loadingAllPitches } = useCollection(allPitchesQuery);
  const { data: investorInterests, isLoading: loadingInvestorInterests } = useCollection(investorInterestsQuery);
  const { data: investorFavorites, isLoading: loadingInvestorFavorites } = useCollection(investorFavoritesQuery);
  const { data: allUsers, isLoading: loadingAllUsers } = useCollection(allUsersQuery);

  const pendingRequestsCount = startupContactRequests?.filter(r => r.status === 'pending').length || 0;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && user && !profile) {
      router.push('/onboarding');
    }
  }, [user, profile, authLoading, router]);

  const handleUpdateRequestStatus = (requestId: string, status: 'accepted' | 'rejected') => {
    updateDocumentNonBlocking(doc(db, 'contactRequests', requestId), { status });
    toast({
      title: `Request ${status}`,
      description: status === 'accepted' ? 'Investor can now see your contact details.' : 'Introduction request declined.',
    });
  };

  if (authLoading || (user && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin mx-auto w-12 h-12 text-primary" />
          <p className="text-muted-foreground font-medium">Loading your profile...</p>
        </div>
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
            <p className="text-muted-foreground flex items-center gap-2">
              Dashboard for <span className="font-bold text-primary capitalize">{profile.role}</span>
              {isAdmin && <Badge className="bg-destructive hover:bg-destructive/90 text-white border-none">System Admin</Badge>}
            </p>
          </div>
          <div className="flex gap-3">
            {isStartup && (
              <Link href="/pitches/new">
                <Button className="h-11 px-6 shadow-md gap-2 bg-primary">
                  <Plus className="w-5 h-5" /> Create New Pitch
                </Button>
              </Link>
            )}
            {(isInvestor || isAdmin) && (
              <Link href="/pitches">
                <Button className="h-11 px-6 shadow-md gap-2 bg-accent text-white hover:bg-accent/90">
                  <Search className="w-5 h-5" /> Explore Marketplace
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="border-none shadow-sm bg-primary/5">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white">
                {isAdmin ? <LayoutGrid className="w-6 h-6" /> : (isStartup ? <Megaphone className="w-6 h-6" /> : <LayoutGrid className="w-6 h-6" />)}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{isAdmin ? 'Total Pitches' : (isStartup ? 'My Live Pitches' : 'Opportunities')}</p>
                <p className="text-2xl font-bold">{isAdmin ? (allPitches?.length || 0) : (isStartup ? (startupPitches?.length || 0) : (allPitches?.length || 0))}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-accent/5">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center text-white">
                {isAdmin ? <Users className="w-6 h-6" /> : (isStartup ? <Users className="w-6 h-6" /> : <Heart className="w-6 h-6" />)}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{isAdmin ? 'Total Users' : (isStartup ? 'Total Leads' : 'Connections')}</p>
                <p className="text-2xl font-bold">{isAdmin ? (allUsers?.length || 0) : (isStartup ? (startupInterests?.length || 0) : (investorInterests?.length || 0))}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-emerald-50">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                {isStartup ? <Inbox className="w-6 h-6" /> : <Bookmark className="w-6 h-6" />}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{isAdmin ? 'Platform Status' : (isStartup ? 'Contact Requests' : 'Saved Pitches')}</p>
                <p className="text-2xl font-bold">
                  {isAdmin ? 'Active' : (isStartup ? pendingRequestsCount : (investorFavorites?.length || 0))}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Branched Dashboard Content */}
        <Tabs defaultValue="primary" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            {isAdmin ? (
              <>
                <TabsTrigger value="primary" className="px-6 py-2 gap-2">
                  <Megaphone className="w-4 h-4" /> All Pitches
                </TabsTrigger>
                <TabsTrigger value="users" className="px-6 py-2 gap-2">
                  <Users className="w-4 h-4" /> User Management
                </TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="primary" className="px-6 py-2 gap-2">
                  {isStartup ? (
                    <>
                      <Megaphone className="w-4 h-4" /> My Pitches
                      <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-none">
                        {startupPitches?.length || 0}
                      </Badge>
                    </>
                  ) : (
                    <>
                      <LayoutGrid className="w-4 h-4" /> Market Feed
                      <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-none">
                        {allPitches?.length || 0}
                      </Badge>
                    </>
                  )}
                </TabsTrigger>
                <TabsTrigger value="secondary" className="px-6 py-2 gap-2">
                  {isStartup ? (
                    <>
                      <Users className="w-4 h-4" /> Interested Investors
                      <Badge variant="secondary" className="ml-2 bg-accent/10 text-accent border-none">
                        {startupInterests?.length || 0}
                      </Badge>
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4" /> My Watchlist
                      <Badge variant="secondary" className="ml-2 bg-accent/10 text-accent border-none">
                        {investorInterests?.length || 0}
                      </Badge>
                    </>
                  )}
                </TabsTrigger>
                {isStartup && (
                  <TabsTrigger value="requests" className="px-6 py-2 gap-2">
                    <Inbox className="w-4 h-4" /> Contact Requests
                    {pendingRequestsCount > 0 && (
                      <Badge variant="destructive" className="ml-2 border-none">
                        {pendingRequestsCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                )}
                {!isStartup && (
                  <TabsTrigger value="favorites" className="px-6 py-2 gap-2">
                    <Bookmark className="w-4 h-4" /> Saved Pitches
                    <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-600 border-none">
                      {investorFavorites?.length || 0}
                    </Badge>
                  </TabsTrigger>
                )}
              </>
            )}
          </TabsList>

          <TabsContent value="primary">
            <div className="grid gap-6">
              {loadingAllPitches || loadingStartupPitches ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
              ) : (isAdmin || isStartup || isInvestor) ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(isAdmin ? allPitches : (isStartup ? startupPitches : allPitches))?.map((pitch) => (
                    <Link key={pitch.id} href={`/pitches/${pitch.id}`}>
                      <Card className="group h-full hover:shadow-lg transition-all border-none shadow-sm overflow-hidden bg-white">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start mb-2">
                            <Badge variant="secondary" className="bg-primary/5 text-primary border-none">{pitch.industry}</Badge>
                            {isAdmin && <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground">Admin View</Badge>}
                          </div>
                          <CardTitle className="text-xl font-bold line-clamp-1 group-hover:text-primary transition-colors">
                            {pitch.startupName}
                          </CardTitle>
                          <CardDescription className="line-clamp-2 italic">
                            {pitch.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <DollarSign className="w-4 h-4" /> Goal
                            </span>
                            <span className="font-bold text-primary">${pitch.fundingNeeded}</span>
                          </div>
                        </CardContent>
                        <CardFooter className="pt-4 border-t bg-muted/10 flex justify-between items-center">
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {pitch.createdAt?.toDate ? pitch.createdAt.toDate().toLocaleDateString() : 'Just now'}
                          </div>
                          <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                        </CardFooter>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed border-2 py-16 text-center bg-white">
                  <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-bold">No pitches available</h3>
                </Card>
              )}
            </div>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="users">
              <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader>
                  <CardTitle>Global User Directory</CardTitle>
                  <CardDescription>Oversight of all registered users across the platform.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingAllUsers ? (
                    <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead>Name / Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Organization</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allUsers?.map((u) => (
                          <TableRow key={u.id} className="hover:bg-muted/20">
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-bold">{u.name || 'Anonymous'}</span>
                                <span className="text-xs text-muted-foreground">{u.email}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{u.role}</Badge>
                            </TableCell>
                            <TableCell>{u.company || 'N/A'}</TableCell>
                            <TableCell>
                              {u.lastActive ? (
                                <span className="text-[10px] text-muted-foreground italic">
                                  Active {u.lastActive.toDate().toLocaleDateString()}
                                </span>
                              ) : 'Inactive'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Link href={`/profile/${u.id}`}>
                                <Button variant="ghost" size="sm">View Profile</Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="secondary">
             <div className="grid gap-6">
                {isStartup ? (
                  loadingStartupInterests ? (
                    <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
                  ) : (startupInterests && startupInterests.length > 0) ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {startupInterests.map((interest) => (
                        <Card key={interest.id} className="border-none shadow-sm bg-white overflow-hidden">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-center mb-1">
                               <p className="text-[10px] font-bold text-accent uppercase tracking-wider">New Connection</p>
                               <Badge variant="outline" className="text-[9px] h-4">
                                  {interest.timestamp?.toDate ? interest.timestamp.toDate().toLocaleDateString() : 'Just now'}
                               </Badge>
                            </div>
                            <CardTitle className="text-lg font-bold truncate">
                              <Link href={`/profile/${interest.investorId}`} className="hover:text-primary transition-colors">
                                {interest.investorEmail}
                              </Link>
                            </CardTitle>
                            <CardDescription className="text-xs">
                               Interested in: <span className="font-semibold text-foreground">{interest.startupName}</span>
                            </CardDescription>
                          </CardHeader>
                          <CardFooter className="pt-4 flex flex-col gap-2">
                            <Link href={`/profile/${interest.investorId}`} className="w-full">
                              <Button variant="outline" size="sm" className="w-full gap-2 border-primary/20 text-primary hover:bg-primary/5">
                                <User className="w-3 h-3" /> View Investor Profile
                              </Button>
                            </Link>
                            <Button variant="outline" size="sm" className="w-full gap-2 border-accent/20 text-accent hover:bg-accent/5" asChild>
                              <Link href={`mailto:${interest.investorEmail}`}>
                                <Mail className="w-3 h-3" /> Send Introduction
                              </Link>
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed">
                       <Users className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-50" />
                       <h3 className="font-bold">No leads yet</h3>
                    </div>
                  )
                ) : (
                  loadingInvestorInterests ? (
                    <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
                  ) : (investorInterests && investorInterests.length > 0) ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {investorInterests.map((interest) => (
                        <Card key={interest.id} className="border-none shadow-sm bg-white group hover:shadow-md transition-all">
                          <CardHeader>
                            <div className="flex justify-between items-start mb-2">
                              <Badge className="bg-emerald-50 text-emerald-600 border-none hover:bg-emerald-100 px-3">
                                {interest.industry}
                              </Badge>
                              <div className="p-1.5 bg-emerald-50 rounded-full">
                                <Star className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                              </div>
                            </div>
                            <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                              {interest.startupName}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              Expressed interest on {interest.timestamp?.toDate ? interest.timestamp.toDate().toLocaleDateString() : 'recently'}
                            </CardDescription>
                          </CardHeader>
                          <CardFooter className="pt-0">
                            <Link href={`/pitches/${interest.pitchId}`} className="w-full">
                              <Button variant="ghost" className="w-full text-xs justify-between group-hover:bg-primary/5">
                                View Details <ArrowRight className="w-3 h-3" />
                              </Button>
                            </Link>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed">
                       <Star className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-50" />
                       <h3 className="font-bold">Your watchlist is empty</h3>
                    </div>
                  )
                )}
             </div>
          </TabsContent>

          {/* Contact Requests Tab for Startups */}
          <TabsContent value="requests">
             <div className="grid gap-6">
                {loadingStartupContactRequests ? (
                  <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
                ) : (startupContactRequests && startupContactRequests.length > 0) ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {startupContactRequests.map((req) => (
                      <Card key={req.id} className="border-none shadow-sm bg-white overflow-hidden">
                        <CardHeader className="pb-2">
                           <div className="flex justify-between items-center mb-1">
                               <Badge variant={req.status === 'pending' ? 'secondary' : req.status === 'accepted' ? 'default' : 'destructive'} className="capitalize">
                                  {req.status}
                               </Badge>
                           </div>
                           <CardTitle className="text-lg font-bold truncate">
                             <Link href={`/profile/${req.senderId}`} className="hover:text-primary transition-colors">
                               {req.investorEmail}
                             </Link>
                           </CardTitle>
                           <CardDescription className="text-xs italic">
                              Requested contact for: <span className="font-bold">{req.startupName}</span>
                           </CardDescription>
                        </CardHeader>
                        <CardFooter className="pt-4 flex flex-col gap-2">
                           {req.status === 'pending' ? (
                             <div className="flex gap-2 w-full">
                               <Button 
                                 size="sm" 
                                 variant="outline" 
                                 className="flex-1 border-green-200 text-green-600 hover:bg-green-50"
                                 onClick={() => handleUpdateRequestStatus(req.id, 'accepted')}
                               >
                                 <CheckCircle2 className="w-4 h-4 mr-2" /> Accept
                               </Button>
                             </div>
                           ) : (
                             <Button variant="ghost" size="sm" className="w-full text-muted-foreground" disabled>
                               Introduction {req.status}
                             </Button>
                           )}
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed">
                     <Inbox className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-50" />
                     <h3 className="font-bold">Inbox clear</h3>
                  </div>
                )}
             </div>
          </TabsContent>

          {/* Favorites Tab for Investors */}
          <TabsContent value="favorites">
             <div className="grid gap-6">
                {loadingInvestorFavorites ? (
                  <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
                ) : (investorFavorites && investorFavorites.length > 0) ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {investorFavorites.map((fav) => (
                      <Card key={fav.id} className="border-none shadow-sm bg-white group hover:shadow-md transition-all">
                        <CardHeader>
                          <div className="flex justify-between items-start mb-2">
                            <Badge className="bg-amber-50 text-amber-600 border-none px-3">
                              {fav.industry}
                            </Badge>
                            <Bookmark className="w-4 h-4 text-amber-500 fill-amber-500" />
                          </div>
                          <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                            {fav.startupName}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Saved on {fav.timestamp?.toDate ? fav.timestamp.toDate().toLocaleDateString() : 'recently'}
                          </CardDescription>
                        </CardHeader>
                        <CardFooter className="pt-0">
                          <Link href={`/pitches/${fav.pitchId}`} className="w-full">
                            <Button variant="ghost" className="w-full text-xs justify-between group-hover:bg-primary/5">
                              View in Marketplace <ArrowRight className="w-3 h-3" />
                            </Button>
                          </Link>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed">
                     <Bookmark className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-50" />
                     <h3 className="font-bold">No saved pitches</h3>
                  </div>
                )}
             </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
