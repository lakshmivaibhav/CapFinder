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
import { Loader2, Save, User, ArrowLeft, Camera, Briefcase, Mail, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Navbar } from '@/components/navbar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    role: '',
  });

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        company: profile.company || '',
        bio: profile.bio || '',
        fundingNeeded: profile.fundingNeeded?.toString() || '',
        investmentInterest: profile.investmentInterest || '',
        role: profile.role || 'startup',
      });
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      // Convert fundingNeeded to a number if it exists
      const numericFunding = formData.fundingNeeded ? parseFloat(formData.fundingNeeded) : 0;
      
      await updateDoc(doc(db, 'users', user.uid), {
        name: formData.name,
        company: formData.company,
        bio: formData.bio,
        role: formData.role,
        fundingNeeded: numericFunding,
        investmentInterest: formData.investmentInterest,
        updatedAt: new Date(),
      });
      
      await refreshProfile();
      toast({ title: "Profile updated!", description: "Your changes have been saved successfully." });
      router.push('/dashboard');
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Error saving profile", 
        description: error.message || "Failed to update profile." 
      });
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
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <Badge variant="outline" className="px-3 py-1 capitalize border-primary/20 text-primary font-bold bg-primary/5">
            {formData.role} Account
          </Badge>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-6">
            <Card className="border-none shadow-sm text-center p-6 bg-white overflow-hidden">
              <div className="relative inline-block mx-auto mb-4 mt-2">
                <div className="w-32 h-32 bg-primary/5 rounded-3xl flex items-center justify-center border-2 border-primary/10 shadow-inner group">
                  <User className="text-primary w-16 h-16 group-hover:scale-110 transition-transform" />
                </div>
                <Button size="icon" variant="secondary" className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 shadow-md border bg-white">
                  <Camera className="w-4 h-4 text-primary" />
                </Button>
              </div>
              <h2 className="text-xl font-bold line-clamp-1">{formData.name || 'Set your name'}</h2>
              <p className="text-xs text-muted-foreground mb-4 break-all">{user.email}</p>
              
              <div className="flex flex-col gap-3 py-4 border-t border-dashed">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                  <Briefcase className="w-3.5 h-3.5 text-primary/60" />
                  <span className="truncate">{formData.company || 'No Company Set'}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                  <Shield className="w-3.5 h-3.5 text-primary/60" />
                  <span>Verified Identity</span>
                </div>
              </div>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <div className="bg-primary/5 border-b p-8">
                <CardTitle className="text-2xl font-bold">Profile Settings</CardTitle>
                <CardDescription>Manage your professional identity and role on the platform.</CardDescription>
              </div>
              <CardContent className="p-8">
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-semibold">Display Name</Label>
                      <Input 
                        id="name" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="e.g. Jane Smith"
                        className="h-11 focus-visible:ring-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-sm font-semibold">Organization Name</Label>
                      <Input 
                        id="company" 
                        value={formData.company}
                        onChange={(e) => setFormData({...formData, company: e.target.value})}
                        placeholder="e.g. Acme Ventures"
                        className="h-11 focus-visible:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-sm font-semibold">Your Role</Label>
                    <Select 
                      value={formData.role} 
                      onValueChange={(val) => setFormData({...formData, role: val as 'investor' | 'startup'})}
                    >
                      <SelectTrigger className="h-11 focus-visible:ring-primary">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="startup">Startup Founder</SelectItem>
                        <SelectItem value="investor">Strategic Investor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-sm font-semibold">Professional Bio</Label>
                    <Textarea 
                      id="bio" 
                      className="min-h-[140px] resize-none focus-visible:ring-primary"
                      value={formData.bio}
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                      placeholder="Briefly describe your background, expertise, or startup vision..."
                    />
                  </div>

                  {formData.role === 'startup' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                      <Label htmlFor="fundingNeeded" className="text-sm font-semibold">Current Funding Goal ($)</Label>
                      <Input 
                        id="fundingNeeded" 
                        type="number"
                        value={formData.fundingNeeded}
                        onChange={(e) => setFormData({...formData, fundingNeeded: e.target.value})}
                        placeholder="e.g. 1500000"
                        className="h-11 font-mono focus-visible:ring-primary"
                      />
                    </div>
                  )}

                  {formData.role === 'investor' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                      <Label htmlFor="investmentInterest" className="text-sm font-semibold">Investment Interests (Keywords)</Label>
                      <Input 
                        id="investmentInterest" 
                        value={formData.investmentInterest}
                        onChange={(e) => setFormData({...formData, investmentInterest: e.target.value})}
                        placeholder="e.g. SaaS, Fintech, AI, Web3"
                        className="h-11 focus-visible:ring-primary"
                      />
                    </div>
                  )}

                  <div className="pt-4">
                    <Button type="submit" className="w-full h-12 shadow-md bg-primary hover:bg-primary/90 font-bold gap-2" disabled={saving}>
                      {saving ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5" />}
                      Save All Changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
