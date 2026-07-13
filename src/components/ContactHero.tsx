"use client";

import { motion } from "framer-motion";
import GraphBackground from "./GraphBackground";
import RevealText from "./RevealText";
import ContactForm from "./ContactForm";
import FitAnalyzer from "./FitAnalyzer";
import { site } from "@/content/site";
import { EASE_OUT } from "@/lib/motion";
import { useMotionGate } from "@/lib/useMotionGate";

const links = [
  { label: "Email", value: site.email, href: `mailto:${site.email}` },
  {
    label: "GitHub",
    value: "Roshan-Singh-AI",
    href: site.links.github,
    external: true,
  },
  {
    label: "LinkedIn",
    value: "roshan-singh-1617n",
    href: site.links.linkedin,
    external: true,
  },
  {
    label: "Phone",
    value: site.phone,
    href: `tel:${site.phone.replace(/\s+/g, "")}`,
  },
];

export default function ContactHero() {
  const { reduce } = useMotionGate();

  return (
    <section
      id="contact"
      className="relative flex min-h-[100svh] items-start overflow-hidden"
    >
      <div aria-hidden className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute inset-0 opacity-70">
          <GraphBackground density={20} variant="hero" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,transparent,rgba(16,21,15,0.7))]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pt-36 pb-32 sm:px-8 sm:pt-44">
        <motion.span
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="kicker flex items-center gap-3"
        >
          <span className="h-px w-8 bg-cyan/60" aria-hidden />
          Contact
        </motion.span>

        <h1 className="mt-6 font-[family-name:var(--font-display)] text-[clamp(2.5rem,8vw,6rem)] font-semibold leading-[0.95] tracking-[-0.03em]">
          <RevealText text="Let's build" animateOnMount className="block" />
          <RevealText
            text="something real."
            animateOnMount
            delay={0.2}
            className="block text-gradient"
          />
        </h1>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.5 }}
          className="mt-7 max-w-xl text-base leading-relaxed text-text-dim sm:text-lg"
        >
          Open to AI engineering roles and collaborations -- LLM applications,
          RAG, and agents. Hiring for a role? Paste the JD below and see, in
          seconds, exactly where I line up.
        </motion.p>

        {/* Fit analyzer -- FIRST-CLASS and above the fold. A recruiter can drop
            in a JD (or one click on a sample role) and get an honest, grounded
            read before ever filling in the form. */}
        <motion.div
          id="fit"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.55 }}
          className="mt-10 max-w-3xl scroll-mt-28"
        >
          <div className="mb-5 flex flex-col gap-2">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-gold/40 bg-gold/[0.08] px-3 py-1 text-[0.66rem] font-medium tracking-wide text-gold">
              <span aria-hidden className="relative flex h-1.5 w-1.5">
                {!reduce && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
                )}
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold" />
              </span>
              For recruiters
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-text sm:text-3xl balance">
              Paste the JD. See the fit instantly.
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-text-dim">
              A retrieval-backed analyzer matches the role against Roshan&apos;s
              real, documented work, calls out the strongest matches with their
              source, and drafts a short note you can send. Grounded only in real
              experience -- it never invents anything.
            </p>
          </div>
          <FitAnalyzer />
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.6 }}
          className="mt-14 max-w-3xl"
        >
          <div className="mb-5 flex flex-col gap-1.5">
            <span className="kicker flex items-center gap-3 text-[0.62rem]">
              <span className="h-px w-6 bg-cyan/60" aria-hidden />
              Or just say hello
            </span>
          </div>
          <ContactForm />
        </motion.div>

        <div className="mt-10 grid max-w-3xl gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
          {links.map((link, i) => (
            <motion.a
              key={link.label}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.7 + i * 0.06 }}
              href={link.href}
              {...(link.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="group flex items-center justify-between bg-bg px-5 py-4 transition-colors duration-300 hover:bg-surface"
            >
              <div className="flex flex-col">
                <span className="kicker text-[0.6rem]">{link.label}</span>
                <span className="mt-1 text-sm text-text">{link.value}</span>
              </div>
              <span
                aria-hidden
                className="text-text-faint transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-cyan"
              >
                &#8599;
              </span>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
