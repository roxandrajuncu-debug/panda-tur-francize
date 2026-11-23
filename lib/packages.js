// Pachetele de franciză afișate în Telegram Mini App.
export const PACKAGE_LIST = [
  { id: 'start', title: 'Start', price: 'de la 10.000 €', text: 'Agenție mică sau punct de vânzare în centrul raional. Brand, sistem de rezervări, instruire de 2 săptămâni.' },
  { id: 'standard', title: 'Standard', price: 'de la 18.000 €', text: 'Oficiu complet în oraș mare. Plus campanii de marketing locale și un manager dedicat în primele 6 luni.' },
  { id: 'premium', title: 'Premium', price: 'de la 30.000 €', text: 'Exclusivitate pe regiune, oficiu flagship, acces la tururi charter și condiții speciale la touroperatori.' },
];
export const PACKAGE_TITLE = Object.fromEntries(PACKAGE_LIST.map((p) => [p.id, p.title]));
