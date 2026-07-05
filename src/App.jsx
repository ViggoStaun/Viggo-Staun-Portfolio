// ============================================================
//  VIGGOS PORTFOLIO — layout og logik.
//
//  AL TEKST redigeres i src/tekster.js — denne fil skal du
//  ikke røre. Det eneste redigerbare her er FARVER lige
//  herunder.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { TEKSTER, PROJEKTER, MAIL } from "./tekster.js";

// ---------- FARVER (bruges via Tailwinds arbitrary values) ----------
const FARVER = {
  baggrund: "#FAF6F0", // cream/off-white
  accent: "#C15F3C",   // terracotta — kun linje, prikker og links
  tekst: "#211D19",    // næsten-sort
  tekstSvag: "#6B6259", // dæmpet grå-brun til undertekster
};

// Lille hook: giver besked når et element scroller ind i billedet.
// Bruges til de dæmpede fade-ins. Kører kun én gang pr. element,
// så der ikke er konstant bevægelse eller unødigt arbejde.
function useFadeIn() {
  const ref = useRef(null);
  const [synlig, setSynlig] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSynlig(true);
          observer.disconnect(); // fade kun ind én gang
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, synlig];
}

// Wrapper der fader sit indhold blødt ind ved scroll.
// Respekterer "reduceret bevægelse" i systemindstillinger.
function FadeInSektion({ children, className = "" }) {
  const [ref, synlig] = useFadeIn();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:translate-y-0 motion-reduce:opacity-100 ${
        synlig ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      } ${className}`}
    >
      {children}
    </div>
  );
}

// Prik/markør på den lodrette linje. Placeres af hver sektion.
function LinjePrik() {
  return (
    <span
      aria-hidden="true"
      className="absolute top-[0.45em] -left-6 sm:-left-10 -translate-x-1/2 h-2.5 w-2.5 rounded-full"
      style={{ backgroundColor: FARVER.accent }}
    />
  );
}

// Ét projekt-card. Sidder direkte på linjen via sin LinjePrik.
function ProjektCard({ projekt }) {
  return (
    <FadeInSektion>
      <article className="relative">
        <LinjePrik />
        <div
          className="rounded-lg border p-6 sm:p-8 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(33,29,25,0.07)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          style={{ borderColor: "rgba(33,29,25,0.12)", backgroundColor: "#FFFDFA" }}
        >
          <h3 className="text-xl font-medium tracking-tight">{projekt.titel}</h3>
          <p className="mt-3 leading-relaxed" style={{ color: FARVER.tekstSvag }}>
            {projekt.beskrivelse}
          </p>
          {/* Tags — små dæmpede etiketter */}
          <div className="mt-4 flex flex-wrap gap-2">
            {projekt.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs rounded-full border px-2.5 py-1"
                style={{ borderColor: "rgba(33,29,25,0.15)", color: FARVER.tekstSvag }}
              >
                {tag}
              </span>
            ))}
          </div>
          <a
            href={projekt.link}
            {...(projekt.nyFane ? { target: "_blank", rel: "noopener" } : {})}
            className="mt-5 inline-block text-sm font-medium underline underline-offset-4 transition-opacity hover:opacity-70"
            style={{ color: FARVER.accent }}
          >
            {projekt.linkTekst} →
          </a>
        </div>
      </article>
    </FadeInSektion>
  );
}

export default function App() {
  return (
    <main
      className="min-h-screen antialiased"
      style={{ backgroundColor: FARVER.baggrund, color: FARVER.tekst }}
    >
      {/* Ydre ramme: centreret kolonne med plads til linjen i venstre side */}
      <div className="relative mx-auto max-w-2xl px-6 sm:px-10 py-16 sm:py-24">

        {/* DEN LODRETTE LINJE — løber fra header-prikken til kontakt-prikken.
            top/bottom er afstemt efter første og sidste priks position;
            ændrer du teksten i kontakt-sektionen, kan bottom-værdien
            skulle justeres et par rem. */}
        <div
          aria-hidden="true"
          className="absolute left-6 sm:left-10 top-[4.8rem] sm:top-[6.85rem] bottom-[13.2rem] sm:bottom-[13.4rem] w-px"
          style={{ backgroundColor: FARVER.accent, opacity: 0.55 }}
        />

        {/* Alt indhold er rykket ind, så det står til højre for linjen */}
        <div className="pl-6 sm:pl-10 flex flex-col">

          {/* ---------- HEADER ---------- */}
          <FadeInSektion>
            <header className="relative">
              <LinjePrik />
              <p
                className="text-sm uppercase tracking-[0.2em]"
                style={{ color: FARVER.tekstSvag }}
              >
                {TEKSTER.header.label}
              </p>
              <h1 className="mt-3 text-4xl sm:text-5xl font-semibold tracking-tight">
                {TEKSTER.header.navn}
              </h1>
              <p className="mt-4 text-lg" style={{ color: FARVER.tekstSvag }}>
                {TEKSTER.header.tagline}
              </p>
            </header>
          </FadeInSektion>

          {/* ---------- BIO ---------- */}
          <FadeInSektion className="mt-24 sm:mt-32">
            <section className="relative" id="bio">
              <LinjePrik />
              <h2 className="text-sm uppercase tracking-[0.2em]" style={{ color: FARVER.tekstSvag }}>
                {TEKSTER.bio.overskrift}
              </h2>
              {/* Bio-afsnittene redigeres i TEKSTER.bio.afsnit øverst i filen */}
              {TEKSTER.bio.afsnit.map((afsnit) => (
                <p key={afsnit.slice(0, 40)} className="mt-4 text-lg leading-relaxed">
                  {afsnit}
                </p>
              ))}
            </section>
          </FadeInSektion>

          {/* ---------- PROJEKTER ----------
              Cards ligger i én lodret kolonne (flex-col + gap),
              så hvert card sidder på linjen som perler på en snor.
              Nye cards tilføjes i PROJEKTER-listen øverst i filen. */}
          <section className="mt-24 sm:mt-32" id="projekter">
            <FadeInSektion>
              <div className="relative">
                <LinjePrik />
                <h2 className="text-sm uppercase tracking-[0.2em]" style={{ color: FARVER.tekstSvag }}>
                  {TEKSTER.projekter.overskrift}
                </h2>
              </div>
            </FadeInSektion>
            <div className="mt-10 flex flex-col gap-14">
              {PROJEKTER.map((projekt) => (
                <ProjektCard key={projekt.titel} projekt={projekt} />
              ))}
            </div>
          </section>

          {/* ---------- KONTAKT ---------- */}
          <FadeInSektion className="mt-24 sm:mt-32">
            <footer className="relative pb-8" id="kontakt">
              <LinjePrik />
              <h2 className="text-sm uppercase tracking-[0.2em]" style={{ color: FARVER.tekstSvag }}>
                {TEKSTER.kontakt.overskrift}
              </h2>
              <p className="mt-4 text-lg leading-relaxed">
                {TEKSTER.kontakt.tekst}
              </p>
              <a
                href={`mailto:${MAIL}`}
                className="mt-2 inline-block text-lg font-medium underline underline-offset-4 transition-opacity hover:opacity-70"
                style={{ color: FARVER.accent }}
              >
                {MAIL}
              </a>
            </footer>
          </FadeInSektion>

        </div>
      </div>
    </main>
  );
}
