"use client";

import { useState } from 'react';
import { uploadSound } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * @fileOverview Temporary developer utility page for uploading sound assets.
 */
export default function UploadTestPage() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const result = await uploadSound(formData);
      if (result.success) {
        toast({ title: "Upload Successful", description: "File saved as /public/sounds/hover.wav" });
      } else {
        toast({ variant: "destructive", title: "Upload Failed", description: result.error });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to execute server action." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-6">
      <Card className="w-full max-w-md border-none shadow-2xl rounded-[2rem] bg-white">
        <CardHeader className="p-8 pb-4 text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
            <Upload className="text-primary w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-black tracking-tight">Sound Upload Utility</CardTitle>
          <CardDescription className="font-medium">Temporary tool to upload 'hover.wav' into the public directory.</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleUpload} className="space-y-6">
            <div className="space-y-2">
              <Input 
                name="file" 
                type="file" 
                accept=".wav" 
                required 
                className="h-14 rounded-xl border-2 border-dashed bg-muted/30 focus:ring-primary/10 focus:border-primary transition-all p-4"
              />
            </div>
            <Button type="submit" className="w-full h-14 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20" disabled={loading}>
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <><Upload className="w-5 h-5 mr-2" /> Upload Sound</>}
            </Button>
          </form>
          
          <div className="mt-8 p-5 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[10px] text-amber-700 font-black uppercase tracking-widest">Environment Notice</p>
              <p className="text-[10px] text-amber-700 font-medium leading-relaxed italic">
                This utility writes to the local filesystem. In hosted serverless environments, these changes are transient and will be reset upon redeployment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
