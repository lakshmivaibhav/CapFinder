
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Send, Sparkles, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { refineStartupPitch } from '@/ai/flows/startup-pitch-refinement-assistant';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function NewPitchPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const db = useFirestore();
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [aiResult, setAiResult] = useState<{ refinedPitchDescription: string, suggestions: string[] } | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);

  const [formData, setFormData] = useState({
    startupName: '',
    description: '',
    fundingNeeded: '',
    industry: '',
    contactEmail: '',
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
        industry: formData.industry,
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
    setLoading(true);
    
    try {
      const pitchRef = await addDocumentNonBlocking(collection(db, 'pitches'), {
        ...formData,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });

      addDocumentNonBlocking(collection(db, 'logs'), {
        userId: user.uid,
        action: 'pitch_created',
        targetId: pitchRef?.id || 'unknown',
        timestamp: serverTimestamp(),
        details: `New pitch created for ${formData.startupName}`
      });

      toast({ title: "Pitch posted!", description: "Investors can now view your proposal in the marketplace." });
      router.push('/dashboard');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Post failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="p-20 text-center">
        <Loader2 className="animate-spin mx-auto w-10 h-10 text-primary" />
      </div>
    );
  }

  if (!user || (profile?.role !== 'startup' && profile?.role !== 'admin')) {
    return (
      <div className="p-20 text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-destructive mx-auto" />
        <h2 className="text-2xl font-bold">Unauthorized Access</h2>
        <p className="text-muted-foreground">This page is reserved for startup accounts only.</p>
        <Link href="/dashboard">
          <Button variant="link">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-6 space-y-6">
      <Link href="/dashboard" className="flex items-center gap-2 text-primary font-medium hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <Card className="shadow-lg">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-2xl">Create Your Investment Pitch</CardTitle>
          <CardDescription>Enter the details of your startup to attract potential investors.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startupName">Startup Name</Label>
                <Input 
                  id="startupName" 
                  required
                  value={formData.startupName}
                  onChange={(e) => setFormData({...formData, startupName: e.target.value})}
                  placeholder="e.g. InnovateX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input 
                  id="industry" 
                  required
                  value={formData.industry}
                  onChange={(e) => setFormData({...formData, industry: e.target.value})}
                  placeholder="e.g. Artificial Intelligence"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="description">Pitch Description</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="text-primary border-primary hover:bg-primary/5 h-8"
                  onClick={handleRefineWithAI}
                  disabled={refining}
                >
                  {refining ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 w-4 h-4" />}
                  Refine with AI
                </Button>
              </div>
              <Textarea 
                id="description" 
                required
                className="min-h-[200px]"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Explain your problem, solution, market size, and why investors should care..."
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fundingNeeded">Funding Amount Required ($)</Label>
                <Input 
                  id="fundingNeeded" 
                  required
                  value={formData.fundingNeeded}
                  onChange={(e) => setFormData({...formData, fundingNeeded: e.target.value})}
                  placeholder="e.g. 1,000,000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Investor Contact Email</Label>
                <Input 
                  id="contactEmail" 
                  type="email"
                  required
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                  placeholder="founder@startup.com"
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-lg bg-primary" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 w-5 h-5" />}
              Publish Pitch
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog open={showAiModal} onOpenChange={setShowAiModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="text-primary w-5 h-5" />
              AI-Refined Pitch
            </DialogTitle>
            <DialogDescription>
              We&apos;ve analyzed your pitch and suggested improvements for better investor appeal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/50 rounded-lg border italic text-sm leading-relaxed">
              {aiResult?.refinedPitchDescription}
            </div>
            {aiResult?.suggestions && aiResult.suggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold">Key Suggestions:</h4>
                <ul className="text-xs space-y-1 list-disc pl-4 text-muted-foreground">
                  {aiResult.suggestions.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAiModal(false)}>Discard</Button>
            <Button onClick={applyAiRefinement}>Apply Refinement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
