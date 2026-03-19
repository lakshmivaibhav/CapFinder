"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Loader2, ArrowRight, Zap, RefreshCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function VerifyEmailPage() {
  const { user, emailVerified, loading, reloadUser, resendVerification } = useAuth();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user && emailVerified) {
      router.push('/dashboard');
    }
  }, [user, emailVerified, loading, router]);

  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerification();
      toast({ title: "Email Sent", description: "Verification link has been resent to your inbox." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setResending(false);
    }
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      await reloadUser();
      if (emailVerified) {
        toast({ title: "Success", description: "Email verified! Redirecting to dashboard..." });
        router.push('/dashboard');
      } else {
        toast({ title: "Not verified", description: "Your email is still showing as unverified. Please check your inbox." });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setChecking(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8fafc]">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-primary/30">
            <Zap className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter">Verify Identity</h1>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Security Protocol v2.4.0</p>
        </div>

        <Card className="shadow-2xl border-none rounded-[2rem] overflow-hidden bg-white/80 backdrop-blur-sm">
          <CardHeader className="p-8 pb-4 text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-xl font-black">Email Confirmation Required</CardTitle>
            <CardDescription className="font-medium">
              We've sent a secure verification link to <span className="font-bold text-foreground">{user?.email}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            <Button 
              onClick={handleCheckStatus} 
              className="w-full h-14 bg-primary shadow-xl shadow-primary/20 rounded-2xl font-black text-lg gap-3 transition-all hover:scale-[1.02]"
              disabled={checking}
            >
              {checking ? <Loader2 className="animate-spin" /> : <><RefreshCcw className="w-5 h-5" /> I've Verified My Email</>}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleResend} 
              className="w-full h-14 rounded-2xl border-2 font-bold gap-3 transition-all"
              disabled={resending}
            >
              {resending ? <Loader2 className="animate-spin" /> : "Resend Verification Email"}
            </Button>
          </CardContent>
          <CardFooter className="justify-center p-8 bg-muted/5 border-t border-muted">
            <p className="text-sm font-bold text-muted-foreground">
              Wrong email address?{' '}
              <button onClick={() => router.push('/signup')} className="text-primary font-black hover:underline">
                Register with a different email
              </button>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
