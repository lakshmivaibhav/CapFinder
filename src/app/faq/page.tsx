
"use client";

import Link from 'next/link';
import { Footer } from '@/components/footer';
import { Navbar } from '@/components/navbar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Zap, HelpCircle, ArrowLeft, Search } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { Input } from '@/components/ui/input';

const FAQS = [
  {
    category: "Startups",
    items: [
      { q: "How do I create a pitch?", a: "Once your account is verified, navigate to your Dashboard and click 'Create New Pitch'. You'll need a title, category, description, and capital goal." },
      { q: "Can I use AI to help with my description?", a: "Yes! Our AI-powered Pitch Assistant can refine your description to make it more compelling for investors during the creation process." },
      { q: "Who can see my pitch?", a: "All verified investors and admins on the platform can browse your public pitch details. Sensitive metrics are only shared through direct inquiry." }
    ]
  },
  {
    category: "Investors",
    items: [
      { q: "How do I find startups to invest in?", a: "Use the 'Explore' feed to filter startups by industry, capital goal, or keyword. You can also see recommendations on your Dashboard." },
      { q: "What does the 'Verified' badge mean?", a: "It means we have performed a preliminary check on the founder's identity and professional credentials to ensure they are a legitimate member of the ecosystem." },
      { q: "How do I contact a founder?", a: "Click 'Connect' on a pitch. Once the founder accepts your request, a secure messaging channel will be opened for you." }
    ]
  },
  {
    category: "Security",
    items: [
      { q: "Is my data safe?", a: "Absolutely. We use industry-standard encryption for messaging and store all sensitive venture data within secure Firebase infrastructure." },
      { q: "How do I report a suspicious user?", a: "Use the 'Contact Us' page to report any concerns. Our safety team reviews all reports within 24 hours." }
    ]
  }
];

export default function FAQPage() {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20">
      {user && <Navbar />}

      <main className="flex-1 p-6 md:p-20 max-w-5xl mx-auto w-full space-y-16">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-all group w-fit">
          <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Return to {user ? "Dashboard" : "Gateway"}
        </Link>

        <section className="space-y-8 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-white shadow-xl rounded-full border border-muted text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">
            <HelpCircle className="w-4 h-4" /> Support Center
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">Frequently Asked <span className="text-primary">Questions</span></h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium italic">
            Everything you need to know about navigating the CapFinder ecosystem.
          </p>
          
          <div className="max-w-xl mx-auto relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 group-focus-within:text-primary transition-colors" />
            <Input className="h-16 pl-14 rounded-2xl border-none shadow-inner bg-muted/30 text-lg font-medium" placeholder="Search for answers..." />
          </div>
        </section>

        <div className="grid gap-16">
          {FAQS.map((cat, i) => (
            <div key={i} className="space-y-8">
              <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                <div className="w-2 h-8 bg-primary rounded-full" />
                {cat.category}
              </h3>
              <Accordion type="single" collapsible className="space-y-4">
                {cat.items.map((item, j) => (
                  <AccordionItem key={j} value={`item-${i}-${j}`} className="border-none shadow-lg rounded-[1.5rem] bg-white px-8 overflow-hidden group">
                    <AccordionTrigger className="h-16 md:h-20 hover:no-underline font-black text-left text-sm md:text-lg tracking-tight group-data-[state=open]:text-primary transition-colors">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-8 text-muted-foreground font-medium italic leading-relaxed text-sm md:text-md border-t pt-6">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>

        <section className="p-12 md:p-16 rounded-[3rem] bg-muted/30 text-center space-y-8">
          <h2 className="text-3xl font-black tracking-tight">Still have questions?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto font-medium italic">
            Can't find the answer you're looking for? Reach out to our team directly.
          </p>
          <div className="pt-4">
            <Link href="/contact">
              <Button size="lg" variant="outline" className="h-16 px-12 border-2 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Contact Support</Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
