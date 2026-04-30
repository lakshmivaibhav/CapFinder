
"use client";

import { use, useMemo, useState, useEffect } from 'react';
import { doc, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  ArrowLeft, 
  Eye, 
  Sparkles, 
  MessageSquare, 
  Star, 
  Target, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  LayoutGrid, 
  Zap,
  Calendar,
  Filter,
  User,
  ExternalLink,
  Flame,
  Clock,
  BarChart3,
  MousePointer2,
  ShieldCheck,
  Bookmark
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell,
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  Legend
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { format, subDays, startOfDay, eachDayOfInterval, formatDistanceToNow, isSameDay } from 'date-fns';

const chartConfig: ChartConfig = {
  interests: {
    label: "Interests",
    color: "#39C4E0", // Accent Turquoise
  },
  requests: {
    label: "Requests",
    color: "#10b981", // Emerald
  },
  messages: {
    label: "Messages",
    color: "#2959A3", // Primary Blue
  },
  views: {
    label: "Views",
    color: "#2563eb", // Blue
  },
};

type TimeRange = '7d' | '30d' | '90d';

export default function PitchAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, profile, loading: authLoading } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  const pitchRef = useMemoFirebase(() => doc(db, 'pitches', id), [db, id]);
  const { data: pitch, isLoading: loadingPitch } = useDoc(pitchRef);

  const isOwner = user?.uid === pitch?.ownerId;

  // Collection Queries
  const interestsQuery = useMemoFirebase(() => {
    if (!pitch) return null;
    return query(collection(db, 'interests'), where('pitchId', '==', id));
  }, [db, id, pitch]);
  const { data: interests } = useCollection(interestsQuery);

  const requestsQuery = useMemoFirebase(() => {
    if (!pitch) return null;
    return query(collection(db, 'contactRequests'), where('pitchId', '==', id));
  }, [db, id, pitch]);
  const { data: requests } = useCollection(requestsQuery);

  const messagesQuery = useMemoFirebase(() => {
    if (!pitch) return null;
    return query(collection(db, 'messages'), where('pitchId', '==', id), orderBy('timestamp', 'asc'));
  }, [db, id, pitch]);
  const { data: messages } = useCollection(messagesQuery);

  const viewsQuery = useMemoFirebase(() => {
    if (!pitch) return null;
    return query(collection(db, 'pitchViews'), where('pitchId', '==', id));
  }, [db, id, pitch]);
  const { data: pitchViews } = useCollection(viewsQuery);

  const favoritesQuery = useMemoFirebase(() => {
    if (!pitch) return null;
    return query(collection(db, 'favorites'), where('pitchId', '==', id));
  }, [db, id, pitch]);
  const { data: favorites } = useCollection(favoritesQuery);

  // Identity-Aware Investor Engagement Processing
  const leadIntelligence = useMemo(() => {
    if (!pitch || (!interests && !requests && !pitchViews)) return [];

    const grouped = new Map<string, any>();

    pitchViews?.forEach(v => {
      if (!grouped.has(v.investorId)) {
        grouped.set(v.investorId, { 
          id: v.investorId, 
          name: v.investorName, 
          email: v.investorEmail, 
          viewCount: 0, 
          hasInterest: false, 
          hasRequest: false, 
          requestStatus: null,
          hasFavorite: false,
          messageCount: 0,
          lastSeen: v.timestamp?.toDate ? v.timestamp.toDate() : new Date(0)
        });
      }
      const lead = grouped.get(v.investorId);
      lead.viewCount += 1;
      const ts = v.timestamp?.toDate ? v.timestamp.toDate() : new Date(0);
      if (ts > lead.lastSeen) lead.lastSeen = ts;
    });

    interests?.forEach(i => {
      if (!grouped.has(i.investorId)) {
        grouped.set(i.investorId, { id: i.investorId, name: 'Lead', email: i.investorEmail, viewCount: 0, hasInterest: true, hasRequest: false, requestStatus: null, hasFavorite: false, messageCount: 0, lastSeen: i.timestamp?.toDate ? i.timestamp.toDate() : new Date(0) });
      }
      const lead = grouped.get(i.investorId);
      lead.hasInterest = true;
      const ts = i.timestamp?.toDate ? i.timestamp.toDate() : new Date(0);
      if (ts > lead.lastSeen) lead.lastSeen = ts;
    });

    requests?.forEach(r => {
      const investorId = r.senderId;
      if (!grouped.has(investorId)) {
        grouped.set(investorId, { id: investorId, name: 'Lead', email: r.investorEmail, viewCount: 0, hasInterest: false, hasRequest: true, requestStatus: r.status, hasFavorite: false, messageCount: 0, lastSeen: r.timestamp?.toDate ? r.timestamp.toDate() : new Date(0) });
      }
      const lead = grouped.get(investorId);
      lead.hasRequest = true;
      lead.requestStatus = r.status;
      const ts = r.timestamp?.toDate ? r.timestamp.toDate() : new Date(0);
      if (ts > lead.lastSeen) lead.lastSeen = ts;
    });

    favorites?.forEach(f => {
      if (!grouped.has(f.investorId)) {
        grouped.set(f.investorId, { id: f.investorId, name: 'Lead', email: f.investorEmail || 'Lead', viewCount: 0, hasInterest: false, hasRequest: false, requestStatus: null, hasFavorite: true, messageCount: 0, lastSeen: f.timestamp?.toDate ? f.timestamp.toDate() : new Date(0) });
      }
      const lead = grouped.get(f.investorId);
      lead.hasFavorite = true;
      const ts = f.timestamp?.toDate ? f.timestamp.toDate() : new Date(0);
      if (ts > lead.lastSeen) lead.lastSeen = ts;
    });

    messages?.forEach(m => {
      const investorId = m.senderId === pitch.ownerId ? m.receiverId : m.senderId;
      if (!grouped.has(investorId)) return;
      const lead = grouped.get(investorId);
      lead.messageCount += 1;
      const ts = m.timestamp?.toDate ? m.timestamp.toDate() : new Date(0);
      if (ts > lead.lastSeen) lead.lastSeen = ts;
    });

    return Array.from(grouped.values()).map(lead => {
      let score = 0;
      score += lead.viewCount;
      if (lead.hasInterest) score += 10;
      if (lead.hasFavorite) score += 10;
      if (lead.hasRequest) {
        score += lead.requestStatus === 'accepted' ? 15 : 5;
      }
      score += (lead.messageCount * 2);

      let level: 'High' | 'Medium' | 'Low' = 'Low';
      if (score >= 20) level = 'High';
      else if (score >= 10) level = 'Medium';

      return { ...lead, score, level };
    }).sort((a, b) => b.score - a.score);
  }, [pitch, interests, requests, messages, pitchViews, favorites]);

  const hotInvestors = useMemo(() => leadIntelligence.filter(l => l.score >= 10), [leadIntelligence]);

  const trendData = useMemo(() => {
    const daysToLookBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const end = startOfDay(new Date());
    const start = subDays(end, daysToLookBack - 1);
    const dateRange = eachDayOfInterval({ start, end });

    return dateRange.map(date => {
      const dateStr = format(date, 'MMM dd');
      const dayStart = startOfDay(date);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

      const dayInterests = interests?.filter(i => {
        const ts = i.timestamp?.toDate ? i.timestamp.toDate() : null;
        return ts && ts >= dayStart && ts <= dayEnd;
      }).length || 0;

      const dayRequests = requests?.filter(r => {
        const ts = r.timestamp?.toDate ? r.timestamp.toDate() : null;
        return ts && ts >= dayStart && ts <= dayEnd;
      }).length || 0;

      const dayMessages = messages?.filter(m => {
        const ts = m.timestamp?.toDate ? m.timestamp.toDate() : null;
        return ts && ts >= dayStart && ts <= dayEnd;
      }).length || 0;

      const dayViews = pitchViews?.filter(v => {
        const ts = v.timestamp?.toDate ? v.timestamp.toDate() : null;
        return ts && ts >= dayStart && ts <= dayEnd;
      }).length || 0;

      return {
        date: dateStr,
        interests: dayInterests,
        requests: dayRequests,
        messages: dayMessages,
        views: dayViews
      };
    });
  }, [timeRange, interests, requests, messages, pitchViews]);

  const stats = [
    { label: 'Pitch Views', value: pitch?.views || 0, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Investor Interests', value: interests?.length || 0, icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Saved Pitches', value: favorites?.length || 0, icon: Bookmark, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Contact Requests', value: requests?.length || 0, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Leads', value: leadIntelligence.length, icon: User, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'High Intent', value: hotInvestors.filter(i => i.level === 'High').length, icon: Flame, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  if (authLoading || loadingPitch) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin w-12 h-12 text-primary opacity-20" />
        </div>
      </div>
    );
  }

  if (!pitch || !isOwner) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
          <AlertCircle className="w-16 h-16 text-destructive opacity-20" />
          <h2 className="text-3xl font-black tracking-tight">Access Restricted</h2>
          <p className="text-muted-foreground">Analytics are only available to the authorized venture owner.</p>
          <Link href="/dashboard">
            <Button variant="outline" className="rounded-xl border-2 px-8 font-black uppercase text-[10px] tracking-widest h-12">Return to Gateway</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto py-12 px-6 w-full space-y-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b pb-10">
          <div className="space-y-4">
            <Link href={`/startup/${id}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all w-fit font-black text-[10px] uppercase tracking-widest group">
              <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-all">
                <ArrowLeft className="w-4 h-4" />
              </div>
              Back to Pitch
            </Link>
            <h1 className="text-5xl font-black tracking-tighter leading-none">Venture <span className="text-primary italic">Intelligence</span></h1>
            <p className="text-lg text-muted-foreground font-medium italic border-l-4 border-primary/20 pl-6">Real-time performance metrics for <span className="text-foreground font-black">{pitch.startupName}</span></p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-muted/50 p-1.5 rounded-2xl flex items-center shadow-inner ring-1 ring-black/5">
              {(['7d', '30d', '90d'] as TimeRange[]).map((range) => (
                <Button 
                  key={range}
                  variant={timeRange === range ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    "h-10 px-6 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all",
                    timeRange === range ? "bg-white shadow-lg text-primary" : "text-muted-foreground"
                  )}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                </Button>
              ))}
            </div>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 h-12 px-6 rounded-xl font-black uppercase tracking-[0.2em] text-[10px]">
              Live Ecosystem Sync
            </Badge>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {stats.map((stat, i) => (
            <Card key={i} className="border-none shadow-xl rounded-[2.5rem] overflow-hidden relative group hover:shadow-2xl transition-all duration-500">
              <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-10 group-hover:scale-150 transition-transform duration-700", stat.bg)} />
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</CardDescription>
                <CardTitle className="text-4xl font-black tracking-tighter">{stat.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={cn("absolute right-6 bottom-6 p-4 rounded-2xl shadow-inner", stat.bg)}>
                  <stat.icon className={cn("w-7 h-7", stat.color)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Hot Investors Section */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-orange-100 rounded-[1.5rem] shadow-sm"><Flame className="w-8 h-8 text-orange-600" /></div>
              <div>
                <h2 className="text-3xl font-black tracking-tight">Hot Investors</h2>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Priority Partners by Engagement Depth</p>
              </div>
            </div>
            <Badge className="bg-orange-500 text-white border-none rounded-xl px-4 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20">High Intent Identification</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {hotInvestors.length > 0 ? hotInvestors.map((investor) => (
              <Card key={investor.id} className={cn(
                "border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden group hover:-translate-y-2 transition-all duration-500",
                investor.level === 'High' && "ring-4 ring-orange-500/10"
              )}>
                <CardHeader className="p-10 pb-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center border-2 border-white shadow-inner relative overflow-hidden">
                        <User className="text-muted-foreground w-8 h-8" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-black leading-none">{investor.name}</CardTitle>
                        <p className="text-[10px] font-black uppercase text-muted-foreground mt-2 tracking-widest opacity-60 truncate max-w-[150px]">{investor.email}</p>
                      </div>
                    </div>
                    <Badge className={cn(
                      "border px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest",
                      investor.level === 'High' ? "bg-orange-50 text-orange-600 border-orange-100" :
                      investor.level === 'Medium' ? "bg-blue-50 text-blue-600 border-blue-100" :
                      "bg-muted text-muted-foreground border-muted"
                    )}>
                      {investor.level} Intent
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-10 pt-0 space-y-8">
                  <div className="grid grid-cols-2 gap-4 py-6 border-y border-dashed border-muted/50">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-muted-foreground opacity-50 tracking-widest">Score</p>
                      <p className="font-black text-2xl tracking-tighter text-orange-600">{investor.score}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-muted-foreground opacity-50 tracking-widest">Protocol</p>
                      <div className="flex flex-wrap gap-1">
                        {investor.hasRequest && <Badge className="bg-emerald-500 text-white text-[7px] px-1.5 py-0 rounded-md">Connected</Badge>}
                        {investor.hasInterest && <Badge className="bg-amber-500 text-white text-[7px] px-1.5 py-0 rounded-md">Interested</Badge>}
                        {investor.hasFavorite && <Badge className="bg-indigo-500 text-white text-[7px] px-1.5 py-0 rounded-md">Saved</Badge>}
                        {investor.viewCount > 1 && <Badge className="bg-blue-500 text-white text-[7px] px-1.5 py-0 rounded-md">Return Discovery</Badge>}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="flex items-center gap-2 text-muted-foreground"><Clock className="w-3.5 h-3.5 text-primary" /> {formatDistanceToNow(investor.lastSeen, { addSuffix: true })}</span>
                      <Link href={`/investor/${investor.id}`} className="text-primary hover:underline flex items-center gap-1.5 group/link">
                        Profile <ExternalLink className="w-3.5 h-3.5 group-hover/link:translate-x-1 group-hover/link:-translate-y-1 transition-transform" />
                      </Link>
                    </div>
                    
                    {investor.requestStatus === 'accepted' ? (
                      <Link href="/messages" className="block">
                        <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2">
                          <MessageSquare className="w-4 h-4" /> Message Partner
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/investor/${investor.id}`} className="block">
                        <Button variant="outline" className="w-full h-12 border-2 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-primary hover:text-white transition-all">
                          <Zap className="w-4 h-4" /> Analyze Credentials
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="col-span-full py-20 text-center space-y-6 bg-muted/20 rounded-[3rem] border-4 border-dashed">
                <MousePointer2 className="w-16 h-16 mx-auto text-muted-foreground opacity-20" />
                <div className="space-y-2">
                   <h3 className="text-xl font-black text-muted-foreground">Lead Identification Active</h3>
                   <p className="text-sm italic text-muted-foreground/60">Priority leads will appear here as they cross the engagement threshold.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Primary Trend Charts */}
        <div className="grid lg:grid-cols-2 gap-10">
          <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden flex flex-col">
            <CardHeader className="p-10 border-b bg-muted/20">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-xl"><Eye className="w-5 h-5 text-blue-600" /></div>
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-black tracking-tight">Discovery Momentum</CardTitle>
                  <CardDescription className="font-medium">Venture views over the selected period.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 flex-1">
              <div className="h-[300px] w-full">
                <ChartContainer config={chartConfig}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis dataKey="date" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent className="rounded-2xl border-none shadow-2xl" />} />
                    <Area type="monotone" dataKey="views" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                  </AreaChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden flex flex-col">
            <CardHeader className="p-10 border-b bg-muted/20">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-50 rounded-xl"><Sparkles className="w-5 h-5 text-amber-600" /></div>
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-black tracking-tight">Strategic Interest Growth</CardTitle>
                  <CardDescription className="font-medium">Cumulative growth in unique investor interests.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 flex-1">
              <div className="h-[300px] w-full">
                <ChartContainer config={chartConfig}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis dataKey="date" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="stepAfter" dataKey="interests" stroke="#39C4E0" strokeWidth={4} dot={{ r: 4, fill: '#39C4E0', strokeWidth: 0 }} />
                  </LineChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Engagement Charts */}
        <div className="grid lg:grid-cols-2 gap-10">
          <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden flex flex-col">
            <CardHeader className="p-10 border-b bg-muted/20">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 rounded-xl"><MessageSquare className="w-5 h-5 text-indigo-600" /></div>
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-black tracking-tight">Communication Volume</CardTitle>
                  <CardDescription className="font-medium">Direct messages exchanged with potential partners.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 flex-1">
              <div className="h-[300px] w-full">
                <ChartContainer config={chartConfig}>
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis dataKey="date" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="messages" fill="#2959A3" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden flex flex-col">
            <CardHeader className="p-10 border-b bg-muted/20">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 rounded-xl"><Target className="w-5 h-5 text-emerald-600" /></div>
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-black tracking-tight">Connection Request Trend</CardTitle>
                  <CardDescription className="font-medium">Daily volume of institutional inquiry requests.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 flex-1">
              <div className="h-[300px] w-full">
                <ChartContainer config={chartConfig}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis dataKey="date" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="requests" stroke="#10b981" strokeWidth={3} dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
                  </LineChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insights Summary */}
        <div className="grid lg:grid-cols-3 gap-10">
          <Card className="lg:col-span-1 border-none shadow-2xl rounded-[3rem] bg-primary text-white overflow-hidden relative group">
            <Zap className="absolute -right-10 -bottom-10 w-64 h-64 text-white/10 -rotate-12 transition-transform duration-1000 group-hover:rotate-0" />
            <CardHeader className="p-10 pb-6 relative z-10">
              <div className="flex items-center gap-4">
                <Sparkles className="w-6 h-6 text-white" />
                <CardTitle className="text-2xl font-black text-white">Venture Intelligence</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-10 pt-0 space-y-8 relative z-10">
              <div className="space-y-6">
                <div className="p-6 bg-white/10 rounded-2xl border border-white/20 shadow-inner">
                  <p className="font-black text-[10px] uppercase tracking-widest text-white/70">Conversion Rate</p>
                  <p className="text-3xl font-black mt-2">
                    {(interests?.length || 0) > 0 && (pitch?.views || 0) > 0 ? ((interests!.length / pitch!.views) * 100).toFixed(1) : '0'}%
                  </p>
                  <p className="text-[10px] mt-1 font-medium opacity-60 italic">View to Interest conversion</p>
                </div>
                <div className="p-6 bg-white/10 rounded-2xl border border-white/20 shadow-inner">
                  <p className="font-black text-[10px] uppercase tracking-widest text-white/70">Retention Signal</p>
                  <p className="text-3xl font-black mt-2">
                    {leadIntelligence.filter(l => l.viewCount > 1 || l.hasFavorite).length}
                  </p>
                  <p className="text-[10px] mt-1 font-medium opacity-60 italic">Repeat / Saved visitors</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden flex flex-col">
            <CardHeader className="p-10 border-b bg-muted/10">
              <div className="flex items-center gap-4">
                <LayoutGrid className="w-6 h-6 text-primary" />
                <CardTitle className="text-xl font-black tracking-tight">Full Lead Intelligence</CardTitle>
              </div>
              <CardDescription className="mt-1 font-medium italic">Comprehensive log of verified professional engagements</CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <div className="divide-y overflow-auto max-h-[480px] scrollbar-hide">
                {leadIntelligence.length > 0 ? leadIntelligence.map((lead) => (
                  <div key={lead.id} className="p-8 hover:bg-muted/5 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center border shadow-inner transition-transform group-hover:scale-110"><User className="w-6 h-6 text-primary/40" /></div>
                      <div className="space-y-1">
                        <p className="font-black text-lg">{lead.name}</p>
                        <div className="flex items-center gap-3">
                           <Badge variant="outline" className="text-[8px] font-black uppercase px-2 py-0 rounded-lg bg-white">
                             {(lead.viewCount as number) > 1 ? `Return Visitor (${lead.viewCount})` : 'New Discovery'}
                           </Badge>
                           {lead.hasInterest && <Badge className="bg-amber-500/10 text-amber-600 border-none text-[8px] px-2 py-0">Interest Logged</Badge>}
                           {lead.hasFavorite && <Badge className="bg-indigo-500/10 text-indigo-600 border-none text-[8px] px-2 py-0">Saved Pitch</Badge>}
                           {lead.hasRequest && <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[8px] px-2 py-0">Connected</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={cn(
                        "text-[9px] font-black uppercase px-3 py-1 rounded-lg",
                        lead.level === 'High' ? "bg-orange-500 text-white" :
                        lead.level === 'Medium' ? "bg-blue-500 text-white" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {lead.level} Tier
                      </Badge>
                      <Link href={`/investor/${lead.id}`}>
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-primary/5 hover:text-primary transition-all border border-transparent hover:border-primary/20"><ExternalLink className="w-5 h-5" /></Button>
                      </Link>
                    </div>
                  </div>
                )) : (
                  <div className="p-24 text-center space-y-4 opacity-20">
                    <MousePointer2 className="w-16 h-16 mx-auto animate-bounce" />
                    <p className="font-black text-xs uppercase tracking-widest italic">Monitoring for market discovery...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
