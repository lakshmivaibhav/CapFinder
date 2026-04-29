
"use client";

import { use, useMemo } from 'react';
import { doc, collection, query, where } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Eye, Sparkles, MessageSquare, Star, Target, TrendingUp, CheckCircle2, AlertCircle, LayoutGrid, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, CellProps } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export default function PitchAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, profile, loading: authLoading } = useAuth();
  const db = useFirestore();
  const router = useRouter();

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

  const stats = [
    { label: 'Pitch Views', value: pitch?.views || 0, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Investor Interests', value: interests?.length || 0, icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Contact Requests', value: requests?.length || 0, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Active Hubs', value: requests?.filter(r => r.status === 'accepted').length || 0, icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Saved by Investors', value: favorites?.length || 0, icon: Star, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Trust Score', value: `${maturityIndex}/10`, icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50' },
  ];

  const chartData = [
    { name: 'Views', total: pitch?.views || 0, fill: '#2563eb' },
    { name: 'Interests', total: interests?.length || 0, fill: '#f59e0b' },
    { name: 'Requests', total: requests?.length || 0, fill: '#10b981' },
    { name: 'Saves', total: favorites?.length || 0, fill: '#e11d48' },
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
          <p className="text-muted-foreground max-w-sm">Analytics are only available to the authorized venture owner.</p>
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
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 h-12 px-6 rounded-xl font-black uppercase tracking-[0.2em] text-[10px]">
            Live Sync Active
          </Badge>
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
          <Card className="lg:col-span-8 border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden">
            <CardHeader className="p-10 border-b bg-muted/20">
              <div className="flex items-center gap-4 mb-2">
                <TrendingUp className="w-6 h-6 text-primary" />
                <CardTitle className="text-2xl font-black tracking-tight">Engagement Funnel</CardTitle>
              </div>
              <CardDescription className="font-medium">Visualizing investor interactions across the platform.</CardDescription>
            </CardHeader>
            <CardContent className="p-10">
              <div className="h-[400px] w-full mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis 
                      dataKey="name" 
                      stroke="#888888" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      className="font-black uppercase tracking-widest"
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      content={<ChartTooltipContent className="rounded-xl border-none shadow-2xl" />}
                    />
                    <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
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
                  <LayoutGrid className="w-6 h-6 text-primary" />
                  <CardTitle className="text-xl font-black tracking-tight">Growth Insights</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-10 pt-4 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-emerald-50 rounded-lg shrink-0"><TrendingUp className="w-4 h-4 text-emerald-600" /></div>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">Your pitch views are <span className="text-emerald-600 font-black">increasing</span> week-over-week.</p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-amber-50 rounded-lg shrink-0"><Sparkles className="w-4 h-4 text-amber-600" /></div>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">Investors from <span className="text-foreground font-black">Fintech</span> are showing the most interest.</p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/5 rounded-lg shrink-0"><Eye className="w-4 h-4 text-primary" /></div>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">Average viewing time has stabilized at <span className="text-foreground font-black">1.4 minutes</span>.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
