/**
 * The arithmetic behind /he/commission-calculator.
 *
 * Kept out of the component and exported on its own so it can be tested. It
 * puts a shekel figure in front of a restaurant owner, and the failure mode
 * that matters is not a crash — it is a number that is quietly too big.
 */

/**
 * Card processing on a direct order, netted off anything called a saving.
 *
 * A direct order is cheaper than a platform order, not free. Leaving this out
 * is the single change that would most inflate the result, which is exactly
 * why it is a named constant rather than an inline number.
 */
export const PROCESSING_RATE = 0.02;

export type CommissionInput = {
  /** Delivery-platform orders per month. */
  monthlyOrders: number;
  /** Average order value in shekels. */
  avgTicket: number;
  /** Platform commission, as a percentage. */
  commissionPct: number;
  /**
   * Share of those orders placed by customers who already know the restaurant
   * and would order direct given somewhere to do it.
   *
   * A slider rather than a constant on purpose: the honest value depends on how
   * much of a restaurant's delivery traffic is regulars, and only the operator
   * knows that. It is also why the result is never the full commission — the
   * platforms bring first-time customers, and that reach is what the commission
   * on those orders buys.
   */
  shiftablePct: number;
};

export type CommissionResult = {
  /** Monthly revenue taken through the platforms. */
  platformRevenue: number;
  /** Commission paid on all of it. */
  commissionPaid: number;
  /** Saving on the shiftable share only, after processing. Never negative. */
  netMonthlySaving: number;
  netYearlySaving: number;
};

export function computeCommission({
  monthlyOrders,
  avgTicket,
  commissionPct,
  shiftablePct,
}: CommissionInput): CommissionResult {
  const platformRevenue = monthlyOrders * avgTicket;
  const commissionPaid = platformRevenue * (commissionPct / 100);

  const movedRevenue = platformRevenue * (shiftablePct / 100);
  // The gap between the two rates, on the orders that actually move — never
  // the whole commission on everything.
  const saving = movedRevenue * (commissionPct / 100 - PROCESSING_RATE);
  const netMonthlySaving = Math.max(0, saving);

  return {
    platformRevenue,
    commissionPaid,
    netMonthlySaving,
    netYearlySaving: netMonthlySaving * 12,
  };
}
