
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, User, ArrowLeft, Camera, Briefcase, Mail, Shield, ShieldCheck, Trash2 } from 'lucide-react';
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
      const numericFunding = formData.fundingNeeded ? parseFloat(formData.fundingNeeded) : 0;
      
      const updateData = {
        name: formData.name,
        company: formData.company,
        bio: formData.bio,
        fundingNeeded: numericFunding,
        investmentInterest: formData.investmentInterest,
        updatedAt: new Date(),
      };
      
      await updateDoc(doc(db, 'users', user.uid), updateData);
      
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

  const handleRequestAccountDeletion = () => {
    if (!user) return;
    if (confirm("Are you sure you want to request account deletion? An administrator will review your request and contact you. This action cannot be undone.")) {
      addDocumentNonBlocking(collection(db, 'deleteRequests'), {
        userId: user.uid,
        targetType: 'account',
        targetId: user.uid,
        status: 'pending',
        timestamp: serverTimestamp(),
        details: `User requested account deletion: ${user.email}`
      });

      addDocumentNonBlocking(collection(db, 'logs'), {
        userId: user.uid,
        action: 'delete_request_created',
        targetId: user.uid,
        timestamp: serverTimestamp(),
        details: `Account deletion request submitted for ${user.email}`
      });

      toast({ title: "Deletion Request Sent", description: "Administrators have been notified." });
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
          <div className="flex items-center gap-2">
            {profile?.role === 'admin' && <Badge className="bg-destructive text-white border-none px-3 py-1 uppercase text-[10px]">Admin Access</Badge>}
            <Badge variant="outline" className="px-3 py-1 capitalize border-primary/20 text-primary font-bold bg-primary/5">
              {formData.role} Account
            </Badge>
          </div>
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
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Verified Identity</span>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-dashed">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-destructive hover:bg-red-50 hover:text-red-700 font-medium"
                  onClick={handleRequestAccountDeletion}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Request Account Deletion
                </Button>
              </div>
            </Card>

            <Card className="border-none shadow-sm bg-primary/5 p-6 border-l-4 border-l-primary">
              <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Role Security
              </h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                Professional roles are established during registration and are locked to preserve ecosystem trust. Contact support for role reassignment.
              </p>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <div className="bg-primary/5 border-b p-8">
                <CardTitle className="text-2xl font-bold">Profile Settings</CardTitle>
                <CardDescription>Update your public identity and professional credentials.</CardDescription>
              </div>
              <CardContent className="p-8">
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-semibold">Legal Name / Representative</Label>
                      <Input 
                        id="name" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="e.g. Jane Smith"
                        className="h-11 focus-visible:ring-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-sm font-semibold">Official Organization</Label>
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
                    <Label className="text-sm font-semibold">Professional Role</Label>
                    <div className="h-11 flex items-center px-4 border rounded-md bg-muted/30 text-muted-foreground capitalize font-bold text-xs tracking-wide">
                      {formData.role}
                    </div>
                    <p className="text-[10px] text-muted-foreground italic px-1">Role management is handled by system administrators.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-sm font-semibold">Professional Bio</Label>
                    <Textarea 
                      id="bio" 
                      className="min-h-[140px] resize-none focus-visible:ring-primary leading-relaxed"
                      value={formData.bio}
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                      placeholder="Share your expertise, startup vision, or investment philosophy..."
                    />
                  </div>

                  {formData.role === 'startup' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                      <Label htmlFor="fundingNeeded" className="text-sm font-semibold">Current Round Goal ($)</Label>
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
                      <Label htmlFor="investmentInterest" className="text-sm font-semibold">Target Industries (Keywords)</Label>
                      <Input 
                        id="investmentInterest" 
                        value={formData.investmentInterest}
                        onChange={(e) => setFormData({...formData, investmentInterest: e.target.value})}
                        placeholder="e.g. SaaS, Fintech, Healthcare"
                        className="h-11 focus-visible:ring-primary"
                      />
                    </div>
                  )}

                  <div className="pt-4">
                    <Button type="submit" className="w-full h-12 shadow-md bg-primary hover:bg-primary/90 font-bold gap-2" disabled={saving}>
                      {saving ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5" />}
                      Sync Profile Changes
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
