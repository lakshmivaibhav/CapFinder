
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
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
  const { user, profile, loading: authLoading, refreshProfile, emailVerified } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [checking, setChecking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    bio: '',
    fundingNeeded: '',
    investmentInterest: '',
    role: '',
    photoURL: '',
    logoURL: '',
    verified: false,
  });

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (!emailVerified) {
        router.push('/verify-email');
      }
    }
  }, [user, emailVerified, authLoading, router]);

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        name: profile.name || '',
        company: profile.company || '',
        bio: profile.bio || '',
        fundingNeeded: profile.fundingNeeded?.toString() || '',
        investmentInterest: profile.investmentInterest || '',
        role: profile.role || 'startup',
        photoURL: profile.photoURL || prev.photoURL || '',
        logoURL: profile.logoURL || '',
        verified: !!profile.verified,
      }));
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
      const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dfp3ydcli/image/upload";
      const UPLOAD_PRESET = "profile_upload";

      const formDataCloudinary = new FormData();
      formDataCloudinary.append('file', file);
      formDataCloudinary.append('upload_preset', UPLOAD_PRESET);

      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: formDataCloudinary,
      });

      if (!response.ok) {
        throw new Error('Cloudinary upload failed');
      }

      const data = await response.json();
      const secureURL = data.secure_url;

      updateDocumentNonBlocking(doc(db, 'users', user.uid), {
        photoURL: secureURL,
        updatedAt: serverTimestamp(),
      });
      
      setFormData(prev => ({ ...prev, photoURL: secureURL }));
      await refreshProfile();
      toast({ title: "Photo Updated", description: "Your profile picture has been synchronized." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload profile picture." });
    } finally {
      setUploading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({ variant: "destructive", title: "Invalid file", description: "Please select an image file." });
      return;
    }

    setUploadingLogo(true);
    try {
      const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dfp3ydcli/image/upload";
      const UPLOAD_PRESET = "profile_upload";

      const formDataCloudinary = new FormData();
      formDataCloudinary.append('file', file);
      formDataCloudinary.append('upload_preset', UPLOAD_PRESET);

      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: formDataCloudinary,
      });

      if (!response.ok) throw new Error('Logo upload failed');

      const data = await response.json();
      const secureURL = data.secure_url;

      updateDocumentNonBlocking(doc(db, 'users', user.uid), {
        logoURL: secureURL,
        updatedAt: serverTimestamp(),
      });
      
      setFormData(prev => ({ ...prev, logoURL: secureURL }));
      await refreshProfile();
      toast({ title: "Corporate Logo Updated", description: "Venture identity assets have been synchronized." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload startup logo." });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const numericFunding = formData.fundingNeeded ? parseFloat(formData.fundingNeeded) : 0;
      updateDocumentNonBlocking(doc(db, 'users', user.uid), {
        name: formData.name,
        company: formData.company,
        bio: formData.bio,
        fundingNeeded: numericFunding,
        investmentInterest: formData.investmentInterest,
        updatedAt: serverTimestamp(),
      });
      await refreshProfile();
      toast({ title: "Profile synchronization complete", description: "All changes are now live." });
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

  if (authLoading || (user && !emailVerified)) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto w-12 h-12 text-primary opacity-20" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="max-w-6xl mx-auto py-16 px-6 w-full space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b pb-10">
          <div className="space-y-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors mb-2 group">
              <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-all">
                <ArrowLeft className="w-3.5 h-3.5" />
              </div>
              Return to Console
            </Link>
            <h1 className="text-5xl font-black tracking-tighter leading-none">Account Governance</h1>
            <p className="text-muted-foreground text-lg font-medium italic border-l-4 border-primary/20 pl-6">Establish and maintain your professional identity within the network.</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge className="bg-primary/5 text-primary border-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
              {formData.role} Profile
            </Badge>
            {formData.verified && (
              <Badge className="bg-emerald-500 text-white border-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                <ShieldCheck className="w-4 h-4" /> Platform Verified
              </Badge>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-12 gap-12">
          <div className="md:col-span-4 space-y-10">
            <Card className="border-none shadow-3xl text-center p-12 bg-white rounded-[3rem] overflow-hidden relative group transition-all hover:shadow-primary/5">
              <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
              
              <div className="relative inline-block mx-auto mb-10 mt-4 cursor-pointer group/avatar" onClick={() => fileInputRef.current?.click()}>
                <div className="w-44 h-44 bg-muted/30 rounded-[2.5rem] flex items-center justify-center border-4 border-white shadow-2xl relative overflow-hidden transition-transform duration-500 group-hover/avatar:scale-105">
                  {formData.photoURL ? (
                    <Image 
                      src={formData.photoURL} 
                      alt="Profile" 
                      fill 
                      className="object-cover" 
                      priority
                      unoptimized
                    />
                  ) : (
                    <User className="text-muted-foreground opacity-20 w-20 h-20" />
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 backdrop-blur-sm">
                      <Loader2 className="animate-spin text-white w-10 h-10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover/avatar:bg-black/30 transition-all flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 backdrop-blur-[2px]">
                    <Camera className="text-white w-10 h-10 mb-2" />
                    <span className="text-[9px] text-white font-black uppercase tracking-widest">Update Photo</span>
                  </div>
                </div>
                {formData.verified && (
                  <div className="absolute -bottom-3 -right-3 bg-emerald-500 text-white p-3 rounded-2xl border-4 border-white shadow-xl z-20">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handlePhotoUpload} 
                />
              </div>

              <div className="space-y-1.5 mb-12">
                <h2 className="text-3xl font-black truncate tracking-tight">{formData.name || 'Incognito Member'}</h2>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">{user.email}</p>
              </div>
              
              <div className="pt-10 mt-10 border-t border-dashed space-y-8">
                {formData.role === 'startup' && (
                  <div className="space-y-5">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-3 justify-center">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" /> Corporate Identity
                    </Label>
                    <div 
                      className="relative w-32 h-32 mx-auto rounded-3xl border-4 border-dashed border-muted bg-muted/5 flex items-center justify-center cursor-pointer group/logo hover:border-primary/30 transition-all overflow-hidden"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {formData.logoURL ? (
                        <Image src={formData.logoURL} alt="Logo" fill className="object-contain p-4 transition-transform group-hover/logo:scale-110" unoptimized />
                      ) : (
                        <div className="text-center p-4">
                          {uploadingLogo ? <Loader2 className="w-8 h-8 animate-spin text-primary" /> : <Upload className="w-8 h-8 text-muted-foreground opacity-10" />}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-primary/0 group-hover/logo:bg-primary/5 transition-all" />
                      <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    </div>
                  </div>
                )}

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-destructive hover:bg-destructive/5 gap-3 rounded-2xl h-14 font-black uppercase tracking-widest text-[10px] border-2 border-transparent hover:border-destructive/10 transition-all active:scale-95"
                  onClick={handleRequestAccountDeletion}
                  disabled={checking}
                >
                  {checking ? <Loader2 className="animate-spin w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                  Initiate Account Purge
                </Button>
              </div>
            </Card>

            <Card className="border-none shadow-2xl bg-accent text-white rounded-[2.5rem] p-12 relative overflow-hidden group">
               <Sparkles className="absolute -right-10 -bottom-10 w-48 h-48 text-white/10 -rotate-12 transition-transform duration-700 group-hover:scale-110" />
               <h3 className="text-2xl font-black mb-6 flex items-center gap-4">
                 <ShieldCheck className="w-8 h-8" /> Security Standard
               </h3>
               <p className="text-sm opacity-90 leading-relaxed font-medium italic border-l-2 border-white/20 pl-6">
                 "Platform interactions are fully encrypted. All member data is governed by preliminary verification protocols to ensure network integrity."
               </p>
            </Card>
          </div>

          <div className="md:col-span-8 space-y-10">
            <Card className="border-none shadow-3xl bg-white rounded-[3rem] overflow-hidden transition-all">
              <CardHeader className="bg-muted/30 border-b p-12">
                <CardTitle className="text-3xl font-black tracking-tight">Professional Presence</CardTitle>
                <CardDescription className="text-md font-medium text-muted-foreground mt-2">Manage your institutional credentials and venture objectives.</CardDescription>
              </CardHeader>
              <CardContent className="p-12">
                <form onSubmit={handleSave} className="space-y-10">
                  <div className="grid md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-3">
                        <User className="w-4 h-4 text-primary" /> Verified Legal Name
                      </Label>
                      <Input 
                        id="name" 
                        className="h-16 rounded-2xl border-none shadow-inner bg-muted/30 focus:ring-4 focus:ring-primary/10 text-lg font-bold px-8" 
                        value={formData.name} 
                        onChange={(e) => setFormData({...formData, name: e.target.value})} 
                        placeholder="Legal Entity or Representative"
                      />
                    </div>
                    <div className="space-y-4">
                      <Label htmlFor="company" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-3">
                        <Building className="w-4 h-4 text-primary" /> Institution / Affiliation
                      </Label>
                      <Input 
                        id="company" 
                        className="h-16 rounded-2xl border-none shadow-inner bg-muted/30 focus:ring-4 focus:ring-primary/10 text-lg font-bold px-8" 
                        value={formData.company} 
                        onChange={(e) => setFormData({...formData, company: e.target.value})} 
                        placeholder="Venture Capital or Startup Group"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <Label htmlFor="bio" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-3">
                      <Mail className="w-4 h-4 text-primary" /> Professional Narrative
                    </Label>
                    <Textarea 
                      id="bio" 
                      className="min-h-[220px] rounded-[2rem] border-none shadow-inner bg-muted/30 focus:ring-4 focus:ring-primary/10 text-lg font-medium leading-relaxed italic p-10" 
                      value={formData.bio} 
                      onChange={(e) => setFormData({...formData, bio: e.target.value})} 
                      placeholder="Detail your professional background, track record, and strategic goals..."
                    />
                  </div>

                  {formData.role === 'investor' ? (
                    <div className="space-y-4">
                      <Label htmlFor="investmentInterest" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-3">
                        <Sparkles className="w-4 h-4 text-accent" /> Strategic Focus (Comma Separated)
                      </Label>
                      <Input 
                        id="investmentInterest" 
                        className="h-16 rounded-2xl border-none shadow-inner bg-muted/30 focus:ring-4 focus:ring-accent/10 text-lg font-bold px-8" 
                        value={formData.investmentInterest} 
                        onChange={(e) => setFormData({...formData, investmentInterest: e.target.value})} 
                        placeholder="e.g. Artificial Intelligence, Fintech, BioTech" 
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Label htmlFor="fundingNeeded" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-3">
                        <Save className="w-4 h-4 text-emerald-500" /> Capital Requirements (Total USD)
                      </Label>
                      <Input 
                        id="fundingNeeded" 
                        type="number" 
                        className="h-16 rounded-2xl border-none shadow-inner bg-muted/30 focus:ring-4 focus:ring-emerald-500/10 text-xl font-black px-8" 
                        value={formData.fundingNeeded} 
                        onChange={(e) => setFormData({...formData, fundingNeeded: e.target.value})} 
                        placeholder="e.g. 2500000"
                      />
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-20 bg-primary shadow-2xl shadow-primary/20 rounded-[1.5rem] font-black text-xl gap-4 transition-all hover:scale-[1.01] active:scale-95" 
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="animate-spin w-7 h-7" /> : <Save className="w-7 h-7" />}
                    Synchronize Profile Changes
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
