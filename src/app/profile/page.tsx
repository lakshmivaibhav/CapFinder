"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, User, ArrowLeft, Camera, Briefcase, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Navbar } from '@/components/navbar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const db = useFirestore();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    bio: '',
    fundingNeeded: '',
    investmentInterest: '',
  });

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        company: profile.company || '',
        bio: profile.bio || '',
        fundingNeeded: profile.fundingNeeded || '',
        investmentInterest: profile.investmentInterest || '',
      });
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...formData,
        updatedAt: new Date(),
      });
      await refreshProfile();
      toast({ title: "Profile updated!", description: "Your changes have been saved." });
      router.push('/dashboard');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error saving", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto w-10 h-10 text-primary" /></div>;
  if (!user) { router.push('/login'); return null; }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="max-w-4xl mx-auto py-12 px-6 w-full space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <Badge variant="secondary" className="px-3 py-1 capitalize bg-primary/10 text-primary font-bold">
            {profile?.role} Account
          </Badge>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-6">
            <Card className="border-none shadow-sm text-center p-6 bg-white">
              <div className="relative inline-block mx-auto mb-4">
                <div className="w-32 h-32 bg-primary/5 rounded-3xl flex items-center justify-center border-2 border-primary/10 shadow-inner">
                  <User className="text-primary w-16 h-16" />
                </div>
                <Button size="icon" variant="secondary" className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 shadow-md">
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
              <h2 className="text-xl font-bold">{formData.name || 'Anonymous User'}</h2>
              <p className="text-sm text-muted-foreground mb-4">{user.email}</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                  <Briefcase className="w-3 h-3" />
                  {formData.company || 'No Company'}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                  <Mail className="w-3 h-3" />
                  Verified {profile?.role === 'investor' ? 'Investor' : 'Startup'}
                </div>
              </div>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <div className="bg-muted/30 border-b p-8">
                <CardTitle className="text-2xl font-bold">Profile Settings</CardTitle>
                <CardDescription>Update your professional information seen by other users.</CardDescription>
              </div>
              <CardContent className="p-8">
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Display Name</Label>
                      <Input 
                        id="name" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="John Doe"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Organization</Label>
                      <Input 
                        id="company" 
                        value={formData.company}
                        onChange={(e) => setFormData({...formData, company: e.target.value})}
                        placeholder="Innovate Ventures"
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">About Me</Label>
                    <Textarea 
                      id="bio" 
                      className="min-h-[140px] resize-none"
                      value={formData.bio}
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                      placeholder="Share your background or startup vision..."
                    />
                  </div>

                  {profile?.role === 'startup' && (
                    <div className="space-y-2">
                      <Label htmlFor="fundingNeeded">Target Funding ($)</Label>
                      <Input 
                        id="fundingNeeded" 
                        type="text"
                        value={formData.fundingNeeded}
                        onChange={(e) => setFormData({...formData, fundingNeeded: e.target.value})}
                        placeholder="e.g. 1.5M"
                        className="h-11 font-mono"
                      />
                    </div>
                  )}

                  {profile?.role === 'investor' && (
                    <div className="space-y-2">
                      <Label htmlFor="investmentInterest">Interests (Tags)</Label>
                      <Input 
                        id="investmentInterest" 
                        value={formData.investmentInterest}
                        onChange={(e) => setFormData({...formData, investmentInterest: e.target.value})}
                        placeholder="AI, SaaS, BioTech"
                        className="h-11"
                      />
                    </div>
                  )}

                  <Button type="submit" className="w-full h-12 shadow-md bg-primary hover:bg-primary/90" disabled={saving}>
                    {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 w-5 h-5" />}
                    Save Profile Changes
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
