"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { useAuth, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Loader2, Zap, ArrowRight, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SignupPage() {
  const auth = useAuth();
  const db = useFirestore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Send verification email immediately
      await sendEmailVerification(userCredential.user);

      setDocumentNonBlocking(doc(db, 'users', userCredential.user.uid), {
        id: userCredential.user.uid,
        email: userCredential.user.email,
        lastActive: serverTimestamp(),
        createdAt: serverTimestamp(),
        disabled: false,
        verified: false,
      }, { merge: true });

      toast({ 
        title: "Account Initialized", 
        description: "A verification email has been sent. Please verify your email to continue." 
      });
      
      router.push('/verify-email');
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Registration Error", 
        description: error.message 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8fafc]">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-primary/30">
            <Zap className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter">Join CapFinder</h1>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Global Venture Capital Ecosystem</p>
        </div>

        <Card className="shadow-2xl border-none rounded-[2rem] overflow-hidden bg-white/80 backdrop-blur-sm">
          <CardHeader className="p-8 pb-4 text-center">
            <CardTitle className="text-xl font-black">Membership Application</CardTitle>
            <CardDescription className="font-medium">Initiate your secure professional profile.</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSignup} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Preferred Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@company.com" 
                  required 
                  className="h-14 rounded-2xl bg-muted/30 border-none shadow-inner text-lg font-medium px-6 focus:ring-2 focus:ring-primary/20 transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="password" id="password-label" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Establish Security Key</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  className="h-14 rounded-2xl bg-muted/30 border-none shadow-inner text-lg font-medium px-6 focus:ring-2 focus:ring-primary/20 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full h-16 bg-primary shadow-xl shadow-primary/20 rounded-2xl font-black text-xl gap-3 transition-all hover:scale-[1.02]" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <><UserPlus className="w-6 h-6" /> Create Account</>}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center p-8 bg-muted/5 border-t border-muted">
            <p className="text-sm font-bold text-muted-foreground flex items-center gap-2">
              Already a verified member?{' '}
              <Link href="/login" className="text-primary font-black hover:underline inline-flex items-center gap-1 group">
                Enter Console <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </p>
          </CardFooter>
        </Card>

        <p className="text-center text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-50">
          Governance & compliance enforced
        </p>
      </div>
    </div>
  );
}
