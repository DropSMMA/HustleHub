import { Suspense } from "react";
import Header from "@/components/marketing/Header";
import Hero from "@/components/marketing/Hero";
import Problem from "@/components/marketing/Problem";
import FeaturesAccordion from "@/components/marketing/FeaturesAccordion";
import Pricing from "@/components/marketing/Pricing";
import FAQ from "@/components/marketing/FAQ";
import CTA from "@/components/marketing/CTA";
import Footer from "@/components/marketing/Footer";

export default function Home() {
  return (
    <>
      <Suspense>
        <Header />
      </Suspense>
      <main className="bg-brand-primary text-white">
        <Hero />
        <Problem />
        <FeaturesAccordion />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  );
}