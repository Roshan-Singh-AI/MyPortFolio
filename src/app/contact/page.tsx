import type { Metadata } from "next";
import ContactHero from "@/components/ContactHero";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with Roshan Singh -- ${site.email}. Open to AI engineering roles and collaborations.`,
  openGraph: {
    title: "Contact -- Roshan Singh",
    description: "Open to AI engineering roles and collaborations.",
  },
};

export default function ContactPage() {
  return <ContactHero />;
}
