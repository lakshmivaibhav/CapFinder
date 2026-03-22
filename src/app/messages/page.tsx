"use client";

import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { MessageSquare, LayoutDashboard, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

/**
 * DECOMMISSIONED: The internal messaging system has been removed to return
 * to a clean venture inquiry state. Direct communications now occur via 
 * approved identity sharing and external protocols.
 */
export default function MessagesPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col h-screen overflow-hidden">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-8 bg-muted/5">
        <div className="relative">
          <div className="w-32 h-32 bg-white rounded-full shadow-2xl flex items-center justify-center relative z-10 ring-8 ring-primary/5 scale-125">
            <MessageSquare className="w-16 h-16 text-primary opacity-20" />
          </div>
          <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="max-w-md space-y-4">
          <h1 className="text-4xl font-black tracking-tighter">System Decommissioned</h1>
          <p className="text-muted-foreground font-medium italic border-l-8 border-primary/20 pl-8 leading-relaxed">
            The internal messaging hub has been deactivated to streamline strategic inquiries. Please use the verified connection protocols available in your Inbound Queue or Venture Feed.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <Link href="/dashboard" className="flex-1">
            <Button className="w-full h-14 bg-primary shadow-xl shadow-primary/20 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2">
              <LayoutDashboard className="w-4 h-4" /> Return to Console
            </Button>
          </Link>
          <Link href="/pitches" className="flex-1">
            <Button variant="outline" className="w-full h-14 border-2 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2">
              <ArrowLeft className="w-4 h-4" /> Market Feed
            </Button>
          </Link>
        </div>

        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-50">
          Governance Layer v2.5.0 • Feature Restricted
        </p>
      </main>
    </div>
  );
}
