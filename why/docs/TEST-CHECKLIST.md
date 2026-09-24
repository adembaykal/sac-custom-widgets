# WHY 1.0.0 Test Checklist

This checklist documents the reference validation scenario used for the 1.0.0 release.

## Demo binding

Use `demo/WHY_Executive_Demo_Dataset.csv`.

- Time: `Date`, hierarchy off
- Measure: `Gross Revenue`
- Dimensions: `Country`, `Sales Channel`, `Product Group`

## Expected headline results

Rounded values in the reference demo:

- YTD through Sep 2026 vs YTD through Sep 2025
- Gross Revenue YoY: +4.5%
- Total variance: +EUR 367.4K
- Dominant driver: United Kingdom x Online x Industrial Solutions
- Dominant driver impact: +11.0 pp
- Dominant driver movement: +67.1% vs +4.5% overall
- Trend baseline: +EUR 54.9K
- Actual change: +EUR 818.7K
- Gap to trend: +EUR 763.8K
- France x Direct Sales x Consumer Electronics: -7.6 pp, Countertrend
- Partner Sales: -1.1 pp, Slows growth
- Italy: -1.0 pp, Countertrend
- Germany: -0.9 pp, Slows growth

## Interaction checks

- Start screen loads without an internal vertical scrollbar.
- WHY? launches the staged analysis experience.
- Signal map ready remains visible before the result reveal.
- Result screen shows one global dominant driver for the demo case.
- Selecting another signal changes chart, values, narrative and evidence.
- Selecting another card does not relabel it as the global dominant driver.
- Selected signal card remains white and uses the blue border as the selection indicator.
- Related evidence opens and exposes the grouped views behind the count.
- Monthly chart nodes are clickable and show exact Prior and Current values.
- Why this signal matters remains fully visible at the validated reference size.
- Info screen explains Countertrend and the distinction between YoY percent and signal impact in pp.

## Period-label checks

- Jan through aligned current month, contiguous in current and prior, displays YTD.
- Mar through Sep must not be labeled YTD.
- Missing months must not be labeled YTD.
- Different current and prior start months must use the actual available range instead of YTD.

## Interpretation checks

- Signal impacts are not treated as an additive bridge.
- Related views are grouped to avoid presenting overlapping evidence as independent drivers.
- No causal wording is introduced.
- Currency is displayed only when supplied by the binding.