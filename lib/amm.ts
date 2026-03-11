// Constant Product Market Maker (CPMM)
// Similar to Uniswap/Polymarket mechanism
// Invariant: yesPool * noPool = k (constant)

export function getYesPrice(yesPool: number, noPool: number): number {
  return noPool / (yesPool + noPool);
}

export function getNoPrice(yesPool: number, noPool: number): number {
  return yesPool / (yesPool + noPool);
}

export function calculateBuyCost(
  yesPool: number,
  noPool: number,
  side: "YES" | "NO",
  shares: number
): { cost: number; newYesPool: number; newNoPool: number; avgPrice: number } {
  const k = yesPool * noPool;

  let newYesPool: number;
  let newNoPool: number;

  if (side === "YES") {
    // Buying YES: remove from yesPool, add to noPool
    newYesPool = yesPool - shares;
    if (newYesPool <= 0) throw new Error("Yetersiz likidite");
    newNoPool = k / newYesPool;
  } else {
    newNoPool = noPool - shares;
    if (newNoPool <= 0) throw new Error("Yetersiz likidite");
    newYesPool = k / newNoPool;
  }

  const cost = side === "YES"
    ? newNoPool - noPool
    : newYesPool - yesPool;

  const avgPrice = cost / shares;

  return { cost, newYesPool, newNoPool, avgPrice };
}

export function calculateSellReturn(
  yesPool: number,
  noPool: number,
  side: "YES" | "NO",
  shares: number
): { returnAmount: number; newYesPool: number; newNoPool: number } {
  const k = yesPool * noPool;

  let newYesPool: number;
  let newNoPool: number;

  if (side === "YES") {
    newYesPool = yesPool + shares;
    newNoPool = k / newYesPool;
    const returnAmount = noPool - newNoPool;
    return { returnAmount, newYesPool, newNoPool };
  } else {
    newNoPool = noPool + shares;
    newYesPool = k / newNoPool;
    const returnAmount = yesPool - newYesPool;
    return { returnAmount, newYesPool, newNoPool };
  }
}
