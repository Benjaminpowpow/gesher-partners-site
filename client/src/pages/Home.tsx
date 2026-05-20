import Nav from "@/components/Nav";
import HeroSection from "@/components/HeroSection";
import StatsSection from "@/components/StatsSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import WhereWeOperatedSection from "@/components/WhereWeOperatedSection";
import FoundersSection from "@/components/FoundersSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh" }}>
      <Nav />
      <main style={{ paddingTop: 64 }}>
        <HeroSection />
        <StatsSection />
        <HowItWorksSection />
        <WhereWeOperatedSection />
        <FoundersSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
