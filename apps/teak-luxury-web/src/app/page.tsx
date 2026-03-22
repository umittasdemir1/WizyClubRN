import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import QuickAction from "@/components/QuickAction";
import {
  ServicesSection,
  ProjectsSection,
  MaterialsSection,
} from "@/components/FeatureSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <ServicesSection />
      <ProjectsSection />
      <MaterialsSection />
      <QuickAction />
      <Footer />
    </main>
  );
}
