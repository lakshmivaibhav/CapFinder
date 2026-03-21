
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Send, Sparkles, ShieldAlert, Camera, Trash2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Image from 'next/image';
import { refineStartupPitch } from '@/ai/flows/startup-pitch-refinement-assistant';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORIES = [
  "AI",
  "Fintech",
  "SaaS",
  "Health",
  "EdTech",
  "Web3",
  "Ecommerce",
  "Robotics",
  "Gaming",
  "Other"
];

export default function NewPitchPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const db = useFirestore();
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [aiResult, setAiResult] = useState<{ refinedPitchDescription: string, suggestions: string[] } | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    startupName: '',
    description: '',
    fundingNeeded: '',
    category: '',
    contactEmail: '',
    imageURL: '',
  });

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && user && profile && profile.role !== 'startup' && profile.role !== 'admin') {
      toast({ 
        variant: "destructive", 
        title: "Access Denied", 
        description: "Only startup accounts can create investment pitches." 
      });
      router.push('/dashboard');
    }
  }, [user, profile, authLoading, router, toast]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ variant: "destructive", title: "Invalid format", description: "Please provide an image file." });
      return;
    }

    setUploadingImage(true);
    try {
      const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dfp3ydcli/image/upload";
      const UPLOAD_PRESET = "profile_upload";

      const formDataCloudinary = new FormData();
      formDataCloudinary.append('file', file);
      formDataCloudinary.append('upload_preset', UPLOAD_PRESET);

      const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formDataCloudinary });
      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setFormData(prev => ({ ...prev, imageURL: data.secure_url }));
      toast({ title: "Visual assets uploaded", description: "Venture image is now synchronized." });
    } catch (error) {
      toast({ variant: "destructive", title: "Upload failed", description: "Could not persist venture imagery." });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRefineWithAI = async () => {
    if (!formData.description) {
      toast({ variant: "destructive", title: "Missing description", description: "Please enter a description first." });
      return;
    }
    setRefining(true);
    try {
      const result = await refineStartupPitch({
        pitchDescription: formData.description,
        startupName: formData.startupName,
        industry: formData.category,
        fundingNeeded: formData.fundingNeeded
      });
      setAiResult(result);
      setShowAiModal(true);
    } catch (error) {
      toast({ variant: "destructive", title: "AI Assistant error", description: "Could not refine pitch at this time." });
    } finally {
      setRefining(false);
    }
  };

  const applyAiRefinement = () => {
    if (aiResult) {
      setFormData({ ...formData, description: aiResult.refinedPitchDescription });
      setShowAiModal(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (profile?.role !== 'startup' && profile?.role !== 'admin')) return;
    if (!formData.category) {
      toast({ variant: "destructive", title: "Selection Required", description: "Please select a venture category." });
      return;
    }
    setLoading(true);
    
    try {
      await addDocumentNonBlocking(collection(db, 'pitches'), {
        ...formData,
        fundingNeeded: Number(formData.fundingNeeded) || 0,
        ownerVerified: !!profile?.verified,
        industry: formData.category, 
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });

      toast({ title: "Venture Published", description: "Your pitch is now live in the global marketplace." });
      router.push('/dashboard');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Deployment failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-10 h-10 text-primary opacity-20" />
      </div>
    );
  }

  if (!user || (profile?.role !== 'startup' && profile?.role !== 'admin')) {
    return (
      <div className="p-20 text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-destructive mx-auto" />
        <h2 className="text-2xl font-black">Unauthorized Access</h2>
        <p className="text-muted-foreground">This session is restricted to startup profiles only.</p>
        <Link href="/dashboard">
          <Button variant="link" className="font-bold">Return to Console</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-16 px-6 space-y-10">
      <Link href="/dashboard" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors group">
        <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </div>
        Back to Console
      </Link>

      <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="bg-muted/30 border-b p-10">
          <CardTitle className="text-3xl font-black tracking-tight">Venture Establishment</CardTitle>
          <CardDescription className="text-sm font-medium">Define your strategic objectives to attract capital partners.</CardDescription>
        </CardHeader>
        <CardContent className="p-10">
          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Image Upload Zone */}
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" /> Primary Venture Identity (Image)
              </Label>
              <div 
                className="relative aspect-video rounded-[2rem] border-4 border-dashed border-muted bg-muted/10 flex flex-col items-center justify-center cursor-pointer group hover:border-primary/30 transition-all overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
              >
                {formData.imageURL ? (
                  <Image src={formData.imageURL} alt="Venture Preview" fill className="object-cover" unoptimized />
                ) : (
                  <div className="text-center p-10 space-y-4">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto text-muted-foreground group-hover:scale-110 group-hover:text-primary transition-all">
                      {uploadingImage ? <Loader2 className="w-8 h-8 animate-spin" /> : <ImageIcon className="w-8 h-8" />}
                    </div>
                    <div>
                      <p className="font-black text-sm uppercase tracking-widest">Select Visual Asset</p>
                      <p className="text-xs text-muted-foreground mt-1">Recommended: 16:9 high-resolution landscape</p>
                    </div>
                  </div>
                )}
                {formData.imageURL && !uploadingImage && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                    <Button variant="outline" size="sm" className="bg-white rounded-xl font-bold">Replace Visual</Button>
                  </div>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="startupName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Entity Name</Label>
                <Input 
                  id="startupName" 
                  required
                  className="h-14 rounded-2xl border-none shadow-inner bg-muted/30 focus:ring-2 focus:ring-primary/20 text-lg font-medium"
                  value={formData.startupName}
                  onChange={(e) => setFormData({...formData, startupName: e.target.value})}
                  placeholder="e.g. InnovateX Systems"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="category" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Venture Classification</Label>
                <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                  <SelectTrigger className="h-14 rounded-2xl border-none shadow-inner bg-muted/30 focus:ring-2 focus:ring-primary/20 font-bold px-6">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat} className="rounded-xl my-1">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center mb-1">
                <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Executive Overview</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="text-primary border-primary/20 hover:bg-primary/5 h-10 px-6 rounded-xl font-bold gap-2 shadow-sm"
                  onClick={handleRefineWithAI}
                  disabled={refining}
                >
                  {refining ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  Refine with AI
                </Button>
              </div>
              <Textarea 
                id="description" 
                required
                className="min-h-[220px] rounded-2xl border-none shadow-inner bg-muted/30 focus:ring-2 focus:ring-primary/20 text-lg font-medium leading-relaxed italic p-8"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Detail your problem, solution, market size, and strategic advantage..."
              />
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="fundingNeeded" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target Capital ($)</Label>
                <Input 
                  id="fundingNeeded" 
                  required
                  type="number"
                  className="h-14 rounded-2xl border-none shadow-inner bg-muted/30 focus:ring-2 focus:ring-primary/20 text-xl font-black"
                  value={formData.fundingNeeded}
                  onChange={(e) => setFormData({...formData, fundingNeeded: e.target.value})}
                  placeholder="e.g. 1000000"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="contactEmail" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Direct Inquiry Email</Label>
                <Input 
                  id="contactEmail" 
                  type="email"
                  required
                  className="h-14 rounded-2xl border-none shadow-inner bg-muted/30 focus:ring-2 focus:ring-primary/20 text-lg font-medium"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                  placeholder="founder@entity.com"
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-16 bg-primary shadow-xl shadow-primary/20 rounded-2xl font-black text-xl gap-3 transition-all hover:scale-[1.01]" disabled={loading || uploadingImage}>
              {loading ? <Loader2 className="animate-spin w-6 h-6" /> : <Send className="w-6 h-6" />}
              Publish Strategic Pitch
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog open={showAiModal} onOpenChange={setShowAiModal}>
        <DialogContent className="max-w-2xl border-none shadow-2xl rounded-[2.5rem] p-10">
          <DialogHeader className="space-y-4">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Sparkles className="text-primary w-7 h-7" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight">AI-Refined Synthesis</DialogTitle>
            <DialogDescription className="text-md font-medium leading-relaxed">
              Our analyzer has optimized your overview for maximum professional impact.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-8 py-6">
            <div className="p-8 bg-muted/30 rounded-3xl border-l-8 border-primary italic text-lg leading-relaxed shadow-inner">
              "{aiResult?.refinedPitchDescription}"
            </div>
            {aiResult?.suggestions && aiResult.suggestions.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Strategic Suggestions:</h4>
                <div className="grid gap-3">
                  {aiResult.suggestions.map((s, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 bg-muted/10 rounded-xl border">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-4">
            <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-xs" onClick={() => setShowAiModal(false)}>Discard</Button>
            <Button className="flex-1 h-14 bg-primary rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg" onClick={applyAiRefinement}>Apply Optimization</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
