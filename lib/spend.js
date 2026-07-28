// Turn the raw cost log into month buckets and totals for the Spending screen.

export function monthlySpend(costs, monthsBack = 6, now = new Date()) {
  const buckets = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString(undefined, { month: 'short' }),
      year: d.getFullYear(),
      total: 0,
    });
  }
  const index = Object.fromEntries(buckets.map((b) => [b.key, b]));
  for (const c of costs) {
    const d = new Date(c.at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (index[key]) index[key].total += c.cost;
  }
  return buckets;
}

export function spendSummary(costs, now = new Date()) {
  const total = costs.reduce((s, c) => s + c.cost, 0);
  const y = now.getFullYear();
  const thisYear = costs
    .filter((c) => new Date(c.at).getFullYear() === y)
    .reduce((s, c) => s + c.cost, 0);
  const last12 = costs
    .filter((c) => (now - new Date(c.at)) / 86400000 <= 365)
    .reduce((s, c) => s + c.cost, 0);
  return { total, thisYear, last12 };
}

export const money = (n) =>
  '$' + Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
