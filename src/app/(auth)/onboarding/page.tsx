
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore } from '@/firebase';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, TrendingUp, Loader2, Zap, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function OnboardingPage() {
  const { user, refreshProfile } = useAuth();
  const db = useFirestore();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSelectRole = async (role: 'investor' | 'startup') => {
    if (!user) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        role,
        email: user.email,
        createdAt: new Date(),
      }, { merge: true });
      await refreshProfile();
      toast({ title: "Role established", description: "Configuring your strategic workspace." });
      router.push('/dashboard');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Protocol failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8fafc]">
      <div className="max-w-4xl w-full space-y-12">
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-primary rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-primary/30">
            <Zap className="text-white w-8 h-8" />
          </div>
          <div className="space-y-2">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-4 py-1.5 rounded-full font-black uppercase text-[10px] tracking-[0.2em]">Step 1: Role Identification</Badge>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">Define your platform <span className="text-primary italic">identity</span>.</h1>
            <p className="text-xl text-muted-foreground max-w-xl mx-auto font-medium italic">Select your primary objective within the CapFinder ecosystem.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card 
            className="cursor-pointer hover:border-primary border-4 border-transparent transition-all group hover:shadow-2xl rounded-[2.5rem] overflow-hidden bg-white relative flex flex-col"
            onClick={() => handleSelectRole('startup')}
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Briefcase className="w-32 h-32 text-primary" />
            </div>
            <CardHeader className="p-10 space-y-6 flex-1">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-inner group-hover:shadow-xl group-hover:shadow-primary/20">
                <Briefcase className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-3xl font-black tracking-tight group-hover:text-primary transition-colors">Founder</CardTitle>
                <CardDescription className="text-lg font-medium leading-relaxed italic">
                  "I am building a high-growth venture and seeking strategic capital partners to scale our innovation."
                </CardDescription>
              </div>
            </CardHeader>
            <div className="p-10 pt-0">
               <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all">
                 Enter Ecosystem <ArrowRight className="w-4 h-4" />
               </div>
            </div>
          </Card>

          <Card 
            className="cursor-pointer hover:border-accent border-4 border-transparent transition-all group hover:shadow-2xl rounded-[2.5rem] overflow-hidden bg-white relative flex flex-col"
            onClick={() => handleSelectRole('investor')}
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp className="w-32 h-32 text-accent" />
            </div>
            <CardHeader className="p-10 space-y-6 flex-1">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all duration-500 shadow-inner group-hover:shadow-xl group-hover:shadow-accent/20">
                <TrendingUp className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-3xl font-black tracking-tight group-hover:text-accent transition-colors">Capital Partner</CardTitle>
                <CardDescription className="text-lg font-medium leading-relaxed italic">
                  "I am identifying market-disrupting startups and seeking high-conviction opportunities to deploy capital."
                </CardDescription>
              </div>
            </CardHeader>
            <div className="p-10 pt-0">
               <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all">
                 Begin Discovery <ArrowRight className="w-4 h-4" />
               </div>
            </div>
          </Card>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-4 text-primary font-black uppercase tracking-widest text-xs animate-pulse">
            <Loader2 className="animate-spin w-5 h-5" />
            Synchronizing Identity...
          </div>
        )}
      </div>
    </div>
  );
}
