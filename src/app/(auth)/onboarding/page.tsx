"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore } from '@/firebase';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, TrendingUp, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
      toast({ title: "Role selected", description: "Taking you to complete your profile." });
      router.push('/profile');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">How will you use CapFinder?</h1>
          <p className="text-muted-foreground">Select your role to personalize your experience.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card 
            className="cursor-pointer hover:border-primary transition-all group hover:shadow-lg"
            onClick={() => handleSelectRole('startup')}
          >
            <CardHeader className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                <Briefcase className="w-8 h-8" />
              </div>
              <CardTitle>I am a Startup</CardTitle>
              <CardDescription>I am seeking investment for my innovative business idea or venture.</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:border-accent transition-all group hover:shadow-lg"
            onClick={() => handleSelectRole('investor')}
          >
            <CardHeader className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors">
                <TrendingUp className="w-8 h-8" />
              </div>
              <CardTitle>I am an Investor</CardTitle>
              <CardDescription>I am looking for high-potential startups to invest my capital and expertise.</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-primary font-medium">
            <Loader2 className="animate-spin" />
            Setting up your profile...
          </div>
        )}
      </div>
    </div>
  );
}
