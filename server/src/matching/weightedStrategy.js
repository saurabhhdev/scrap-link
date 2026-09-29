export const MATCH_STRATEGY_VERSION = 'weighted-v1';

export const MATCH_WEIGHTS = Object.freeze({
  materialCompatibility: 0.30,
  distance: 0.20,
  serviceRadius: 0.15,
  price: 0.20,
  verification: 0.15
});

const round = (value) => Math.round(value * 10) / 10;

/** Deterministic baseline; future strategies can implement the same evaluate() contract. */
export function evaluateWeightedMatches({ requestMaterials, facilityCandidates, referenceValue, requestedCity }) {
  const requested = [...new Set(requestMaterials.map((material) => material.material))];
  const eligible = facilityCandidates.flatMap((facility) => {
    const accepted = new Set(facility.acceptedMaterials || []);
    const compatible = requested.filter((material) => accepted.has(material));
    if (!compatible.length) return [];

    const hasCoordinates = Number.isFinite(facility.distanceKm);
    const radius = Number(facility.serviceRadiusKm || 25);
    const inRadius = hasCoordinates ? facility.distanceKm <= radius : facility.city?.toLowerCase() === requestedCity?.toLowerCase();
    if (!inRadius) return [];

    const compatibilityScore = requested.length ? (compatible.length / requested.length) * 100 : 0;
    const distanceScore = hasCoordinates ? Math.max(0, (1 - facility.distanceKm / radius) * 100) : 50;
    const facilityPrice = requestMaterials.reduce((sum, item) => {
      const rate = facility.priceRates?.[item.material];
      return sum + (Number.isFinite(rate) ? rate : 0) * item.weightKg;
    }, 0);
    const priceScore = facility.hasPriceData && referenceValue > 0 ? (facilityPrice / referenceValue) * 100 : 50;
    const verificationScore = facility.verificationStatus === 'verified' ? 100 : facility.verificationStatus === 'pending' ? 50 : 0;
    const serviceRadiusScore = hasCoordinates ? 100 : 50;
    const score = round(
      compatibilityScore * MATCH_WEIGHTS.materialCompatibility +
      distanceScore * MATCH_WEIGHTS.distance +
      serviceRadiusScore * MATCH_WEIGHTS.serviceRadius +
      priceScore * MATCH_WEIGHTS.price +
      verificationScore * MATCH_WEIGHTS.verification
    );

    return [{
      facility,
      score,
      compatibleMaterials: compatible,
      reasons: [
        { key: 'materialCompatibility', label: 'Material compatibility', score: round(compatibilityScore), weight: MATCH_WEIGHTS.materialCompatibility, detail: `Accepts ${compatible.length} of ${requested.length} requested material${requested.length === 1 ? '' : 's'}: ${compatible.join(', ')}.` },
        { key: 'distance', label: 'Distance', score: round(distanceScore), weight: MATCH_WEIGHTS.distance, detail: hasCoordinates ? `${round(facility.distanceKm)} km away; closer facilities score higher within their service radius.` : 'Exact distance unavailable; facility and pickup are listed in the same city.' },
        { key: 'serviceRadius', label: 'Service radius', score: serviceRadiusScore, weight: MATCH_WEIGHTS.serviceRadius, detail: hasCoordinates ? `${round(facility.distanceKm)} km is within the ${radius} km service radius.` : 'City match only; coordinates are needed to confirm service radius.' },
        { key: 'price', label: 'Price', score: round(Math.min(100, priceScore)), weight: MATCH_WEIGHTS.price, detail: facility.hasPriceData ? `Configured recycler estimate ₹${round(facilityPrice)} vs reference ₹${round(referenceValue)} for this lot.` : 'No recycler-specific rate configured; neutral price score used.' },
        { key: 'verification', label: 'Verification', score: verificationScore, weight: MATCH_WEIGHTS.verification, detail: `Facility verification status: ${facility.verificationStatus}.` }
      ]
    }];
  }).sort((a, b) => b.score - a.score || (a.facility.distanceKm ?? Infinity) - (b.facility.distanceKm ?? Infinity));

  return { strategy: MATCH_STRATEGY_VERSION, weights: MATCH_WEIGHTS, matches: eligible };
}
