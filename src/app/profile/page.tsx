"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, ArrowLeft, Save, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
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
    <div className="max-w-3xl mx-auto py-10 px-6 space-y-6">
      <Link href="/dashboard" className="flex items-center gap-2 text-primary font-medium hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <Card className="shadow-lg">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-inner">
              <User className="text-white w-8 h-8" />
            </div>
            <div>
              <CardTitle className="text-2xl">User Profile</CardTitle>
              <CardDescription>Role: <span className="capitalize font-semibold text-primary">{profile?.role}</span></CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <Input 
                  id="company" 
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  placeholder="Acme Inc."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Professional Bio</Label>
              <Textarea 
                id="bio" 
                className="min-h-[120px]"
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                placeholder="Tell others about yourself or your startup mission..."
              />
            </div>

            {profile?.role === 'startup' && (
              <div className="space-y-2">
                <Label htmlFor="fundingNeeded">Target Funding Amount ($)</Label>
                <Input 
                  id="fundingNeeded" 
                  value={formData.fundingNeeded}
                  onChange={(e) => setFormData({...formData, fundingNeeded: e.target.value})}
                  placeholder="e.g. 500,000"
                />
              </div>
            )}

            {profile?.role === 'investor' && (
              <div className="space-y-2">
                <Label htmlFor="investmentInterest">Investment Interests</Label>
                <Input 
                  id="investmentInterest" 
                  value={formData.investmentInterest}
                  onChange={(e) => setFormData({...formData, investmentInterest: e.target.value})}
                  placeholder="e.g. AI, Clean Energy, Fintech"
                />
              </div>
            )}

            <Button type="submit" className="w-full h-12 text-lg bg-primary" disabled={saving}>
              {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 w-5 h-5" />}
              Save Profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}