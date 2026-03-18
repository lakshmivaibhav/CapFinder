
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, collection, serverTimestamp, query, where, limit, orderBy } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, User, ArrowLeft, Trash2, History, Clock, Activity, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Navbar } from '@/components/navbar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';

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

  // Route protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  /**
   * SAFE LOG QUERY: Strictly wait for verified profile AND include userId filter.
   * This ensures that the query matches the identity-based read rule for non-administrative list operations.
   */
  const myLogsQuery = useMemoFirebase(() => {
    if (!user || !profile || profile.disabled === true) return null;
    return query(
      collection(db, 'logs'), 
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
  }, [db, user, profile]);
  
  const { data: myLogs, isLoading: loadingLogs } = useCollection(myLogsQuery);

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
      toast({ title: "Profile updated!" });
      router.push('/dashboard');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error saving profile" });
    } finally {
      setSaving(false);
    }
  };

  const handleRequestAccountDeletion = async () => {
    if (!user) return;
    setChecking(true);
    try {
      if (confirm("Request account deletion? An administrator will review your request.")) {
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

        toast({ title: "Deletion Request Sent" });
      }
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
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
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
              <h2 className="text-xl font-bold line-clamp-1">{formData.name || 'Set your name'}</h2>
              <p className="text-xs text-muted-foreground mb-4 break-all">{user.email}</p>
              
              <div className="pt-4 mt-4 border-t border-dashed">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-destructive hover:bg-red-50"
                  onClick={handleRequestAccountDeletion}
                  disabled={checking}
                >
                  {checking ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  Delete Account
                </Button>
              </div>
            </Card>
          </div>

          <div className="md:col-span-8 space-y-8">
            <Tabs defaultValue="settings" className="space-y-6">
              <TabsList className="bg-muted/50 p-1">
                <TabsTrigger value="settings" className="px-6 py-2 gap-2">
                  <User className="w-4 h-4" /> Settings
                </TabsTrigger>
                <TabsTrigger value="activity" className="px-6 py-2 gap-2">
                  <History className="w-4 h-4" /> Activity
                </TabsTrigger>
              </TabsList>

              <TabsContent value="settings" className="space-y-8">
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                  <CardHeader className="bg-primary/5 border-b p-8">
                    <CardTitle className="text-2xl font-bold">Profile Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8">
                    <form onSubmit={handleSave} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="name">Legal Name / Representative</Label>
                          <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company">Official Organization</Label>
                          <Input id="company" value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bio">Professional Bio</Label>
                        <Textarea id="bio" value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} />
                      </div>

                      <Button type="submit" className="w-full h-12 bg-primary font-bold gap-2" disabled={saving}>
                        {saving ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5" />}
                        Sync Profile Changes
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity">
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                  <CardHeader className="bg-primary/5 border-b p-8">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className="w-5 h-5 text-primary" />
                      <CardTitle className="text-xl font-bold">Activity History</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loadingLogs ? (
                      <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
                    ) : myLogs && myLogs.length > 0 ? (
                      <div className="divide-y">
                        {myLogs.map((log) => (
                          <div key={log.id} className="p-6 hover:bg-muted/10 transition-colors flex gap-4 items-start">
                            <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center shrink-0">
                              {log.action.includes('pitch') ? <FileText className="w-4 h-4 text-primary" /> : <Activity className="w-4 h-4 text-muted-foreground" />}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <Badge variant="outline" className="text-[10px] uppercase font-bold">
                                  {log.action.replace('_', ' ')}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'MMM d, HH:mm') : 'Just now'}
                                </span>
                              </div>
                              <p className="text-sm text-foreground/80">{log.details}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-20 text-center"><p className="text-sm text-muted-foreground">No activity yet.</p></div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
