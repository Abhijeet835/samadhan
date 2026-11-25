import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import TrustSection from '@/components/landing/TrustSection';

export default function LandingPage() {
  return (
    <div className="bg-background">
      <Hero />
      <HowItWorks />
      <TrustSection />
    </div>
  );
}
