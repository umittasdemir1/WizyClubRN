import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import RegionsTicker from "@/components/RegionsTicker";
import { ServicesSection, MaterialsSection } from "@/components/FeatureSection";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";

export default function App() {
  return (
    <main>
      <Navbar />
      <Hero />
      <RegionsTicker />
      <ServicesSection />
      <MaterialsSection />
      <Footer />
      <WhatsAppButton />
    </main>
  );
}
