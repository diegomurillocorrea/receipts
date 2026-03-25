-- Backfill commission for existing payments.
-- Rules: $0.50 → $0.25; $1 → $0.50; >$1 and <$50 → $1; >=$50 and <$100 → $2; >=$100 and <$150 → $3; etc.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

UPDATE payments
SET commission = CASE
  WHEN total_amount IS NULL OR total_amount < 0 THEN 0
  WHEN total_amount = 0 THEN 0
  WHEN total_amount = 0.5 THEN 0.25
  WHEN total_amount = 1 THEN 0.5
  WHEN total_amount > 1 AND total_amount < 50 THEN 1
  ELSE FLOOR(total_amount / 50)::numeric + 1
END
WHERE commission IS NULL;

-- Optional: update all rows (recalculate commission for every payment)
-- Uncomment the line below and comment the WHERE above if you want to recalc all.
-- WHERE true;
