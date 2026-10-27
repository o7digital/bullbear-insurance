export const site = {
  name: 'Bull & Bear Insurance Broker',
  url: 'https://bullandbear-insurancebroker.com',
  email: 'contacto@bullandbear-insurancebroker.com',
  phone: '+52 55 1510 0605',
  address: 'Av. Insurgentes Sur 716, Piso 8, Col. Del Valle, Benito Juárez, 03103 Ciudad de México, CDMX',
};
// Production indexing requires a separate, explicit release approval.
export const indexable = import.meta.env.VERCEL_ENV === 'production' && import.meta.env.PRODUCTION_INDEXING_APPROVED === 'true';
