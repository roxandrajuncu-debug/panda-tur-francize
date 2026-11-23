// Pachetele de francizƒÉ afi»ôate √Ăn Telegram Mini App.
export const PACKAGE_LIST = [
  { id: 'start', title: 'Start', price: 'de la 10.000 ‚Ç¨', text: 'Agen»õie micƒÉ sau punct de v√¢nzare √Ăn centrul raional. Brand, sistem de rezervƒÉri, instruire de 2 sƒÉptƒÉm√¢ni.' },
  { id: 'standard', title: 'Standard', price: 'de la 18.000 ‚Ç¨', text: 'Oficiu complet √Ăn ora»ô mare. Plus campanii de marketing locale »ôi un manager dedicat √Ăn primele 6 luni.' },
  { id: 'premium', title: 'Premium', price: 'de la 30.000 ‚Ç¨', text: 'Exclusivitate pe regiune, oficiu flagship, acces la tururi charter »ôi condi»õii speciale la touroperatori.' },
];
export const PACKAGE_TITLE = Object.fromEntries(PACKAGE_LIST.map((p) => [p.id, p.title]));
