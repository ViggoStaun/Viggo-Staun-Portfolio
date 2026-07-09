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
// data-prik bruges af useLinjeMål til at finde første og sidste prik.
function LinjePrik() {
  return (
    <span
      aria-hidden="true"
      data-prik="true"
      className="absolute top-[0.45em] -left-6 sm:-left-10 -translate-x-1/2 h-2.5 w-2.5 rounded-full"
      style={{ backgroundColor: FARVER.accent }}
    />
  );
}

// Måler hvor linjen skal starte og slutte: fra midten af den første
// prik til midten af den sidste. Måler igen når layoutet ændrer sig
// (fx anden skærmbredde eller redigeret tekst), så linjen ALTID
// rammer prikkerne præcist.
function useLinjeMål() {
  const containerRef = useRef(null);
  const [mål, setMål] = useState(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Lodret position i forhold til rammen, målt via layoutet —
    // upåvirket af fade-ind-animationernes midlertidige forskydning.
    const yIRamme = (el) => {
      let y = 0;
      let node = el;
      while (node && node !== container) {
        y += node.offsetTop;
        node = node.offsetParent;
      }
      return y;
    };

    const opdater = () => {
      const prikker = container.querySelectorAll("[data-prik]");
      if (prikker.length < 2) return;
      const først = prikker[0];
      const sidst = prikker[prikker.length - 1];
      const top = yIRamme(først) + først.offsetHeight / 2;
      const bund = yIRamme(sidst) + sidst.offsetHeight / 2;
      setMål({ top, height: bund - top });
    };

    opdater();
    const observer = new ResizeObserver(opdater);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return [containerRef, mål];
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
  // Ref til rammen + de målte start/slut-positioner for linjen
  const [rammeRef, linjeMål] = useLinjeMål();

  return (
    <main
      className="min-h-screen antialiased"
      style={{ backgroundColor: FARVER.baggrund, color: FARVER.tekst }}
    >
      {/* Ydre ramme: centreret kolonne med plads til linjen i venstre side */}
      <div
        ref={rammeRef}
        className="relative mx-auto max-w-2xl px-6 sm:px-10 py-16 sm:py-24"
      >

        {/* DEN LODRETTE LINJE — løber fra header-prikken til kontakt-prikken.
            Position måles automatisk (useLinjeMål), så den passer uanset
            tekstlængde og skærmbredde. */}
        {linjeMål && (
          <div
            aria-hidden="true"
            className="absolute left-6 sm:left-10 w-px"
            style={{
              backgroundColor: FARVER.accent,
              opacity: 0.55,
              top: linjeMål.top,
              height: linjeMål.height,
            }}
          />
        )}

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
