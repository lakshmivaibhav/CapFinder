
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, collection, serverTimestamp, getDocs, query, where, or, limit, orderBy } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, User, ArrowLeft, Camera, Briefcase, Mail, Shield, ShieldCheck, Trash2, Megaphone, AlertTriangle, History, Clock, Activity, FileText } from 'lucide-react';
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
  const [checkingPitch, setCheckingPitch] = useState<string | null>(null);
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

  // Fetch user's pitches for deletion management
  const myPitchesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, 'pitches'), where('ownerId', '==', user.uid));
  }, [db, user]);
  const { data: myPitches, isLoading: loadingPitches } = useCollection(myPitchesQuery);

  // Fetch user's personal logs for Activity History
  const myLogsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, 'logs'), 
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
  }, [db, user]);
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

  const handleRequestAccountDeletion = async () => {
    if (!user) return;
    
    setChecking(true);
    try {
      // Check for active messages
      const messagesSnap = await getDocs(query(
        collection(db, 'messages'),
        or(where('senderId', '==', user.uid), where('receiverId', '==', user.uid)),
        limit(1)
      ));
      
      if (!messagesSnap.empty) {
        toast({
          variant: "destructive",
          title: "Cannot Request Deletion",
          description: "You have active message threads. Please resolve them first."
        });
        setChecking(false);
        return;
      }

      // Check for pending/accepted contact requests
      const requestsSnap = await getDocs(query(
        collection(db, 'contactRequests'),
        or(where('senderId', '==', user.uid), where('receiverId', '==', user.uid)),
        limit(1)
      ));

      if (!requestsSnap.empty) {
        toast({
          variant: "destructive",
          title: "Cannot Request Deletion",
          description: "You have active contact requests or introductions in progress."
        });
        setChecking(false);
        return;
      }

      // Check for interests
      const interestsSnap = await getDocs(query(
        collection(db, 'interests'),
        or(where('investorId', '==', user.uid), where('startupOwnerId', '==', user.uid)),
        limit(1)
      ));

      if (!interestsSnap.empty) {
        toast({
          variant: "destructive",
          title: "Cannot Request Deletion",
          description: "You have registered interests or leads linked to your account."
        });
        setChecking(false);
        return;
      }

      if (confirm("Are you sure you want to request account deletion? An administrator will review your request. This action cannot be undone.")) {
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
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Check Failed",
        description: "Could not verify account status. Please try again."
      });
    } finally {
      setChecking(false);
    }
  };

  const handleRequestPitchDeletion = async (pitchId: string, pitchName: string) => {
    if (!user) return;
    
    setCheckingPitch(pitchId);
    try {
      const interestsSnap = await getDocs(query(collection(db, 'interests'), where('pitchId', '==', pitchId), limit(1)));
      if (!interestsSnap.empty) {
        toast({
          variant: "destructive",
          title: "Cannot Delete Pitch",
          description: "There are investors currently interested in this pitch. Please resolve these leads first."
        });
        setCheckingPitch(null);
        return;
      }

      const requestsSnap = await getDocs(query(collection(db, 'contactRequests'), where('pitchId', '==', pitchId), limit(1)));
      if (!requestsSnap.empty) {
        toast({
          variant: "destructive",
          title: "Cannot Delete Pitch",
          description: "There are active introduction requests for this pitch."
        });
        setCheckingPitch(null);
        return;
      }

      const messagesSnap = await getDocs(query(collection(db, 'messages'), where('pitchId', '==', pitchId), limit(1)));
      if (!messagesSnap.empty) {
        toast({
          variant: "destructive",
          title: "Cannot Delete Pitch",
          description: "There are active message threads linked to this pitch."
        });
        setCheckingPitch(null);
        return;
      }

      if (confirm(`Are you sure you want to request deletion of the pitch "${pitchName}"? An administrator will review your request.`)) {
        addDocumentNonBlocking(collection(db, 'deleteRequests'), {
          userId: user.uid,
          targetType: 'pitch',
          targetId: pitchId,
          status: 'pending',
          timestamp: serverTimestamp(),
          details: `Startup owner requested deletion of pitch: ${pitchName}`
        });
        
        addDocumentNonBlocking(collection(db, 'logs'), {
          userId: user.uid,
          action: 'delete_request_created',
          targetId: pitchId,
          timestamp: serverTimestamp(),
          details: `Deletion request submitted for pitch ${pitchName}`
        });

        toast({ title: "Deletion Request Sent", description: "Administrators have been notified." });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Check Failed",
        description: "Could not verify pitch status. Please try again."
      });
    } finally {
      setCheckingPitch(null);
    }
  };

  if (authLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto w-10 h-10 text-primary" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="max-w-5xl mx-auto py-12 px-6 w-full space-y-8">
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

        <div className="grid md:grid-cols-12 gap-8">
          {/* Sidebar / Identity Card */}
          <div className="md:col-span-4 space-y-6">
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
                  disabled={checking}
                >
                  {checking ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  Delete Account
                </Button>
                <p className="text-[10px] text-muted-foreground mt-2 italic">Requests account removal.</p>
              </div>
            </Card>

            <Card className="border-none shadow-sm bg-primary/5 p-6 border-l-4 border-l-primary">
              <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Role Notice
              </h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                Professional roles are locked to preserve ecosystem trust. 
              </p>
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

                {profile?.role === 'startup' && (
                  <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                      <div className="flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-primary" />
                        <CardTitle className="text-xl font-bold">My Active Pitches</CardTitle>
                      </div>
                      <CardDescription>Manage your investment proposals and content removal.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 pb-8 pt-2">
                      {loadingPitches ? (
                        <div className="flex justify-center py-6"><Loader2 className="animate-spin w-6 h-6 text-primary" /></div>
                      ) : myPitches && myPitches.length > 0 ? (
                        <div className="space-y-4">
                          {myPitches.map((pitch) => (
                            <div key={pitch.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-primary/5 hover:border-primary/20 transition-all">
                              <div className="min-w-0 flex-1 mr-4">
                                <h4 className="font-bold text-sm truncate">{pitch.startupName}</h4>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">{pitch.industry}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Link href={`/pitches/${pitch.id}`}>
                                  <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-bold">View</Button>
                                </Link>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 text-[10px] uppercase font-bold text-destructive hover:bg-red-50"
                                  onClick={() => handleRequestPitchDeletion(pitch.id, pitch.startupName)}
                                  disabled={checkingPitch === pitch.id}
                                >
                                  {checkingPitch === pitch.id ? <Loader2 className="animate-spin w-3 h-3 mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
                                  Delete Pitch
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-10 bg-muted/5 rounded-2xl border-2 border-dashed">
                          <AlertTriangle className="w-8 h-8 text-muted-foreground opacity-20 mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground font-medium">No active pitches found.</p>
                          <Link href="/pitches/new">
                            <Button variant="link" size="sm">Create your first pitch</Button>
                          </Link>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="activity">
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                  <CardHeader className="bg-primary/5 border-b p-8">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className="w-5 h-5 text-primary" />
                      <CardTitle className="text-xl font-bold">Activity History</CardTitle>
                    </div>
                    <CardDescription>
                      Review your recent professional actions and system interactions.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loadingLogs ? (
                      <div className="flex justify-center p-12">
                        <Loader2 className="animate-spin w-8 h-8 text-primary" />
                      </div>
                    ) : myLogs && myLogs.length > 0 ? (
                      <div className="divide-y">
                        {myLogs.map((log) => (
                          <div key={log.id} className="p-6 hover:bg-muted/10 transition-colors flex gap-4 items-start">
                            <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center shrink-0">
                              {log.action.includes('pitch') ? <FileText className="w-4 h-4 text-primary" /> : <Activity className="w-4 h-4 text-muted-foreground" />}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <Badge variant="outline" className="text-[10px] uppercase font-bold bg-white text-foreground/70">
                                  {log.action.replace('_', ' ')}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'MMM d, yyyy HH:mm') : 'Just now'}
                                </span>
                              </div>
                              <p className="text-sm text-foreground/80 leading-relaxed">
                                {log.details}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto opacity-40">
                          <History className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h4 className="font-bold text-foreground/70">No activity yet</h4>
                        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                          As you interact with the platform, your professional history will be documented here.
                        </p>
                      </div>
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
