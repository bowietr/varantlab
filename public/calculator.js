// Indicative whole-unit calculation, not an executable order or depth check.
export function calculatePosition(amount, bid, ask) {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e9 || !Number.isFinite(ask) || ask <= 0) return null;
  const quantity = Math.floor((amount + 1e-9) / ask);
  if (!Number.isSafeInteger(quantity)) return null;
  const invested = quantity * ask;
  const remaining = Math.max(0, amount - invested);
  const exitAvailable = Number.isFinite(bid) && bid > 0 && bid <= ask;
  const spreadLoss = exitAvailable ? quantity * (ask - bid) : null;
  return {quantity, invested, remaining, spreadLoss, spreadPercent:exitAvailable ? (ask-bid)/ask*100 : null};
}
