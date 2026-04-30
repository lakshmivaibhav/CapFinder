
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
  Clock
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
  LineChart
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { format, subDays, startOfDay, eachDayOfInterval, formatDistanceToNow } from 'date-fns';

const chartConfig: ChartConfig = {
  interests: {
    label: "Interests",
    color: "hsl(var(--primary))",
  },
  requests: {
    label: "Requests",
    color: "#10b981",
  },
  messages: {
    label: "Messages",
    color: "hsl(var(--primary))",
  },
  views: {
    label: "Views",
    color: "#2563eb",
  },
};

export default function PitchAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, profile, loading: authLoading } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<'weekly' | 'monthly'>('weekly');

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

  const favoritesQuery = useMemoFirebase(() => {
    if (!pitch) return null;
    return query(collection(db, 'favorites'), where('pitchId', '==', id));
  }, [db, id, pitch]);
  const { data: favorites } = useCollection(favoritesQuery);

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

  // Identity-Aware Investor Engagement Processing
  const leadIntelligence = useMemo(() => {
    if (!pitch || (!interests && !requests && !pitchViews)) return [];

    const grouped = new Map<string, any>();

    // Process Views
    pitchViews?.forEach(v => {
      if (!grouped.has(v.investorId)) {
        grouped.set(v.investorId, { 
          id: v.investorId, 
          name: v.investorName, 
          email: v.investorEmail, 
          viewCount: 0, 
          hasInterest: false, 
          hasRequest: false, 
          messageCount: 0,
          lastSeen: v.timestamp?.toDate ? v.timestamp.toDate() : new Date(0)
        });
      }
      const lead = grouped.get(v.investorId);
      lead.viewCount += 1;
      const ts = v.timestamp?.toDate ? v.timestamp.toDate() : new Date(0);
      if (ts > lead.lastSeen) lead.lastSeen = ts;
    });

    // Process Interests
    interests?.forEach(i => {
      if (!grouped.has(i.investorId)) {
        grouped.set(i.investorId, { id: i.investorId, name: 'Lead', email: i.investorEmail, viewCount: 0, hasInterest: true, hasRequest: false, messageCount: 0, lastSeen: i.timestamp?.toDate ? i.timestamp.toDate() : new Date(0) });
      }
      const lead = grouped.get(i.investorId);
      lead.hasInterest = true;
      const ts = i.timestamp?.toDate ? i.timestamp.toDate() : new Date(0);
      if (ts > lead.lastSeen) lead.lastSeen = ts;
    });

    // Process Requests
    requests?.forEach(r => {
      const investorId = r.senderId; // In contactRequests, sender is usually the investor
      if (!grouped.has(investorId)) {
        grouped.set(investorId, { id: investorId, name: 'Lead', email: r.investorEmail, viewCount: 0, hasInterest: false, hasRequest: true, messageCount: 0, lastSeen: r.timestamp?.toDate ? r.timestamp.toDate() : new Date(0) });
      }
      const lead = grouped.get(investorId);
      lead.hasRequest = true;
      const ts = r.timestamp?.toDate ? r.timestamp.toDate() : new Date(0);
      if (ts > lead.lastSeen) lead.lastSeen = ts;
    });

    // Process Messages
    messages?.forEach(m => {
      const investorId = m.senderId === pitch.ownerId ? m.receiverId : m.senderId;
      if (!grouped.has(investorId)) return; // Only track leads we've identified through views/interests
      const lead = grouped.get(investorId);
      lead.messageCount += 1;
      const ts = m.timestamp?.toDate ? m.timestamp.toDate() : new Date(0);
      if (ts > lead.lastSeen) lead.lastSeen = ts;
    });

    // Calculate Engagement Score
    return Array.from(grouped.values()).map(lead => {
      let score = 0;
      score += lead.viewCount;
      if (lead.hasInterest) score += 10;
      if (lead.hasRequest) score += 5;
      score += (lead.messageCount * 2);
      
      return { ...lead, score };
    }).sort((a, b) => b.score - a.score);
  }, [pitch, interests, requests, messages, pitchViews]);

  const hotLeads = useMemo(() => leadIntelligence.filter(l => l.score >= 10).slice(0, 5), [leadIntelligence]);

  // Original Chart & Score Logic
  const maturityIndex = useMemo(() => {
    if (!pitch) return 0;
    let score = 0;
    if (pitch.founderInvestment && Number(pitch.founderInvestment) > 0) score += 2;
    else if (pitch.noInvestmentReason) score += 1;
    if (pitch.fundUsage && pitch.fundUsage.length > 20) score += 2;
    if (pitch.longTermVision && pitch.longTermVision.length > 20) score += 2;
    if (pitch.description && pitch.description.length > 50) score += 1;
    if (pitch.startupName && pitch.category && pitch.fundingNeeded) score += 1;
    return parseFloat(((score / 8) * 10).toFixed(1));
  }, [pitch]);

  const trendData = useMemo(() => {
    const daysToLookBack = timeRange === 'weekly' ? 7 : 30;
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
        views: dayViews || Math.round((pitch?.views || 0) / 30) // Fallback to average if collection empty
      };
    });
  }, [timeRange, interests, requests, messages, pitch, pitchViews]);

  const stats = [
    { label: 'Pitch Views', value: pitch?.views || 0, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Investor Interests', value: interests?.length || 0, icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Contact Requests', value: requests?.length || 0, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Active Hubs', value: requests?.filter(r => r.status === 'accepted').length || 0, icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Identified Leads', value: leadIntelligence.length, icon: User, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Trust Score', value: `${maturityIndex}/10`, icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50' },
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
          <p className="text-muted-foreground max-sm">Analytics are only available to the authorized venture owner.</p>
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
      <main className="flex-1 max-w-7xl mx-auto py-12 px-6 w-full space-y-12">
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
            <div className="bg-muted/50 p-1 rounded-xl flex items-center shadow-inner">
              <Button 
                variant={timeRange === 'weekly' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setTimeRange('weekly')}
                className="h-10 px-6 rounded-lg font-black uppercase text-[9px] tracking-widest transition-all"
              >
                Weekly
              </Button>
              <Button 
                variant={timeRange === 'monthly' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setTimeRange('monthly')}
                className="h-10 px-6 rounded-lg font-black uppercase text-[9px] tracking-widest transition-all"
              >
                Monthly
              </Button>
            </div>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 h-12 px-6 rounded-xl font-black uppercase tracking-[0.2em] text-[10px]">
              Live Lead Sync
            </Badge>
          </div>
        </div>

        {/* Hot Leads Header */}
        {hotLeads.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-xl shadow-sm"><Flame className="w-6 h-6 text-red-600" /></div>
              <h2 className="text-2xl font-black tracking-tight">Hot Leads</h2>
              <Badge className="bg-red-500 text-white border-none rounded-lg px-2 py-0.5 text-[8px] font-black uppercase">High Signal</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hotLeads.map((lead) => (
                <Card key={lead.id} className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden group hover:-translate-y-1 transition-all">
                  <CardHeader className="p-8 pb-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center border-2 border-white shadow-inner"><User className="text-muted-foreground w-6 h-6" /></div>
                        <div>
                          <CardTitle className="text-lg font-black leading-none">{lead.name}</CardTitle>
                          <p className="text-[10px] font-black uppercase text-muted-foreground mt-1 tracking-widest">{lead.email}</p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-700 border-none font-black text-[8px] px-2 py-0.5 rounded-md">Score: {lead.score}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 pt-0 space-y-6">
                    <div className="grid grid-cols-3 gap-4 py-4 border-y border-dashed">
                      <div className="text-center">
                        <p className="text-[8px] font-black uppercase text-muted-foreground mb-1">Views</p>
                        <p className="font-black text-xl">{lead.viewCount}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] font-black uppercase text-muted-foreground mb-1">Status</p>
                        {lead.hasRequest ? <Badge className="bg-primary text-white text-[8px] px-1">Connected</Badge> : lead.hasInterest ? <Badge className="bg-amber-500 text-white text-[8px] px-1">Interested</Badge> : <Badge variant="outline" className="text-[8px] px-1">Exploring</Badge>}
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] font-black uppercase text-muted-foreground mb-1">Chats</p>
                        <p className="font-black text-xl">{lead.messageCount}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Seen {formatDistanceToNow(lead.lastSeen, { addSuffix: true })}</span>
                      <Link href={`/investor/${lead.id}`} className="text-primary hover:underline flex items-center gap-1">Analyze Profile <ExternalLink className="w-3 h-3" /></Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {stats.map((stat, i) => (
            <Card key={i} className="border-none shadow-xl rounded-[2.5rem] overflow-hidden relative group">
              <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-5 group-hover:scale-150 transition-transform duration-700", stat.bg)} />
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

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Trend Chart */}
          <Card className="lg:col-span-8 border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden flex flex-col">
            <CardHeader className="p-10 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-4 mb-2">
                    <TrendingUp className="w-6 h-6 text-primary" />
                    <CardTitle className="text-2xl font-black tracking-tight">Discovery & Conversion Trend</CardTitle>
                  </div>
                  <CardDescription className="font-medium">Tracking verified views against strategic inquiry volume.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 flex-1">
              <div className="h-[400px] w-full mt-6">
                <ChartContainer config={chartConfig}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorInterests" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis dataKey="date" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} className="font-black uppercase tracking-widest" dy={10} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent className="rounded-xl border-none shadow-2xl" />} />
                    <Area type="monotone" dataKey="views" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                    <Area type="monotone" dataKey="interests" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorInterests)" />
                  </AreaChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          {/* Lead List / Engagement Sidebar */}
          <Card className="lg:col-span-4 border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden flex flex-col">
            <CardHeader className="p-10 pb-4 border-b bg-muted/10">
              <div className="flex items-center gap-4">
                <LayoutGrid className="w-6 h-6 text-primary" />
                <CardTitle className="text-xl font-black tracking-tight">Lead Intelligence</CardTitle>
              </div>
              <CardDescription className="mt-1 font-medium">Verified professional engagements</CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <div className="divide-y overflow-auto max-h-[500px]">
                {leadIntelligence.length > 0 ? leadIntelligence.map((lead) => (
                  <div key={lead.id} className="p-6 hover:bg-muted/5 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center border shadow-inner"><User className="w-4 h-4 text-primary" /></div>
                      <div className="space-y-0.5">
                        <p className="font-black text-sm">{lead.name}</p>
                        <div className="flex items-center gap-2">
                           <Badge variant="outline" className="text-[7px] font-black uppercase px-1 py-0 rounded-sm">{(lead.viewCount as number) > 1 ? `Return Visitor (${lead.viewCount})` : 'New Discovery'}</Badge>
                           {lead.hasInterest && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" title="Interest Logged" />}
                        </div>
                      </div>
                    </div>
                    <Link href={`/investor/${lead.id}`}>
                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><ExternalLink className="w-4 h-4 text-muted-foreground" /></Button>
                    </Link>
                  </div>
                )) : (
                  <div className="p-20 text-center space-y-4 opacity-30">
                    <User className="w-12 h-12 mx-auto" />
                    <p className="font-black text-[10px] uppercase tracking-widest italic">Waiting for discovery...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
           <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden">
            <CardHeader className="p-10 border-b bg-muted/20">
              <div className="flex items-center gap-4 mb-2">
                <Target className="w-6 h-6 text-primary" />
                <CardTitle className="text-2xl font-black tracking-tight">Active Strategic Hubs</CardTitle>
              </div>
              <CardDescription className="font-medium">Direct communication volume with capital partners.</CardDescription>
            </CardHeader>
            <CardContent className="p-10">
              <div className="h-[300px] w-full mt-6">
                <ChartContainer config={chartConfig}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis dataKey="date" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} className="font-black uppercase tracking-widest" dy={10} />
                    <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="messages" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: 'white', strokeWidth: 2 }} />
                  </LineChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-2xl rounded-[3rem] bg-primary text-white overflow-hidden relative group">
            <Zap className="absolute -right-10 -bottom-10 w-64 h-64 text-white/10 -rotate-12 transition-transform duration-1000 group-hover:rotate-0" />
            <CardHeader className="p-10 pb-4">
              <div className="flex items-center gap-4">
                <Sparkles className="w-6 h-6 text-white" />
                <CardTitle className="text-2xl font-black tracking-tight text-white">Venture Ecosystem Insights</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-10 pt-4 space-y-8">
              <div className="grid gap-6">
                <div className="p-6 bg-white/10 rounded-2xl border border-white/20">
                  <p className="font-black text-sm uppercase tracking-widest text-white">Engagement Quality</p>
                  <p className="text-sm opacity-90 leading-relaxed font-medium mt-1">
                    Your conversion rate from View to Interest is <span className="font-black">{(interests?.length || 0) > 0 && (pitch?.views || 0) > 0 ? ((interests!.length / pitch!.views) * 100).toFixed(1) : '0'}%</span>.
                  </p>
                </div>
                <div className="p-6 bg-white/10 rounded-2xl border border-white/20">
                  <p className="font-black text-sm uppercase tracking-widest text-white">Lead Retention</p>
                  <p className="text-sm opacity-90 leading-relaxed font-medium mt-1">
                    <span className="font-black">{leadIntelligence.filter(l => l.viewCount > 1).length}</span> investors have visited your pitch multiple times.
                  </p>
                </div>
              </div>
              <div className="p-8 bg-black/20 rounded-[2rem] border-l-8 border-white italic text-sm opacity-80 leading-relaxed">
                "High-signal investors typically view a pitch 2.4 times before initiating a direct connection request."
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
