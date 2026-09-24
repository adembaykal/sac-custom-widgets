# WHY

**Variance Signal Analysis for SAP Analytics Cloud**

WHY is a deterministic SAP Analytics Cloud Custom Widget for investigating a KPI variance.

> You know **what** changed. WHY shows you **where to look first**.

WHY compares period-aligned movement across the dimensions supplied by the SAC binding, consolidates overlapping findings into signal groups, and ranks material signals by their measured impact on the total rate.

There is **no AI backend, no external service, no telemetry, and no writeback**. The analysis runs on the result set supplied to the widget.

## Status

**Version:** 1.0.0  
**Release status:** Public community release

WHY is an independent community project. It is not an official SAP product, not an SAP-supported component, and does not represent an SAP product commitment.

## What WHY is designed to answer

A dashboard can tell you that Gross Revenue is up 4.5 percent. WHY is designed to help answer the next question:

**Which material movements should I inspect first?**

The widget can surface:

- a qualified **Dominant driver**, but only when one signal is materially separated from the rest
- **Countertrends**, where a signal moves in the opposite direction to the overall result
- **Slows growth** and **Amplifies growth** patterns
- **Offsets decline** patterns when the total result is negative
- lifecycle signals such as **New** and **Disappeared**
- **Related evidence**, with the underlying grouped views available for inspection

If no signal genuinely dominates, WHY can explicitly state that **no single signal dominates**.

## Important interpretation

WHY is descriptive, not causal.

A signal impact is a measured contribution to the total rate based on the bound result set. It does **not** prove why the business movement happened.

Signal impacts are also **not an additive bridge**. Overlapping dimensional views are consolidated to avoid double counting, so the visible signal impacts should not simply be added together and expected to equal the total YoY rate.

Color is semantic for impact direction:

- green indicates a positive impact direction
- red indicates a negative impact direction

It does not imply that a business outcome is inherently good or bad.

## Countertrend

A **Countertrend** is a signal whose own movement runs against the overall direction.

Example: total revenue grows, while a specific country, channel, or product combination declines.

This is a descriptive classification only. It is not a causal statement.

## Data binding

WHY defines one binding named `whyData` with three feeds:

| Feed | Type | Purpose |
| --- | --- | --- |
| `measures` | Main Structure Member | KPI measure. One or more measures can be bound. |
| `time` | Dimension | One time dimension for period-aligned comparison. |
| `dimensions` | Dimension | One or more dimensions to scan for material variance signals. |

For the included demo dataset, use:

- **Time:** `Date`, hierarchy off
- **Measure:** `Gross Revenue`
- **Dimensions:** `Country`, `Sales Channel`, `Product Group`

## Period handling

WHY does not require a date selector inside the widget. It derives the comparison periods from the time members actually present in the bound SAC result set.

For monthly data, WHY only labels a comparison as **YTD** when:

- both current and prior periods begin in January
- months are contiguous
- current and prior cover the same month sequence
- both periods end in the aligned comparison month

For example:

`YTD through Sep 2026 vs YTD through Sep 2025`

If the available result set runs from March through September, WHY uses a range label instead of claiming YTD.

## Measure, currency and unit

WHY uses the unit or currency supplied by the SAC binding when it is available.

It does not invent a currency. If no reliable unit or currency is supplied by the model, the widget keeps the values unit-neutral and indicates that the model did not supply one.

## Executive analysis experience

The widget includes a staged analysis sequence before revealing the result:

1. **Scanning dimensions**
2. **Grouping related movements**
3. **Ranking material signals**
4. **Signal map ready**

The sequence is presentation only. The underlying analysis remains deterministic.

The result experience includes:

- total variance and YoY change
- one global dominant driver when the dominance criteria are genuinely met
- material signal cards
- selected-signal behavior that does not redefine the global dominant driver
- prior versus current period chart
- clickable monthly nodes with exact values
- compact aligned prior and current values below the chart
- trend baseline, actual change and gap to trend
- inspectable related evidence
- explanation zone for dimension, signal role and evidence
- English user interface

## Included demo data

The repository includes:

`demo/WHY_Executive_Demo_Dataset.csv`

The dataset is synthetic and exists only to demonstrate the widget behavior.

With the recommended binding, the reference scenario produces approximately:

- Gross Revenue YoY: **+4.5%**
- Total variance: **+EUR 367.4K**
- United Kingdom x Online x Industrial Solutions: **+11.0 pp** measured impact on the total YoY rate
- France x Direct Sales x Consumer Electronics: **-7.6 pp** countertrend

The remaining material signals are intentionally smaller so that the dominant-driver scenario is visually and mathematically clear.

## Installation

The folder contains a ready-to-import SAC package:

`why.zip`

The ZIP contains exactly these two files at its root:

- `why.json`
- `main.js`

Import `why.zip` as a Custom Widget package in SAP Analytics Cloud, then add the widget to a story and configure the binding.

If you prefer to rebuild the package yourself:

```bash
cd why
zip -j why.zip why.json main.js
```

PowerShell:

```powershell
Compress-Archive -Path why.json,main.js -DestinationPath why.zip -Force
```

Exact SAC administration labels can vary by release and tenant configuration.

## Repository layout

```text
why/
├── README.md
├── CHANGELOG.md
├── LICENSE
├── why.json
├── main.js
├── why.zip
├── demo/
│   └── WHY_Executive_Demo_Dataset.csv
└── docs/
    └── TEST-CHECKLIST.md
```

## Known boundaries

- The widget depends on the detail rows and metadata exposed by the SAC binding.
- Very large or high-cardinality result sets can be affected by SAC-side row limits or query design.
- A flat, usable time dimension is required for clean period alignment.
- The UI is currently English only.
- `supportsMobile`, `supportsExport`, and `supportsBookmark` are disabled in the 1.0.0 widget descriptor.
- WHY does not perform causal inference.
- WHY does not call an AI model or external backend.
- WHY does not write data back to SAP Analytics Cloud or the underlying source.

## Support

This software is shared freely as a community project and reference implementation.

**No support commitment is provided.** There is no SLA, no warranty, and no obligation to provide implementation help, troubleshooting, maintenance, or compatibility updates.

You are welcome to use, fork, modify, extend, and redistribute the source code under the MIT License. Reproducible bug reports and pull requests may be submitted through GitHub, but the repository should not be treated as a support channel.

## License

WHY is licensed under the [MIT License](LICENSE).

## Disclaimer

WHY is an independent community project. It is not an official SAP product and is not supported by SAP.

SAP and SAP Analytics Cloud are trademarks or registered trademarks of SAP SE or its affiliates.