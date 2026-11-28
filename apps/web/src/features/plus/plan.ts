/** The one plan, as the landing page and the Plus page show it. The price itself is set in Stripe; keep them equal. */
export const PLAN = {
  price: '299',
  unit: 'kr/mån',
  note: 'Inklusive moms. Avsluta när du vill under Konto.',
  lead: 'Anpassa kartan efter dina specifika behov:',
  features: [
    { title: 'Din egen plats', text: 'Flytta kartans centrum till ditt jobb, barnens skola eller en vän du gärna bor nära.' },
    { title: 'Notifikationer', text: 'Spara dina filtreringar och få notiser via mejl.' },
    { title: 'Sålla', text: 'Bocka för annonser du redan kollat, sökt eller inte vill ha så du kan fokusera på nytt istället.' },
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
