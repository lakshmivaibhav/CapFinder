"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Loader2, Zap, ArrowRight, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const auth = useAuth();
  const db = useFirestore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userDoc.exists() && userDoc.data().disabled) {
        await auth.signOut();
        toast({ 
          variant: "destructive", 
          title: "Account Restricted", 
          description: "This session has been deactivated by platform administration." 
        });
        setLoading(false);
        return;
      }

      setDocumentNonBlocking(doc(db, 'users', userCredential.user.uid), {
        lastActive: serverTimestamp(),
      }, { merge: true });

      toast({ title: "Welcome back", description: "Authenticating session..." });
      router.push('/dashboard');
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Authentication Failed", 
        description: "Verify credentials and security status." 
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
          <h1 className="text-3xl font-black tracking-tighter">CapFinder Console</h1>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Venture Capital Connection Hub</p>
        </div>

        <Card className="shadow-2xl border-none rounded-[2rem] overflow-hidden bg-white/80 backdrop-blur-sm">
          <CardHeader className="p-8 pb-4 text-center">
            <CardTitle className="text-xl font-black">Authorized Access</CardTitle>
            <CardDescription className="font-medium">Sign in to manage your professional network.</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Member Email</Label>
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
                <Label htmlFor="password" id="password-label" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Security Key</Label>
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
                {loading ? <Loader2 className="animate-spin" /> : <><ShieldCheck className="w-6 h-6" /> Authenticate</>}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center p-8 bg-muted/5 border-t border-muted">
            <p className="text-sm font-bold text-muted-foreground flex items-center gap-2">
              New to the ecosystem?{' '}
              <Link href="/signup" className="text-primary font-black hover:underline inline-flex items-center gap-1 group">
                Apply for Access <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </p>
          </CardFooter>
        </Card>

        <p className="text-center text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-50">
          Secure identity protocol v2.4.0
        </p>
      </div>
    </div>
  );
}
