import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Audiences } from "@/components/landing/Audiences";
import { AISection } from "@/components/landing/AISection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Waitlist } from "@/components/landing/Waitlist";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <Nav />
      <Hero />
      <Audiences />
      <AISection />
      <HowItWorks />
      <Waitlist />
      <Footer />
    </main>
  );
};

export default Index;
