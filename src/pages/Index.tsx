import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Audiences } from "@/components/landing/Audiences";
import { AISection } from "@/components/landing/AISection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Waitlist } from "@/components/landing/Waitlist";
import { Footer } from "@/components/landing/Footer";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate("/dashboard", { replace: true });
  }, [session, loading, navigate]);

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
