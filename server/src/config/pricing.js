export const materialRates = { paper: 15, cardboard: 10, pet_plastic: 24, hdpe: 19, metal: 32, aluminium: 142, copper: 690, e_waste: 185, glass: 3 };
export const priceFor = (material, condition) => Math.round((materialRates[material] || 0) * ({ clean: 1, mixed: 0.85, damaged: 0.65 }[condition] || 1) * 100) / 100;
