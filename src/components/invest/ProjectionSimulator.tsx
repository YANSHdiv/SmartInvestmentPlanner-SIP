import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/format";

/**
 * Illustrative investment simulator.
 *
 * Every rate here is an assumption the person chooses, not a forecast the app
 * produces. Nothing in the deterministic planner engine assumes a return; this
 * panel exists only to show arithmetic under stated assumptions.
 */
export function ProjectionSimulator({
  currency,
  defaultMonthly,
  defaultInitial,
}: {
  currency: string;
  defaultMonthly: number;
  defaultInitial: number;
}) {
  const [monthly, setMonthly] = useState(Math.round(defaultMonthly));
  const [initial, setInitial] = useState(Math.round(defaultInitial));
  const [years, setYears] = useState(10);
  const [growth, setGrowth] = useState(8);
  const [inflation, setInflation] = useState(5);

  const result = useMemo(() => {
    const months = Math.max(Math.round(years * 12), 0);
    const monthlyRate = growth / 100 / 12;
    let value = Math.max(initial, 0);
    for (let month = 0; month < months; month += 1) {
      value = value * (1 + monthlyRate) + Math.max(monthly, 0);
    }
    const contributed = Math.max(initial, 0) + Math.max(monthly, 0) * months;
    const inTodaysMoney = value / (1 + inflation / 100) ** Math.max(years, 0);
    return { value, contributed, inTodaysMoney };
  }, [monthly, initial, years, growth, inflation]);

  const money = (value: number) => formatMoney(value, currency);

  return (
    <section className="panel p-5">
      <h2 className="font-display text-lg font-semibold">Try different assumptions</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Change any figure to see how the arithmetic responds. The growth and inflation rates are
        assumptions you choose, not predictions.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Amount each month" value={monthly} onChange={setMonthly} />
        <Field label="Amount to start with" value={initial} onChange={setInitial} />
        <Field label="Number of years" value={years} onChange={setYears} max={50} />
        <Field label="Assumed yearly growth (%)" value={growth} onChange={setGrowth} max={30} />
        <Field
          label="Assumed yearly inflation (%)"
          value={inflation}
          onChange={setInflation}
          max={30}
        />
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="eyebrow">You would have put in</dt>
          <dd className="font-display text-lg font-semibold">{money(result.contributed)}</dd>
        </div>
        <div>
          <dt className="eyebrow">Illustrated value after {years} years</dt>
          <dd className="font-display text-lg font-semibold">{money(result.value)}</dd>
        </div>
        <div>
          <dt className="eyebrow">Worth in today's money</dt>
          <dd className="font-display text-lg font-semibold">{money(result.inTodaysMoney)}</dd>
        </div>
      </dl>

      <p className="mt-4 rounded-md bg-secondary p-3 text-xs">
        Illustration only — actual investment returns can be higher or lower, and can be negative
        for long stretches. This is not a projection of what your money will do.
      </p>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  max = 100_000_000,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
}) {
  const id = label.replace(/[^a-z]+/gi, "-").toLowerCase();
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(event) => onChange(Math.min(Math.max(Number(event.target.value) || 0, 0), max))}
        className="mt-1"
      />
    </div>
  );
}
