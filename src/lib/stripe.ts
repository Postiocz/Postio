import Stripe from "stripe";

// Inicializujeme Stripe pouze pokud je k dispozici secret key
// Pokud klíč není, vytvoříme "dummy" instanci pouze pro typovou kompatibilitu
const secretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = secretKey 
  ? new Stripe(secretKey, {
      apiVersion: "2026-06-24.dahlia",
      typescript: true,
    })
  : // Dummy objekt pro případ, kdy Stripe není nakonfigurován
    // Tento objekt nebude fungovat při skutečném použití, ale nebude házet chybu při buildu
    {} as Stripe;
