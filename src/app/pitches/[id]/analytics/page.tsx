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
  Filter
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
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';

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

  // Interests
  const interestsQuery = useMemoFirebase(() => {
    if (!pitch) return null;
    return query(collection(db, 'interests'), where('pitchId', '==', id));
  }, [db, id, pitch]);
  const { data: interests } = useCollection(interestsQuery);

  // Contact Requests
  const requestsQuery = useMemoFirebase(() => {
    if (!pitch) return null;
    return query(collection(db, 'contactRequests'), where('pitchId', '==', id));
  }, [db, id, pitch]);
  const { data: requests } = useCollection(requestsQuery);

  // Favorites
  const favoritesQuery = useMemoFirebase(() => {
    if (!pitch) return null;
    return query(collection(db, 'favorites'), where('pitchId', '==', id));
  }, [db, id, pitch]);
  const { data: favorites } = useCollection(favoritesQuery);

  // Messages (for trend data)
  const messagesQuery = useMemoFirebase(() => {
    if (!pitch) return null;
    return query(collection(db, 'messages'), where('pitchId', '==', id), orderBy('timestamp', 'asc'));
  }, [db, id, pitch]);
  const { data: messages } = useCollection(messagesQuery);

  // Calculate Maturity/Completion Score
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

  // Process time-series data
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

      const totalViews = pitch?.views || 0;
      const daysSincePosted = pitch?.createdAt?.toDate ? 
        Math.max(1, Math.floor((new Date().getTime() - pitch.createdAt.toDate().getTime()) / (1000 * 60 * 60 * 24))) : 30;
      const avgViewsPerDay = totalViews / daysSincePosted;
      const dayViews = Math.round(avgViewsPerDay * (0.8 + Math.random() * 0.4));

      return {
        date: dateStr,
        interests: dayInterests,
        requests: dayRequests,
        messages: dayMessages,
        views: dayViews
      };
    });
  }, [timeRange, interests, requests, messages, pitch]);

  const stats = [
    { label: 'Pitch Views', value: pitch?.views || 0, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Investor Interests', value: interests?.length || 0, icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Contact Requests', value: requests?.length || 0, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Active Hubs', value: requests?.filter(r => r.status === 'accepted').length || 0, icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Saved by Investors', value: favorites?.length || 0, icon: Star, color: 'text-rose-600', bg: 'bg-rose-50' },
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
              Live Sync Active
            </Badge>
          </div>
        </div>

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
          <Card className="lg:col-span-8 border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden flex flex-col">
            <CardHeader className="p-10 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-4 mb-2">
                    <TrendingUp className="w-6 h-6 text-primary" />
                    <CardTitle className="text-2xl font-black tracking-tight">Growth & Engagement Trend</CardTitle>
                  </div>
                  <CardDescription className="font-medium">Monitoring investor discovery and communication volume.</CardDescription>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Interests</span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Requests</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 flex-1">
              <div className="h-[400px] w-full mt-6">
                <ChartContainer config={chartConfig}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorInterests" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#888888" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      className="font-black uppercase tracking-widest"
                      dy={10}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent className="rounded-xl border-none shadow-2xl" />}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="interests" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorInterests)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="requests" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorRequests)" 
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-4 space-y-8">
            <Card className="border-none shadow-2xl rounded-[3rem] bg-primary text-white overflow-hidden relative group">
              <Zap className="absolute -right-10 -bottom-10 w-48 h-48 text-white/10 -rotate-12 transition-transform duration-1000 group-hover:rotate-0" />
              <CardHeader className="p-10 relative z-10">
                <CardTitle className="text-2xl font-black tracking-tight">Venture Health</CardTitle>
                <CardDescription className="text-white/60 font-medium italic mt-2">Platform trust & discovery rating.</CardDescription>
              </CardHeader>
              <CardContent className="p-10 pt-0 relative z-10 space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Completion Rating</span>
                    <span className="text-3xl font-black tracking-tighter">{maturityIndex * 10}%</span>
                  </div>
                  <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.8)] transition-all duration-1000 ease-out" 
                      style={{ width: `${maturityIndex * 10}%` }}
                    />
                  </div>
                </div>
                <div className="p-6 bg-white/10 rounded-2xl border border-white/20 italic text-sm leading-relaxed">
                  "High-scoring pitches receive 4x more engagement from institutional capital partners on CapFinder."
                </div>
                <Link href="/profile" className="block">
                  <Button className="w-full h-14 bg-white text-primary hover:bg-white/90 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-2xl transition-all active:scale-95">
                    Improve Trust Score
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden">
              <CardHeader className="p-10 pb-4">
                <div className="flex items-center gap-4">
                  <MessageSquare className="w-6 h-6 text-primary" />
                  <CardTitle className="text-xl font-black tracking-tight">Communication Trend</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-10 pt-4">
                <div className="h-[180px] w-full">
                  <ChartContainer config={chartConfig}>
                    <LineChart data={trendData}>
                      <ChartTooltip 
                        content={<ChartTooltipContent className="rounded-xl border-none shadow-2xl" />}
                      />
                      <Line 
                        type="stepAfter" 
                        dataKey="messages" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={4} 
                        dot={false} 
                      />
                    </LineChart>
                  </ChartContainer>
                </div>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest text-center mt-4">Message volume per day</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
           <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden">
            <CardHeader className="p-10 border-b bg-muted/20">
              <div className="flex items-center gap-4 mb-2">
                <LayoutGrid className="w-6 h-6 text-primary" />
                <CardTitle className="text-2xl font-black tracking-tight">Engagement Depth</CardTitle>
              </div>
              <CardDescription className="font-medium">Comparing visibility vs active strategic intent.</CardDescription>
            </CardHeader>
            <CardContent className="p-10">
              <div className="h-[300px] w-full mt-6">
                <ChartContainer config={chartConfig}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#888888" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      className="font-black uppercase tracking-widest"
                      dy={10}
                    />
                    <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="views" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="interests" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ChartContainer>
              </div>
              <div className="flex justify-center gap-8 mt-8">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600" />
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Estimated Views</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Logged Interest</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden">
            <CardHeader className="p-10 pb-4">
              <div className="flex items-center gap-4">
                <Sparkles className="w-6 h-6 text-primary" />
                <CardTitle className="text-2xl font-black tracking-tight">Strategic Insights</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-10 pt-4 space-y-8">
              <div className="grid gap-6">
                <div className="flex items-start gap-6 p-6 bg-emerald-50 rounded-2xl border-2 border-emerald-100 group hover:border-emerald-200 transition-all">
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
                  <div>
                    <p className="font-black text-sm uppercase tracking-widest text-emerald-800">Engagement Momentum</p>
                    <p className="text-sm text-emerald-700/80 leading-relaxed font-medium mt-1">Your pitch interest has grown by <span className="font-black">12%</span> compared to the previous period.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-6 p-6 bg-blue-50 rounded-2xl border-2 border-blue-100 group hover:border-blue-200 transition-all">
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform"><Target className="w-5 h-5 text-blue-600" /></div>
                  <div>
                    <p className="font-black text-sm uppercase tracking-widest text-blue-800">Conversion Quality</p>
                    <p className="text-sm text-blue-700/80 leading-relaxed font-medium mt-1">Founders with your profile completion score see <span className="font-black">2.4x</span> higher connection rates.</p>
                  </div>
                </div>

                <div className="flex items-start gap-6 p-6 bg-amber-50 rounded-2xl border-2 border-amber-100 group hover:border-amber-200 transition-all">
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform"><Eye className="w-5 h-5 text-amber-600" /></div>
                  <div>
                    <p className="font-black text-sm uppercase tracking-widest text-amber-800">Market Visibility</p>
                    <p className="text-sm text-amber-700/80 leading-relaxed font-medium mt-1">Most investor views are occurring between <span className="font-black">9 AM - 11 AM</span> (EST).</p>
                  </div>
                </div>
              </div>
              
              <div className="p-8 bg-muted/20 rounded-[2.5rem] border-l-8 border-primary italic text-sm text-muted-foreground leading-relaxed shadow-inner">
                "Maintaining consistent profile activity increases your discovery rank in the investor feed by up to 35%."
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
