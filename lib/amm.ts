// Manifold-style CPMM (Constant Product Market Maker)
// Uses "complete set" mechanism so cost/share ≈ displayed probability
//
// How it works:
// - Buying YES with X Pul: create X complete sets (X YES + X NO tokens),
//   sell unwanted NO tokens to AMM pool, keep all YES tokens
// - Each winning share resolves to 1 Pul
// - This ensures cost per share ≈ probability

export function getYesPrice(yesPool: number, noPool: number): number {
  return noPool / (yesPool + noPool);
}

export function getNoPrice(yesPool: number, noPool: number): number {
  return yesPool / (yesPool + noPool);
}

/**
 * Calculate shares received for a given Pul amount (BUY).
 * Uses Manifold-style complete set creation.
 *
 * @param betAmount - Pul to spend
 * @returns shares received, new pool state, avg price per share
 */
export function calculateBuyShares(
  yesPool: number,
  noPool: number,
  side: "YES" | "NO",
  betAmount: number
): { shares: number; newYesPool: number; newNoPool: number; avgPrice: number } {
  if (betAmount <= 0) throw new Error("Geçersiz miktar");

  const k = yesPool * noPool;

  let newYesPool: number;
  let newNoPool: number;
  let shares: number;

  if (side === "YES") {
    // Step 1: Create betAmount complete sets (betAmount YES + betAmount NO)
    // Step 2: Sell betAmount NO tokens to pool
    newNoPool = noPool + betAmount;
    newYesPool = k / newNoPool;
    const sharesFromSwap = yesPool - newYesPool;
    // Step 3: Total YES shares = betAmount (from complete sets) + sharesFromSwap
    shares = betAmount + sharesFromSwap;
  } else {
    // Mirror for NO side
    newYesPool = yesPool + betAmount;
    newNoPool = k / newYesPool;
    const sharesFromSwap = noPool - newNoPool;
    shares = betAmount + sharesFromSwap;
  }

  const avgPrice = betAmount / shares;

  return { shares, newYesPool, newNoPool, avgPrice };
}

/**
 * Calculate return for selling shares (SELL).
 * Reverse of complete set: sell outcome tokens to pool, get opposite tokens,
 * burn complete sets, return Pul.
 *
 * @param shares - number of outcome shares to sell
 * @returns Pul returned, new pool state
 */
export function calculateSellReturn(
  yesPool: number,
  noPool: number,
  side: "YES" | "NO",
  shares: number
): { returnAmount: number; newYesPool: number; newNoPool: number } {
  if (shares <= 0) throw new Error("Geçersiz miktar");

  const k = yesPool * noPool;

  let newYesPool: number;
  let newNoPool: number;
  let returnAmount: number;

  if (side === "YES") {
    // Sell YES tokens to pool, get NO tokens back, burn complete sets
    newYesPool = yesPool + shares;
    newNoPool = k / newYesPool;
    const noTokensReceived = noPool - newNoPool;
    // Burn min(shares, noTokensReceived) complete sets → return that as Pul
    returnAmount = noTokensReceived;
  } else {
    newNoPool = noPool + shares;
    newYesPool = k / newNoPool;
    const yesTokensReceived = yesPool - newYesPool;
    returnAmount = yesTokensReceived;
  }

  return { returnAmount, newYesPool, newNoPool };
}

/**
 * Calculate cost (Pul) for a desired number of outcome shares.
 * Inverse of calculateBuyShares — solves the quadratic:
 *   shares = b + y - k/(p + b)  →  b² + b(p + y - s) - s·p = 0
 *
 * @param shares - desired number of outcome shares (votes)
 * @returns cost in Pul, new pool state, avg price per share
 */
export function calculateBuyCost(
  yesPool: number,
  noPool: number,
  side: "YES" | "NO",
  shares: number
): { cost: number; newYesPool: number; newNoPool: number; avgPrice: number } {
  if (shares <= 0) throw new Error("Geçersiz miktar");

  // For YES: shares = b + yesPool - k/(noPool + b)
  // Rearranges to: b² + b(noPool + yesPool - shares) - shares * noPool = 0
  const p = side === "YES" ? noPool : yesPool;
  const y = side === "YES" ? yesPool : noPool;

  const a = 1;
  const b = p + y - shares;
  const c = -shares * p;

  const discriminant = b * b - 4 * a * c;
  const betAmount = (-b + Math.sqrt(discriminant)) / (2 * a);

  if (betAmount <= 0) throw new Error("Hesaplama hatası");

  // Now compute pool changes using the forward function
  const result = calculateBuyShares(yesPool, noPool, side, betAmount);

  return {
    cost: betAmount,
    newYesPool: result.newYesPool,
    newNoPool: result.newNoPool,
    avgPrice: betAmount / shares,
  };
}
