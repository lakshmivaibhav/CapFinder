"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useStorage, addDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, User, ArrowLeft, Trash2, ShieldCheck, Mail, Building, Sparkles, Camera, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Navbar } from '@/components/navbar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import Image from 'next/image';

export default function ProfilePage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const db = useFirestore();
  const storage = useStorage();
  const router = useRouter();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    bio: '',
    fundingNeeded: '',
    investmentInterest: '',
    role: '',
    photoURL: '',
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
        photoURL: profile.photoURL || '',
      });
    }
  }, [profile]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({ variant: "destructive", title: "Invalid file", description: "Please select an image file." });
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `profiles/${user.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: downloadURL,
        updatedAt: serverTimestamp(),
      });
      
      setFormData(prev => ({ ...prev, photoURL: downloadURL }));
      await refreshProfile();
      toast({ title: "Photo Updated", description: "Your profile picture has been successfully synchronized." });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload profile picture. Check your connection." });
    } finally {
      setUploading(false);
    }
  };

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
      toast({ title: "Profile synchronization complete", description: "All changes are now live across the marketplace." });
    } catch (error) {
      toast({ variant: "destructive", title: "Persistence Error", description: "Unable to save profile changes." });
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

      const [interestsSnap, requestsSnap] = await Promise.all([getDocs(interestsQuery), getDocs(requestsQuery)]);

      if (!interestsSnap.empty || !requestsSnap.empty) {
        toast({
          variant: "destructive",
          title: "Active Connections Detected",
          description: "All interests and connections must be resolved before requesting account deletion."
        });
        setChecking(false);
        return;
      }

      if (confirm("Confirm account deletion request? An administrator will review and finalize the purge.")) {
        addDocumentNonBlocking(collection(db, 'deleteRequests'), {
          userId: user.uid,
          targetType: 'account',
          targetId: user.uid,
          status: 'pending',
          timestamp: serverTimestamp(),
          details: `Account deletion request: ${user.email}`
        });
        toast({ title: "Purge Request Filed", description: "Administrative review initiated." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Operational Error", description: "Verification check failed." });
    } finally {
      setChecking(false);
    }
  };

  if (authLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto w-12 h-12 text-primary opacity-20" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="max-w-6xl mx-auto py-16 px-6 w-full space-y-12">
        <div className="flex items-center justify-between border-b pb-10">
          <div className="space-y-2">
            <Link href="/dashboard" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-4 group">
              <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-all">
                <ArrowLeft className="w-4 h-4" />
              </div>
              Back to Console
            </Link>
            <h1 className="text-4xl font-black tracking-tighter">Account Governance</h1>
          </div>
          <Badge className="bg-primary/10 text-primary border-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
            {formData.role} verified
          </Badge>
        </div>

        <div className="grid md:grid-cols-12 gap-12">
          <div className="md:col-span-4 space-y-8">
            <Card className="border-none shadow-2xl text-center p-10 bg-white rounded-[2.5rem] overflow-hidden relative group">
              <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
              
              <div className="relative inline-block mx-auto mb-8 mt-4 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-40 h-40 bg-muted rounded-[2rem] flex items-center justify-center border-4 border-white shadow-inner relative overflow-hidden">
                  {formData.photoURL ? (
                    <Image src={formData.photoURL} alt="Profile" fill className="object-cover" />
                  ) : (
                    <User className="text-muted-foreground opacity-30 w-16 h-16" />
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="animate-spin text-white w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Camera className="text-white w-8 h-8" />
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-2xl border-4 border-white shadow-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handlePhotoUpload} 
                />
              </div>

              <h2 className="text-2xl font-black truncate mb-1">{formData.name || 'Anonymous User'}</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-10">{user.email}</p>
              
              <div className="pt-8 mt-8 border-t border-dashed">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-destructive hover:bg-destructive/5 gap-3 rounded-xl h-12 font-black uppercase tracking-widest text-[9px] border-2 border-transparent hover:border-destructive/20"
                  onClick={handleRequestAccountDeletion}
                  disabled={checking}
                >
                  {checking ? <Loader2 className="animate-spin w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                  Request Account Purge
                </Button>
              </div>
            </Card>

            <Card className="border-none shadow-xl bg-accent text-white rounded-[2rem] p-10 relative overflow-hidden">
               <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
               <h3 className="text-xl font-black mb-4 flex items-center gap-3">
                 <ShieldCheck className="w-6 h-6" /> Data Protection
               </h3>
               <p className="text-sm opacity-90 leading-relaxed font-medium italic">
                 "All account information is encrypted and managed according to global financial transparency standards."
               </p>
            </Card>
          </div>

          <div className="md:col-span-8 space-y-8">
            <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-muted/30 border-b p-10">
                <CardTitle className="text-2xl font-black">Professional Presence</CardTitle>
                <CardDescription className="text-sm font-medium">Update your public credentials and venture interest.</CardDescription>
              </CardHeader>
              <CardContent className="p-10">
                <form onSubmit={handleSave} className="space-y-8">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" /> Full Legal Name
                      </Label>
                      <Input id="name" className="h-14 rounded-2xl border-none shadow-inner bg-muted/30 focus:ring-2 focus:ring-primary/20 text-lg font-medium" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="company" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Building className="w-4 h-4 text-primary" /> Company / Institution
                      </Label>
                      <Input id="company" className="h-14 rounded-2xl border-none shadow-inner bg-muted/30 focus:ring-2 focus:ring-primary/20 text-lg font-medium" value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="bio" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary" /> Professional Biography
                    </Label>
                    <Textarea id="bio" className="min-h-[160px] rounded-2xl border-none shadow-inner bg-muted/30 focus:ring-2 focus:ring-primary/20 text-lg font-medium leading-relaxed italic p-6" value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} />
                  </div>

                  {formData.role === 'investor' ? (
                    <div className="space-y-3">
                      <Label htmlFor="investmentInterest" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-accent" /> Strategic Focus (Comma Separated)
                      </Label>
                      <Input id="investmentInterest" className="h-14 rounded-2xl border-none shadow-inner bg-muted/30 focus:ring-2 focus:ring-accent/20 text-lg font-medium" value={formData.investmentInterest} onChange={(e) => setFormData({...formData, investmentInterest: e.target.value})} placeholder="e.g. AI, Fintech, SaaS" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Label htmlFor="fundingNeeded" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Save className="w-4 h-4 text-emerald-500" /> Capital Requirements ($)
                      </Label>
                      <Input id="fundingNeeded" type="number" className="h-14 rounded-2xl border-none shadow-inner bg-muted/30 focus:ring-2 focus:ring-emerald-500/20 text-lg font-black" value={formData.fundingNeeded} onChange={(e) => setFormData({...formData, fundingNeeded: e.target.value})} />
                    </div>
                  )}

                  <Button type="submit" className="w-full h-16 bg-primary shadow-xl shadow-primary/20 rounded-2xl font-black text-xl gap-3 transition-all hover:scale-[1.01]" disabled={saving}>
                    {saving ? <Loader2 className="animate-spin" /> : <Save className="w-6 h-6" />}
                    Synchronize Changes
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
