
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, User, ArrowLeft, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Navbar } from '@/components/navbar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    bio: '',
    fundingNeeded: '',
    investmentInterest: '',
    role: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

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
      await updateDoc(doc(db, 'users', user.uid), {
        name: formData.name,
        company: formData.company,
        bio: formData.bio,
        fundingNeeded: numericFunding,
        investmentInterest: formData.investmentInterest,
        updatedAt: serverTimestamp(),
      });
      await refreshProfile();
      toast({ title: "Profile updated!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error saving profile" });
    } finally {
      setSaving(false);
    }
  };

  const handleRequestAccountDeletion = async () => {
    if (!user || !profile) return;
    setChecking(true);
    try {
      const isInvestor = profile.role === 'investor';
      
      const interestsQuery = isInvestor 
        ? query(collection(db, 'interests'), where('investorId', '==', user.uid))
        : query(collection(db, 'interests'), where('startupOwnerId', '==', user.uid));
      
      const requestsQuery = isInvestor
        ? query(collection(db, 'contactRequests'), where('senderId', '==', user.uid))
        : query(collection(db, 'contactRequests'), where('receiverId', '==', user.uid));

      const [interestsSnap, requestsSnap] = await Promise.all([
        getDocs(interestsQuery),
        getDocs(requestsQuery)
      ]);

      if (!interestsSnap.empty || !requestsSnap.empty) {
        toast({
          variant: "destructive",
          title: "Deletion Blocked",
          description: "You have active connections. We've notified your partners to resolve these first."
        });

        const snaps = [...interestsSnap.docs, ...requestsSnap.docs];
        snaps.forEach(d => {
          const data = d.data();
          const targetId = isInvestor 
            ? (data.startupOwnerId || data.receiverId)
            : (data.investorId || data.senderId);
          
          if (targetId) {
            addDocumentNonBlocking(collection(db, 'notifications'), {
              userId: targetId,
              type: 'system',
              text: `A partner you are connected with (${user.email}) has requested account deletion. Please resolve your active connections.`,
              read: false,
              timestamp: serverTimestamp(),
            });
          }
        });

        setChecking(false);
        return;
      }

      if (confirm("Request account deletion? An administrator will review your request.")) {
        addDocumentNonBlocking(doc(db, 'deleteRequests', `${user.uid}_delete`), {
          userId: user.uid,
          targetType: 'account',
          targetId: user.uid,
          status: 'pending',
          timestamp: serverTimestamp(),
          details: `User requested account deletion: ${user.email}`
        });
        toast({ title: "Deletion Request Sent" });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not verify account status." });
    } finally {
      setChecking(false);
    }
  };

  if (authLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto w-10 h-10 text-primary" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="max-w-5xl mx-auto py-12 px-6 w-full space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary font-medium">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <Badge variant="outline" className="px-3 py-1 capitalize border-primary/20 text-primary font-bold">
            {formData.role} Account
          </Badge>
        </div>

        <div className="grid md:grid-cols-12 gap-8">
          <div className="md:col-span-4 space-y-6">
            <Card className="border-none shadow-sm text-center p-6 bg-white overflow-hidden">
              <div className="relative inline-block mx-auto mb-4 mt-2">
                <div className="w-32 h-32 bg-primary/5 rounded-3xl flex items-center justify-center border-2 border-primary/10">
                  <User className="text-primary w-16 h-16" />
                </div>
              </div>
              <h2 className="text-xl font-bold truncate">{formData.name || 'Anonymous User'}</h2>
              <p className="text-xs text-muted-foreground mb-4 truncate">{user.email}</p>
              
              <div className="pt-4 mt-4 border-t border-dashed">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-destructive hover:bg-red-50 gap-2"
                  onClick={handleRequestAccountDeletion}
                  disabled={checking}
                >
                  {checking ? <Loader2 className="animate-spin w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                  Request Account Deletion
                </Button>
              </div>
            </Card>
          </div>

          <div className="md:col-span-8 space-y-8">
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-primary/5 border-b p-8">
                <CardTitle className="text-2xl font-bold">Account Settings</CardTitle>
                <CardDescription>Update your professional presence on CapFinder.</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Display Name</Label>
                      <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company / Group</Label>
                      <Input id="company" value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Professional Summary</Label>
                    <Textarea id="bio" value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} className="min-h-[120px]" />
                  </div>
                  <Button type="submit" className="w-full h-12 bg-primary font-bold gap-2" disabled={saving}>
                    {saving ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5" />}
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
