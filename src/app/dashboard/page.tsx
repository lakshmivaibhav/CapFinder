
"use client";

import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, limit, doc, getDocs, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Loader2, Plus, Megaphone, ArrowRight, Users, Star, Search, LayoutGrid, Inbox, Sparkles, Zap, ShieldAlert, BarChart3, Eye, Bookmark, MessageSquare, Clock, TrendingUp, Target, Activity, CheckCircle2, Circle, Trophy, Flame } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from '@/lib/utils';

const investorChartConfig: ChartConfig = {
  requests: {
    label: "Requests",
    color: "hsl(var(--primary))",
  },
  interests: {
    label: "Interests",
    color: "hsl(var(--accent))",
  },
};

export default function DashboardPage() {
  const { user, profile, loading: authLoading, emailVerified } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [resolving, setResolving] = useState<string | null>(null);
  const [dismissOnboarding, setDismissOnboarding] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (!emailVerified) {
        router.push('/verify-email');
      } else if (!profile) {
        router.push('/onboarding');
      }
    }
  }, [user, profile, authLoading, emailVerified, router]);

  const isStartup = profile?.role === 'startup';
  const isInvestor = profile?.role === 'investor';
  const isAdmin = profile?.role === 'admin';

  // --- STARTUP QUERIES ---
  const startupPitchesQuery = useMemoFirebase(() => {
    if (!user || !profile || !isStartup || profile.disabled === true) return null;
    return query(collection(db, 'pitches'), where('ownerId', '==', user.uid), limit(20));
  }, [db, user, profile, isStartup]);

  const startupInterestsQuery = useMemoFirebase(() => {
    if (!user || !profile || !isStartup || profile.disabled === true) return null;
    return query(collection(db, 'interests'), where('startupOwnerId', '==', user.uid), limit(50));
  }, [db, user, profile, isStartup]);

  const startupContactRequestsQuery = useMemoFirebase(() => {
    if (!user || !profile || !isStartup || profile.disabled === true) return null;
    return query(collection(db, 'contactRequests'), where('receiverId', '==', user.uid), limit(50));
  }, [db, user, profile, isStartup]);

  // --- INVESTOR QUERIES ---
  const investorInterestsQuery = useMemoFirebase(() => {
    if (!user || !profile || !isInvestor || profile.disabled === true) return null;
    return query(collection(db, 'interests'), where('investorId', '==', user.uid), limit(50));
  }, [db, user, profile, isInvestor]);

  const investorContactRequestsQuery = useMemoFirebase(() => {
    if (!user || !profile || !isInvestor || profile.disabled === true) return null;
    return query(collection(db, 'contactRequests'), where('senderId', '==', user.uid), limit(50));
  }, [db, user, profile, isInvestor]);

  const investorViewsQuery = useMemoFirebase(() => {
    if (!user || !profile || !isInvestor || profile.disabled === true) return null;
    return query(collection(db, 'pitchViews'), where('investorId', '==', user.uid), orderBy('timestamp', 'desc'), limit(50));
  }, [db, user, profile, isInvestor]);

  const investorFavoritesQuery = useMemoFirebase(() => {
    if (!user || !profile || !isInvestor || profile.disabled === true) return null;
    return query(collection(db, 'favorites'), where('investorId', '==', user.uid), limit(50));
  }, [db, user, profile, isInvestor]);

  const recentMessagesQuery = useMemoFirebase(() => {
    if (!user || !profile || profile.disabled === true) return null;
    return query(
      collection(db, 'messages'), 
      where('receiverId', '==', user.uid), 
      orderBy('timestamp', 'desc'), 
      limit(5)
    );
  }, [db, user, profile]);

  const trendingPitchesQuery = useMemoFirebase(() => {
    if (!user || !profile || (!isInvestor && !isAdmin) || profile.disabled === true) return null;
    return query(collection(db, 'pitches'), orderBy('views', 'desc'), limit(6));
  }, [db, user, profile, isInvestor, isAdmin]);

  const allPitchesQuery = useMemoFirebase(() => {
    if (!user || !profile || (!isInvestor && !isAdmin) || profile.disabled === true) return null;
    return query(collection(db, 'pitches'), limit(50));
  }, [db, user, profile, isInvestor, isAdmin]);

  const { data: startupPitches, isLoading: loadingStartupPitches } = useCollection(startupPitchesQuery);
  const { data: startupInterests } = useCollection(startupInterestsQuery);
  const { data: startupContactRequests } = useCollection(startupContactRequestsQuery);
  
  const { data: investorInterests } = useCollection(investorInterestsQuery);
  const { data: investorContactRequests } = useCollection(investorContactRequestsQuery);
  const { data: investorViews } = useCollection(investorViewsQuery);
  const { data: investorFavorites } = useCollection(investorFavoritesQuery);
  const { data: recentMessages } = useCollection(recentMessagesQuery);
  
  const { data: trendingPitches, isLoading: loadingTrending } = useCollection(trendingPitchesQuery);
  const { data: allPitches, isLoading: loadingAllPitches } = useCollection(allPitchesQuery);

  const handleResolveConnection = async (pitchId: string, startupOwnerId: string, startupName: string) => {
    if (!user || !isInvestor) return;
    if (!confirm(`Disconnect from ${startupName}? This will remove your interest and any chat history.`)) return;

    setResolving(pitchId);
    try {
      const reqSnap = await getDocs(query(
        collection(db, 'contactRequests'), 
        where('pitchId', '==', pitchId),
        where('senderId', '==', user.uid)
      ));
      reqSnap.docs.forEach(d => deleteDocumentNonBlocking(doc(db, 'contactRequests', d.id)));

      const intSnap = await getDocs(query(
        collection(db, 'interests'), 
        where('pitchId', '==', pitchId),
        where('investorId', '==', user.uid)
      ));
      intSnap.docs.forEach(d => deleteDocumentNonBlocking(doc(db, 'interests', d.id)));

      toast({ title: "Disconnected", description: "Connection has been removed." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Action failed", description: e.message });
    } finally {
      setResolving(null);
    }
  };

  const recommendedPitches = useMemo(() => {
    if (!isInvestor || !allPitches || !profile?.investmentInterest) return [];
    const rawInterests = profile.investmentInterest.toLowerCase().split(',');
    const interests = rawInterests.map(i => i.trim()).filter(Boolean);
    if (interests.length === 0) return [];

    return allPitches
      .map(pitch => {
        let score = 0;
        const pCategory = (pitch.category || pitch.industry || 'Other').toLowerCase();
        const description = (pitch.description || '').toLowerCase();
        interests.forEach(interest => {
          if (pCategory.includes(interest)) score += 10;
          if (description.includes(interest)) score += 2;
        });
        return { ...pitch, score };
      })
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [isInvestor, allPitches, profile]);

  // --- ONBOARDING LOGIC ---
  const onboardingSteps = useMemo(() => {
    if (!profile) return [];
    if (isStartup) {
      return [
        { id: 'profile', label: 'Finalize Member Identity', completed: !!profile.name && !!profile.bio, href: '/profile' },
        { id: 'pitch', label: 'Construct Venture Narrative', completed: (startupPitches?.length || 0) > 0, href: '/pitches/new' },
        { id: 'discovery', label: 'Analyze Market Discovery', completed: startupPitches?.some(p => p.views > 0), href: isStartup ? '/dashboard' : '#' }
      ];
    }
    if (isInvestor) {
      return [
        { id: 'profile', label: 'Establish Strategic Thesis', completed: !!profile.investmentInterest, href: '/profile' },
        { id: 'explore', label: 'Scan Global Innovation', completed: (investorViews?.length || 0) > 0, href: '/pitches' },
        { id: 'connect', label: 'Initiate Capital Deployment', completed: (investorContactRequests?.length || 0) > 0, href: '/pitches' }
      ];
    }
    return [];
  }, [profile, isStartup, isInvestor, startupPitches, investorViews, investorContactRequests]);

  const onboardingProgress = useMemo(() => {
    if (onboardingSteps.length === 0) return 0;
    const completed = onboardingSteps.filter(s => s.completed).length;
    return Math.round((completed / onboardingSteps.length) * 100);
  }, [onboardingSteps]);

  const showOnboarding = !dismissOnboarding && onboardingProgress < 100 && (isStartup || isInvestor);

  // --- INVESTOR INSIGHTS CALCULATIONS ---
  const investorEngagementScore = useMemo(() => {
    if (!isInvestor) return 0;
    let score = 0;
    score += (investorViews?.length || 0) * 1;
    score += (investorInterests?.length || 0) * 10;
    score += (investorContactRequests?.length || 0) * 5;
    score += (investorContactRequests?.filter(r => r.status === 'accepted').length || 0) * 10;
    score += (recentMessages?.length || 0) * 2;
    return score;
  }, [isInvestor, investorViews, investorInterests, investorContactRequests, recentMessages]);

  const investorResponseRate = useMemo(() => {
    if (!isInvestor || !investorContactRequests || investorContactRequests.length === 0) return 0;
    const total = investorContactRequests.length;
    const responded = investorContactRequests.filter(r => r.status !== 'pending').length;
    return Math.round((responded / total) * 100);
  }, [isInvestor, investorContactRequests]);

  const investorActivityTrend = useMemo(() => {
    if (!isInvestor) return [];
    const end = startOfDay(new Date());
    const start = subDays(end, 6);
    const dateRange = eachDayOfInterval({ start, end });

    return dateRange.map(date => {
      const dateStr = format(date, 'MMM dd');
      const dayStart = startOfDay(date);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

      const dayRequests = investorContactRequests?.filter(r => {
        const ts = r.timestamp?.toDate ? r.timestamp.toDate() : null;
        return ts && ts >= dayStart && ts <= dayEnd;
      }).length || 0;

      const dayInterests = investorInterests?.filter(i => {
        const ts = i.timestamp?.toDate ? i.timestamp.toDate() : null;
        return ts && ts >= dayStart && ts <= dayEnd;
      }).length || 0;

      return {
        date: dateStr,
        requests: dayRequests,
        interests: dayInterests
      };
    });
  }, [isInvestor, investorContactRequests, investorInterests]);

  if (authLoading || (user && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin w-12 h-12 text-primary opacity-20" />
      </div>
    );
  }

  if (!user || !profile || !emailVerified) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full">
        {/* --- WELCOME HEADER --- */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Overview</p>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-none">Welcome, {profile.name || user.email?.split('@')[0]}</h1>
            <div className="text-muted-foreground flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs md:text-sm font-medium">
              Signed in as <span className="text-foreground capitalize font-black underline decoration-primary decoration-4 underline-offset-8">{profile.role}</span>
              {isAdmin && <Badge className="bg-destructive text-white border-none ml-2 rounded-lg font-black uppercase text-[8px] px-3">Admin</Badge>}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            {isAdmin && (
              <Link href="/admin" className="w-full sm:w-auto">
                <Button className="w-full gap-3 h-14 px-8 rounded-xl bg-destructive shadow-xl shadow-destructive/20 hover:shadow-destructive/30 transition-all font-black uppercase tracking-widest text-[10px]">
                  <ShieldAlert className="w-5 h-5" /> Admin Panel
                </Button>
              </Link>
            )}
            {isStartup && (
              <Link href="/pitches/new" className="w-full sm:w-auto">
                <Button className="w-full gap-3 h-14 px-8 rounded-xl bg-primary shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all font-black uppercase tracking-widest text-[10px]">
                  <Plus className="w-5 h-5" /> Create New Pitch
                </Button>
              </Link>
            )}
            {(isInvestor || isAdmin) && (
              <Link href="/pitches" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full gap-3 h-14 px-8 rounded-xl border-2 hover:bg-primary/5 transition-all font-black uppercase tracking-widest text-[10px]">
                  <Search className="w-5 h-5" /> Browse Pitches
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* --- ONBOARDING GUIDE --- */}
        {showOnboarding && (
          <Card className="mb-12 border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden relative group">
             <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
             <CardHeader className="p-8 md:p-12 pb-4">
               <div className="flex justify-between items-start mb-6">
                 <div className="space-y-1">
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-primary/10 rounded-lg"><Zap className="w-4 h-4 text-primary" /></div>
                     <CardTitle className="text-2xl font-black tracking-tight">Member Onboarding Protocol</CardTitle>
                   </div>
                   <CardDescription className="text-sm font-medium">Complete your strategic setup to unlock full platform capabilities.</CardDescription>
                 </div>
                 <Button variant="ghost" size="sm" className="h-8 rounded-lg text-[9px] font-black uppercase tracking-widest text-muted-foreground" onClick={() => setDismissOnboarding(true)}>Dismiss</Button>
               </div>
               <div className="w-full bg-muted/30 h-2.5 rounded-full overflow-hidden mb-2">
                 <div 
                   className="h-full bg-primary transition-all duration-1000 ease-out" 
                   style={{ width: `${onboardingProgress}%` }}
                 />
               </div>
               <p className="text-[10px] font-black uppercase tracking-widest text-primary">{onboardingProgress}% Processed</p>
             </CardHeader>
             <CardContent className="p-8 md:p-12 pt-4">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {onboardingSteps.map((step, idx) => (
                   <Link key={step.id} href={step.href}>
                     <div className={cn(
                       "p-6 rounded-2xl border-2 transition-all group/step cursor-pointer flex flex-col h-full",
                       step.completed 
                        ? "bg-emerald-50 border-emerald-100" 
                        : "bg-white border-muted hover:border-primary/30 shadow-sm"
                     )}>
                       <div className="flex justify-between items-start mb-4">
                         <div className={cn(
                           "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                           step.completed ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground group-hover/step:bg-primary group-hover/step:text-white transition-colors"
                         )}>
                           {step.completed ? <CheckCircle2 className="w-5 h-5" /> : <span className="font-black text-xs">{idx + 1}</span>}
                         </div>
                         {step.completed && <Badge className="bg-emerald-500 text-white text-[8px] uppercase px-2 py-0">Completed</Badge>}
                       </div>
                       <p className={cn(
                         "font-black text-sm tracking-tight leading-tight mb-2",
                         step.completed ? "text-emerald-700" : "text-foreground group-hover/step:text-primary transition-colors"
                       )}>
                         {step.label}
                       </p>
                       {!step.completed && (
                         <div className="mt-auto flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-primary opacity-0 group-hover/step:opacity-100 transition-opacity">
                           Initialize <ArrowRight className="w-3 h-3" />
                         </div>
                       )}
                     </div>
                   </Link>
                 ))}
               </div>
             </CardContent>
          </Card>
        )}

        {/* --- METRIC GRID --- */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 mb-12">
          {isInvestor ? (
            <>
              <Card className="border-none shadow-xl bg-white rounded-[1.5rem] overflow-hidden group">
                <CardHeader className="p-6 pb-2">
                  <Eye className="w-4 h-4 text-blue-600 mb-2" />
                  <CardDescription className="text-[9px] font-black uppercase tracking-widest">Discovery</CardDescription>
                  <CardTitle className="text-2xl font-black">{investorViews?.length || 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-none shadow-xl bg-white rounded-[1.5rem] overflow-hidden group">
                <CardHeader className="p-6 pb-2">
                  <Bookmark className="w-4 h-4 text-indigo-600 mb-2" />
                  <CardDescription className="text-[9px] font-black uppercase tracking-widest">Watchlist</CardDescription>
                  <CardTitle className="text-2xl font-black">{investorFavorites?.length || 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-none shadow-xl bg-white rounded-[1.5rem] overflow-hidden group">
                <CardHeader className="p-6 pb-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600 mb-2" />
                  <CardDescription className="text-[9px] font-black uppercase tracking-widest">Active Hubs</CardDescription>
                  <CardTitle className="text-2xl font-black">{investorContactRequests?.filter(r => r.status === 'accepted').length || 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-none shadow-xl bg-white rounded-[1.5rem] overflow-hidden group">
                <CardHeader className="p-6 pb-2">
                  <TrendingUp className="w-4 h-4 text-amber-600 mb-2" />
                  <CardDescription className="text-[9px] font-black uppercase tracking-widest">Requests</CardDescription>
                  <CardTitle className="text-2xl font-black">{investorContactRequests?.length || 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-none shadow-xl bg-white rounded-[1.5rem] overflow-hidden group">
                <CardHeader className="p-6 pb-2">
                  <Sparkles className="w-4 h-4 text-primary mb-2" />
                  <CardDescription className="text-[9px] font-black uppercase tracking-widest">Interests</CardDescription>
                  <CardTitle className="text-2xl font-black">{investorInterests?.length || 0}</CardTitle>
                </CardHeader>
              </Card>
            </>
          ) : (
            <>
              <Card className="border-none shadow-xl bg-primary/5 rounded-[1.5rem] overflow-hidden col-span-1 md:col-span-1">
                <CardHeader className="p-6 pb-2">
                  <Megaphone className="w-5 h-5 text-primary mb-2" />
                  <CardDescription className="text-[9px] font-black uppercase tracking-widest">My Pitches</CardDescription>
                  <CardTitle className="text-2xl font-black">{startupPitches?.length || 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-none shadow-xl bg-accent/5 rounded-[1.5rem] overflow-hidden col-span-1 md:col-span-1">
                <CardHeader className="p-6 pb-2">
                  <Users className="w-5 h-5 text-accent mb-2" />
                  <CardDescription className="text-[9px] font-black uppercase tracking-widest">Interest Shown</CardDescription>
                  <CardTitle className="text-2xl font-black">{startupInterests?.length || 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-none shadow-xl bg-emerald-50 rounded-[1.5rem] overflow-hidden col-span-1 md:col-span-1">
                <CardHeader className="p-6 pb-2">
                  <Inbox className="w-5 h-5 text-emerald-500 mb-2" />
                  <CardDescription className="text-[9px] font-black uppercase tracking-widest">Active Chats</CardDescription>
                  <CardTitle className="text-2xl font-black">{startupContactRequests?.filter(r => r.status === 'accepted').length || 0}</CardTitle>
                </CardHeader>
              </Card>
            </>
          )}
        </div>

        {/* --- TRENDING / TOP STARTUPS SECTION --- */}
        {isInvestor && trendingPitches && trendingPitches.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-50 rounded-2xl">
                  <Trophy className="w-6 h-6 text-amber-600" />
                </div>
                <div className="space-y-0.5">
                  <h2 className="text-3xl font-black tracking-tight">Market Velocity</h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Most discovered ventures on the platform</p>
                </div>
              </div>
              <Badge className="bg-amber-500 text-white font-black uppercase text-[10px] tracking-widest px-4 py-1.5 rounded-xl shadow-lg shadow-amber-500/20">Trending Now</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingPitches.map((pitch) => (
                <Link key={pitch.id} href={`/startup/${pitch.id}`}>
                  <Card className="group hover:border-amber-500/20 border-2 border-transparent transition-all h-full shadow-xl hover:shadow-2xl rounded-[2rem] flex flex-col bg-white overflow-hidden">
                    <CardHeader className="p-6 pb-2">
                      <div className="flex justify-between items-start mb-4">
                        <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-100 font-black text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-md">
                          {pitch.category || 'Venture'}
                        </Badge>
                        <div className="flex items-center gap-1.5 text-orange-500">
                          <Flame className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black">{pitch.views || 0}</span>
                        </div>
                      </div>
                      <CardTitle className="text-xl font-black group-hover:text-primary transition-colors line-clamp-1 leading-none">{pitch.startupName}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-2 flex-1">
                      <p className="text-sm text-muted-foreground line-clamp-2 italic leading-relaxed">&quot;{pitch.description}&quot;</p>
                    </CardContent>
                    <CardFooter className="p-6 pt-0 flex justify-between items-center bg-muted/5 border-t border-muted/50 mt-4">
                       <div className="space-y-0.5">
                         <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Goal</p>
                         <p className="text-md font-black text-foreground">${pitch.fundingNeeded?.toLocaleString()}</p>
                       </div>
                       <div className="p-2 bg-white rounded-lg shadow-sm group-hover:bg-primary group-hover:text-white transition-all">
                         <ArrowRight className="w-4 h-4" />
                       </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
          {/* --- MAIN CONTENT AREA --- */}
          <div className="lg:col-span-8 space-y-12">
            {isInvestor && recommendedPitches.length > 0 && (
              <section>
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-accent/10 rounded-2xl">
                    <Sparkles className="w-6 h-6 text-accent" />
                  </div>
                  <div className="space-y-0.5">
                    <h2 className="text-3xl font-black tracking-tight">Recommended for You</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Based on your strategic focus</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {recommendedPitches.map((pitch) => (
                    <Link key={pitch.id} href={`/startup/${pitch.id}`}>
                      <Card className="group hover:border-accent/30 border-2 border-transparent transition-all h-full shadow-xl hover:shadow-2xl rounded-[2rem] flex flex-col bg-white overflow-hidden">
                        <CardHeader className="p-8 pb-4">
                          <Badge className="w-fit bg-accent/10 text-accent border-none font-black text-[9px] uppercase tracking-[0.2em] mb-4 px-4 py-1.5 rounded-lg">
                            {pitch.category || pitch.industry || 'Other'}
                          </Badge>
                          <CardTitle className="text-2xl font-black group-hover:text-accent transition-colors line-clamp-1 leading-none">{pitch.startupName}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 p-8 pt-0">
                          <p className="text-md text-muted-foreground line-clamp-3 leading-relaxed italic border-l-2 border-accent/10 pl-4">&quot;{pitch.description}&quot;</p>
                        </CardContent>
                        <CardFooter className="p-8 pt-0 flex justify-between items-center border-t border-muted/50 mt-4 bg-muted/5">
                           <div className="space-y-1">
                             <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Goal</p>
                             <span className="text-xl font-black text-accent">${pitch.fundingNeeded?.toLocaleString()}</span>
                           </div>
                           <div className="w-12 h-12 rounded-xl bg-white shadow-md flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all duration-500 group-hover:translate-x-2">
                            <ArrowRight className="w-6 h-6" />
                           </div>
                        </CardFooter>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <Tabs defaultValue="primary" className="space-y-8">
              <TabsList className="bg-muted/50 p-1.5 rounded-2xl h-14 w-full sm:w-fit shadow-inner">
                <TabsTrigger value="primary" className="flex-1 sm:flex-none gap-3 px-8 h-11 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all">
                  {isStartup ? <><Megaphone className="w-4 h-4" /> My Pitches</> : <><LayoutGrid className="w-4 h-4" /> Explore Feed</>}
                </TabsTrigger>
                <TabsTrigger value="secondary" className="flex-1 sm:flex-none gap-3 px-8 h-11 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all">
                  {isStartup ? <><Users className="w-4 h-4" /> My Partners</> : <><Star className="w-4 h-4" /> Saved Pitches</>}
                </TabsTrigger>
                {isInvestor && (
                  <TabsTrigger value="insights" className="flex-1 sm:flex-none gap-3 px-8 h-11 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all">
                    <Activity className="w-4 h-4" /> Market Insights
                  </TabsTrigger>
                )}
                {isStartup && (
                  <TabsTrigger value="analytics" className="flex-1 sm:flex-none gap-3 px-8 h-11 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all">
                    <BarChart3 className="w-4 h-4" /> Global Intelligence
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="primary" className="outline-none">
                {(isStartup ? loadingStartupPitches : loadingAllPitches) ? (
                  <div className="flex justify-center p-32"><Loader2 className="animate-spin w-16 h-16 text-primary opacity-20" /></div>
                ) : (isStartup ? startupPitches : allPitches)?.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    {(isStartup ? startupPitches : allPitches)?.map((pitch) => {
                      const hasActiveConnection = isInvestor && (
                        investorInterests?.some(i => i.pitchId === pitch.id) || 
                        investorContactRequests?.some(r => r.pitchId === pitch.id && r.status === 'accepted')
                      );
                      
                      return (
                        <Card key={pitch.id} className="relative group overflow-hidden border-none shadow-xl transition-all duration-500 rounded-[2rem] flex flex-col bg-white">
                          <CardHeader className="p-8 pb-4">
                            <div className="flex justify-between items-start mb-4">
                              <Badge variant="outline" className="border-primary/20 text-primary font-black uppercase text-[9px] tracking-[0.2em] px-4 py-1.5 rounded-lg bg-primary/5">{pitch.category || pitch.industry || 'Other'}</Badge>
                              <div className="flex gap-2">
                                {isStartup && (
                                  <Link href={`/pitches/${pitch.id}/analytics`}>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-primary rounded-full border bg-white shadow-sm">
                                      <BarChart3 className="w-4 h-4" />
                                    </Button>
                                  </Link>
                                )}
                                {hasActiveConnection && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-10 px-4 text-[9px] font-black uppercase tracking-widest text-amber-600 hover:bg-amber-50 rounded-full z-10 border-2 border-amber-100 shadow-sm"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleResolveConnection(pitch.id, pitch.ownerId, pitch.startupName);
                                    }}
                                    disabled={!!resolving && resolving === pitch.id}
                                  >
                                    {resolving === pitch.id ? <Loader2 className="animate-spin w-3 h-3" /> : <Zap className="w-3 h-3 mr-2" />}
                                    Disconnect
                                  </Button>
                                )}
                              </div>
                            </div>
                            <CardTitle className="text-2xl font-black group-hover:text-primary transition-colors leading-none tracking-tight">{pitch.startupName}</CardTitle>
                          </CardHeader>
                          <CardContent className="flex-1 p-8 pt-0">
                            <p className="text-md text-muted-foreground line-clamp-3 leading-relaxed mb-8 border-l-2 border-primary/10 pl-4">{pitch.description}</p>
                            <div className="flex justify-between items-center pt-6 border-t border-muted/50">
                              <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Goal</p>
                                <span className="font-black text-primary text-2xl tracking-tighter">${pitch.fundingNeeded?.toLocaleString()}</span>
                              </div>
                              <Link href={`/startup/${pitch.id}`}>
                                <Button variant="ghost" size="sm" className="gap-2 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary/5 hover:text-primary transition-all">Details <ArrowRight className="w-4 h-4" /></Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-32 bg-muted/10 rounded-[2rem] border-4 border-dashed flex flex-col items-center p-6">
                    <Search className="w-20 h-20 text-muted-foreground opacity-10 mb-6" />
                    <h3 className="text-3xl font-black tracking-tight text-muted-foreground">No ventures cataloged.</h3>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="secondary" className="outline-none">
                {(isStartup ? startupInterests : investorInterests)?.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    {(isStartup ? startupInterests : investorInterests)?.map((interest) => (
                      <Card key={interest.id} className="border-none shadow-xl transition-all duration-500 rounded-[2rem] bg-white group">
                        <CardHeader className="p-8 pb-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">{isStartup ? 'Interested Lead' : 'Saved Watchlist'}</p>
                          <CardTitle className="text-2xl font-black truncate leading-none tracking-tight group-hover:text-primary transition-colors">
                            {isStartup ? interest.investorEmail : interest.startupName}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-0">
                          <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-lg">{interest.industry}</Badge>
                        </CardContent>
                        <CardFooter className="p-8 pt-4 border-t border-muted/50 bg-muted/5">
                          <Link href={isStartup ? `/investor/${interest.investorId}` : `/startup/${interest.pitchId}`} className="w-full">
                            <Button variant="outline" className="w-full h-14 rounded-xl font-black uppercase text-[10px] tracking-widest border-2 hover:bg-primary/5 shadow-sm transition-all">View Full Credentials</Button>
                          </Link>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-32 bg-muted/10 rounded-[2rem] border-4 border-dashed flex flex-col items-center p-6">
                    <Star className="w-20 h-20 text-muted-foreground opacity-10 mb-6" />
                    <h3 className="text-3xl font-black tracking-tight text-muted-foreground">Your watchlist is empty.</h3>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="insights" className="outline-none">
                <div className="space-y-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="border-none shadow-xl bg-white rounded-2xl overflow-hidden p-8 text-center space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Startups Contacted</p>
                      <p className="text-4xl font-black text-primary">{investorContactRequests?.length || 0}</p>
                    </Card>
                    <Card className="border-none shadow-xl bg-white rounded-2xl overflow-hidden p-8 text-center space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Response Rate</p>
                      <p className="text-4xl font-black text-emerald-500">{investorResponseRate}%</p>
                    </Card>
                    <Card className="border-none shadow-xl bg-white rounded-2xl overflow-hidden p-8 text-center space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Hubs</p>
                      <p className="text-4xl font-black text-accent">{investorContactRequests?.filter(r => r.status === 'accepted').length || 0}</p>
                    </Card>
                    <Card className="border-none shadow-xl bg-white rounded-2xl overflow-hidden p-8 text-center space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Engagement Score</p>
                      <p className="text-4xl font-black text-orange-500">{investorEngagementScore}</p>
                    </Card>
                  </div>

                  <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="p-10 border-b bg-muted/20">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-xl">
                          <Activity className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-black tracking-tight">Market Participation Trend</CardTitle>
                          <CardDescription className="text-sm font-medium">Activity volume over the last 7 days.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-10 h-[400px]">
                      <ChartContainer config={investorChartConfig}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={investorActivityTrend}>
                            <defs>
                              <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15}/>
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorInterests" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.15}/>
                                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                            <XAxis dataKey="date" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                            <ChartTooltip content={<ChartTooltipContent className="rounded-2xl border-none shadow-2xl" />} />
                            <Area type="monotone" dataKey="requests" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRequests)" />
                            <Area type="monotone" dataKey="interests" stroke="hsl(var(--accent))" strokeWidth={3} fillOpacity={1} fill="url(#colorInterests)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* --- SIDEBAR / RECENT ACTIVITY --- */}
          <aside className="lg:col-span-4 space-y-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-black tracking-tight">Recent Pulse</h3>
              </div>

              {/* Discovery Activity */}
              <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
                <CardHeader className="p-6 pb-2 bg-muted/20 border-b">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5" /> Recent Discovery
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-muted/50">
                    {investorViews && investorViews.length > 0 ? (
                      investorViews.slice(0, 3).map((view) => (
                        <Link key={view.id} href={`/startup/${view.pitchId}`} className="p-6 hover:bg-muted/5 transition-colors flex items-center justify-between group">
                          <div className="space-y-1">
                            <p className="font-black text-sm group-hover:text-primary transition-colors">{view.pitchId.slice(0, 8)}...</p>
                            <p className="text-[9px] font-medium text-muted-foreground">
                              {view.timestamp?.toDate ? formatDistanceToNow(view.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                        </Link>
                      ))
                    ) : (
                      <div className="p-10 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">No recent views</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Messages Activity */}
              <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
                <CardHeader className="p-6 pb-2 bg-muted/20 border-b">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5" /> Direct Communications
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-muted/50">
                    {recentMessages && recentMessages.length > 0 ? (
                      recentMessages.map((msg) => (
                        <Link key={msg.id} href="/messages" className="p-6 hover:bg-muted/5 transition-colors flex items-center justify-between group">
                          <div className="space-y-1 overflow-hidden pr-4">
                            <p className="font-black text-sm truncate">{msg.text}</p>
                            <p className="text-[9px] font-medium text-muted-foreground">
                              {msg.timestamp?.toDate ? formatDistanceToNow(msg.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
                            </p>
                          </div>
                          {!msg.read && <div className="w-2 h-2 rounded-full bg-destructive shadow-sm" />}
                        </Link>
                      ))
                    ) : (
                      <div className="p-10 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Inquiry hub empty</div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="p-4 border-t bg-muted/5">
                  <Link href="/messages" className="w-full">
                    <Button variant="ghost" className="w-full h-10 rounded-xl font-black uppercase text-[9px] tracking-widest">Go to Messaging</Button>
                  </Link>
                </CardFooter>
              </Card>

              {/* Request Activity */}
              <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
                <CardHeader className="p-6 pb-2 bg-muted/20 border-b">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Inbox className="w-3.5 h-3.5" /> Pipeline Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-muted/50">
                    {investorContactRequests && investorContactRequests.length > 0 ? (
                      investorContactRequests.slice(0, 3).map((req) => (
                        <div key={req.id} className="p-6 space-y-2">
                          <div className="flex justify-between items-start">
                            <p className="font-black text-sm">{req.startupName}</p>
                            <Badge variant={req.status === 'accepted' ? 'default' : 'secondary'} className="text-[7px] uppercase px-1.5 rounded-sm">
                              {req.status}
                            </Badge>
                          </div>
                          <p className="text-[9px] font-medium text-muted-foreground">
                            Update: {req.timestamp?.toDate ? formatDistanceToNow(req.timestamp.toDate(), { addSuffix: true }) : 'Recently'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-10 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">No active requests</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
