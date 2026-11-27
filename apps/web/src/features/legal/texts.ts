/**
 * The legal pages. A draft, not legal advice: the owner fills in the [bracketed] parts and has it checked before
 * launch. One place for the text, so a change never touches components.
 */
export interface LegalDoc { title: string; updated: string; intro: string; sections: { title: string; body: string[] }[] }

const OWNER = '[Ditt namn eller företagsnamn], [org.nr]';
export const CONTACT = '[kontakt@din-domän.se]';

export const PRIVACY: LegalDoc = {
  title: 'Integritetspolicy',
  updated: '26 november 2026',
  intro: `EnkelLGH drivs av ${OWNER}, som är personuppgiftsansvarig. Här står vilka uppgifter vi behandlar om dig, varför och hur länge.`,
  sections: [
    { title: 'Utan konto', body: [
      'Kartan går att använda utan konto. Vi sparar då inga personuppgifter om dig.',
      'Dina filter sparas bara i din egen webbläsare (local storage). Vi använder inga spårningscookies och ingen annonsanalys.',
    ] },
    { title: 'Med konto', body: [
      'E-postadress: för inloggning (en länk skickas till dig) och, om du slår på det, för mejl om nya annonser. Grund: avtalet med dig.',
      'Din egen plats, din sparade sökning och vilka annonser du bockat för som sedda: för att räkna restider, skicka bevakningar och visa det du redan sett. Grund: avtalet med dig.',
      'Abonnemang: Stripe sköter betalningen. Vi får aldrig dina kortuppgifter, bara om abonnemanget är aktivt. Kvitton och betalningar sparas i sju år enligt bokföringslagen.',
    ] },
    { title: 'Vilka vi delar med', body: [
      'Supabase (databas och inloggning), Cloudflare (webbplatsen), Stripe (betalning) och Resend (e-post). De behandlar uppgifterna bara för vår räkning. Om uppgifter förs utanför EU sker det med EU-kommissionens standardavtalsklausuler.',
      'Vi säljer aldrig dina uppgifter och lämnar inte ut dem till någon annan.',
    ] },
    { title: 'Annonserna', body: [
      'Annonserna på kartan kommer från offentliga sidor. Vi visar bara uppgifter för att jämföra (läge, hyra, storlek, datum) och länkar till originalet. Vill du att en annons tas bort, mejla oss.',
    ] },
    { title: 'Hur länge', body: [
      'Så länge du har kvar ditt konto. Tar du bort kontot raderas e-post, plats och sökning inom 30 dagar, utom det bokföringslagen kräver.',
    ] },
    { title: 'Dina rättigheter', body: [
      `Du kan när som helst få se, rätta eller radera dina uppgifter, eller invända mot behandlingen. Mejla ${CONTACT}.`,
      'Är du missnöjd kan du klaga hos Integritetsskyddsmyndigheten (imy.se).',
    ] },
  ],
};

export const TERMS: LegalDoc = {
  title: 'Villkor',
  updated: '26 november 2026',
  intro: `Villkoren gäller när du använder EnkelLGH, som drivs av ${OWNER}.`,
  sections: [
    { title: 'Tjänsten', body: [
      'EnkelLGH samlar hyresannonser från flera sajter på en karta med restid. Vi är inte hyresvärd eller förmedlare: du ansöker alltid hos källan, och avtalet gäller mellan dig och hyresvärden.',
      'Uppgifterna hämtas automatiskt och kan vara fel eller inaktuella. Kontrollera alltid annonsen hos källan. Restider är uppskattningar.',
    ] },
    { title: 'Konto', body: [
      'Du loggar in med din e-post. Ett konto per person. Missbruk kan leda till att kontot stängs.',
    ] },
    { title: 'Plus', body: [
      'Plus är ett abonnemang som förnyas varje månad till det pris som visas vid köpet, inklusive moms. Det ger egen plats på kartan, sparad sökning, mejl om nya annonser och möjligheten att bocka för annonser du sett.',
      'Du avslutar när du vill under Konto, "Hantera abonnemang". Plus gäller då perioden ut, och inget mer dras.',
      'Ångerrätt: du har 14 dagar att ångra köpet. Börjar du använda Plus direkt godkänner du att tjänsten startar, och vid ånger betalar du för den tid du hunnit använda.',
    ] },
    { title: 'Ansvar', body: [
      'Vi gör vårt bästa för att tjänsten fungerar, men lovar inte att den alltid är tillgänglig eller felfri. Vi ansvarar inte för annonsernas innehåll eller för beslut du tar utifrån dem, utom vid grov vårdslöshet.',
    ] },
    { title: 'Ändringar och kontakt', body: [
      'Ändras villkoren i något viktigt meddelar vi det minst 30 dagar innan. Svensk lag gäller.',
      `Frågor: ${CONTACT}.`,
    ] },
  ],
};
