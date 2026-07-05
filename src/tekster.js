// ============================================================
//  TEKSTER.JS — AL TEKST PÅ SIDEN REDIGERES I DENNE FIL.
//
//  Der er ingen layout-kode her, så du kan ikke ødelægge
//  designet. Skriv om inde i anførselstegnene og gem — siden
//  opdaterer med det samme, når dev-serveren kører.
//
//   1. TEKSTER   → header, bio, overskrifter og kontakt-tekst
//   2. PROJEKTER → tilføj/redigér projekt-cards
//   3. MAIL      → din mailadresse
// ============================================================

// ---------- TEKSTER ----------
export const TEKSTER = {
  header: {
    label: "Portfolio",                          // den lille tekst over navnet
    navn: "Viggo Meedom Staun",                               // den store overskrift
    tagline: "Herunder ses de projekter som jeg har bygget med AI (Claude Code)",
  },

  bio: {
    overskrift: "Om mig",
    // REDIGER HER: bio — hvert element i listen bliver ét afsnit.
    // Tilføj flere afsnit ved at tilføje endnu en "tekst i anførselstegn",
    afsnit: [
      "Jeg hedder Viggo, er 19 år og bruger mit sabbatår på at lære at " +
        "bygge software sammen med AI. Jeg arbejder primært med Claude " +
        "Code, mens jeg bygger rigtige projekter, som går fra en " +
        "idé til et færdigt projekt.",
      "Denne side er mine projekter som jeg har bygget," +
        "for at øve mig i, hvordan AI fungerer. " +
        "Derfor er den også løbende under udvikling.",
    ],
  },

  projekter: {
    overskrift: "Projekter",
  },

  kontakt: {
    overskrift: "Kontakt",
    tekst: "Kontakt mig på denne mail, hvis du er interesseret i at høre mere.",
  },
};

// ---------- PROJEKTER ----------
// Tilføj et nyt card ved at kopiere en blok { ... } og indsætte
// den nederst i listen. Cardsene vises i rækkefølge, oppefra og ned.
// "nyFane: true" betyder at linket åbner i en ny fane (valgfrit felt).
export const PROJEKTER = [
  {
    titel: "Pandaspil",
    beskrivelse:
      "Et lille browserspil bygget med Claude Code. Man er en panda, " +
      "der hopper og kravler i træer. Målet var at komme i gang, med at lave et håndgribeligt projekt.",
    link: "/pandaspil/index.html",
    linkTekst: "Afprøv spillet",
    nyFane: true,
    tags: ["Claude Code"],
  },
  // {
  //   titel: "Næste projekt",
  //   beskrivelse: "Kort beskrivelse her.",
  //   link: "#",
  //   linkTekst: "Se projektet",
  //   nyFane: false,
  //   tags: ["Tag1", "Tag2"],
  // },
];

// ---------- KONTAKT ----------
export const MAIL = "viggostaun@gmail.com"; // REDIGER HER: mail
