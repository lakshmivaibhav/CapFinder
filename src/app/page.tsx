"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Briefcase, TrendingUp, Users, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

export default function HomePage() {
  const { user } = useAuth();
  const browseLink = user ? '/pitches' : '/login';

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-6 h-20 flex items-center justify-between border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <TrendingUp className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-primary">CapFinder</span>
        </Link>
        <nav className="flex gap-4 items-center">
          <Link href="/login">
            <Button variant="ghost">Log in</Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-primary hover:bg-primary/90">Join Now</Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="py-20 px-6 md:py-32 bg-gradient-to-b from-white to-background">
          <div className="max-w-6xl mx-auto text-center space-y-8">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-foreground leading-[1.1]">
              Connecting the Next Generation of <span className="text-primary">Capital</span> and <span className="text-accent">Innovation</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              CapFinder is the ultimate bridge between visionary startup founders and strategic investors. Find your match and fuel the future.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="h-14 px-8 text-lg bg-primary hover:bg-primary/90">
                  Get Started <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href={browseLink}>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-primary text-primary hover:bg-primary/5">
                  Browse Pitches
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 px-6 max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Briefcase className="text-primary w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">For Startups</h3>
              <p className="text-muted-foreground">
                Get your vision in front of verified investors. Post your pitch and secure the funding you need to scale.
              </p>
            </div>
            <div className="p-8 bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow space-y-4">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-accent w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">For Investors</h3>
              <p className="text-muted-foreground">
                Discover curated opportunities across various industries. Use high-quality data to make informed decisions.
              </p>
            </div>
            <div className="p-8 bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow space-y-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <ShieldCheck className="text-green-600 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Secure & Private</h3>
              <p className="text-muted-foreground">
                Built with security in mind. Your data and interactions are protected by industry-leading standards.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t bg-white px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-primary w-6 h-6" />
            <span className="font-bold text-xl">CapFinder</span>
          </div>
          <p className="text-muted-foreground text-sm">
            © 2024 CapFinder. All rights reserved. Empowering global innovation.
          </p>
        </div>
      </footer>
    </div>
  );
}
