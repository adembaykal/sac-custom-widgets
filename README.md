# Executive Pulse — SAC Custom Widget

A deterministic narrative widget for SAP Analytics Cloud. When a supported KPI changes, it identifies the largest adverse contributors by calculated impact and renders a step-by-step animated executive view with inline evidence.

The runtime analysis is deterministic and does not call an LLM or generative AI service. No backend is required.

![Executive Pulse](Executive%20Pulse.png)

---

## What it does

1. **Hero KPI** — current vs. prior period delta with polarity-aware color
2. **Contributor ranking** — ranks members of the analysis dimension by their calculated impact on the KPI change
3. **Explanation layer** — breaks down the selected contributor across a second dimension

The widget uses predefined deterministic rules applied to the bound data at runtime. It is designed for additive KPIs (e.g. Revenue, Costs) where member deltas can be aggregated meaningfully.

---

## Files

| File | Purpose |
|------|---------|
| `executive-pulse.zip` | Upload this to SAC |
| `index.json` | Widget manifest |
| `main.js` | Widget source |

---

## Installation

1. Download `index.json` and `executive-pulse.zip`
2. In SAC: **Files → Upload** → select the ZIP
3. Add the widget to a story page
4. Bind your data using the SAC Custom Widget data binding panel
5. Set the properties (KPI label, unit, polarity, period labels)

Refer to the SAC documentation for Custom Widget upload and data binding.

---

## Required Data Binding

One data binding with the following feeds:

- **1 KPI measure** (e.g. Revenue)
- **1 time dimension** (e.g. Year) — must have exactly 2 members (current + prior period)
- **1 analysis dimension** (e.g. Product Line, Region)
- **1 explanation dimension** *(optional)* — second breakdown dimension

Works with compatible SAP Analytics Cloud data bindings.

---

## Properties

| Property | Default | Description |
|----------|---------|-------------|
| `kpiLabel` | `Revenue` | KPI name shown in the narrative |
| `kpiUnit` | *(empty)* | Unit prefix, e.g. `€` or `$` |
| `kpiPolarity` | `higher-is-better` | Use `lower-is-better` for Costs, Defects |
| `currentYear` | `2026` | Label for the current period |
| `priorYear` | `2025` | Label for the prior period |
| `dimLabel` | `Segment` | Display label for the analysis dimension |

---

## Limitations

- Designed for additive KPIs where member deltas can be aggregated meaningfully
- Time dimension must contain exactly 2 periods (current and prior)
- Tested in SAC; behavior in other environments is not guaranteed

---

*Provided as-is. No warranty, no support commitment.*
