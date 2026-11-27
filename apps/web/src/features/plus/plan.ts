/** The one plan, as the landing page and the Plus page show it. The price itself is set in Stripe; keep them equal. */
export const PLAN = {
  price: '299',
  unit: 'kr/mån',
  note: 'Inklusive moms. Avsluta när du vill under Konto.',
  lead: 'Kartan är gratis med restider till centrum. Plus gör den till din.',
  features: [
    { title: 'Din egen plats', text: 'Flytta pinnen från centrum till jobbet, skolan eller en vän och se restiden från varje lägenhet dit.' },
    { title: 'Sparad sökning', text: 'Dina filter finns kvar nästa gång du öppnar kartan.' },
    { title: 'Mejl om nytt', text: 'Få ett mejl när en ny annons passar din sökning.' },
    { title: 'Bocka av', text: 'Gråa ut annonser du redan kollat, sökt eller inte vill ha, på kartan och i listan.' },
  ],
};

export const SIGN_IN_LABELS = {
  email: 'E-post',
  submit: 'Skicka inloggningslänk',
  sent: 'Kolla din inkorg: klicka på länken i mejlet så är du inloggad.',
  invalid: 'Skriv en giltig e-postadress.',
  google: 'Fortsätt med Google',
  or: 'eller med e-post',
};
