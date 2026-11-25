import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import ModesPreview from '@/components/landing/ModesPreview';
import TrustSection from '@/components/landing/TrustSection';
import WhyRupee from '@/features/global/WhyRupee';

export default function LandingPage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <WhyRupee />
      </section>
      <ModesPreview />
      <TrustSection />
    </>
  );
}
