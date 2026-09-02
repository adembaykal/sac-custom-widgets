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
5. Set the properties (KPI label, unit, polarity)

Refer to the SAC documentation for Custom Widget upload and data binding.

---

## Required Data Binding

One data binding with three feeds:

| Feed | Required | Description |
|------|----------|-------------|
| **Measures** | Yes | Exactly one KPI measure (e.g. Revenue) |
| **Analysis dimensions** | Yes | 1 or 2 dimensions (e.g. Region, Product). Calendar Year and Calendar Year/Month must **not** be placed here. |
| **Time** | Yes | Exactly one time dimension: Calendar Year (`0CALYEAR`) or Calendar Year/Month (`0CALMONTH`) |

The data must contain at least two distinct calendar years. If only one year is present the widget shows a setup message.

---

## Time Comparison

**Calendar Year (`0CALYEAR`):** Year-over-year comparison. Labels show `2026 vs. 2025`.

**Calendar Year/Month (`0CALMONTH`):** Period-set comparison using only the months actually delivered by the data. No YTD inference, no automatic gap filling. Labels reflect the actual period range (e.g. `Jan–Sep 2026 vs. Jan–Sep 2025`).

**Comparison modes** (property `comparisonMode`):

| Mode | Behavior |
|------|----------|
| `same-period` *(default)* | Intersects current and prior year months. Only months present in both years are compared. |
| `all-prior` | Current year all delivered months vs. prior year all delivered months. |

**BW/4 Live Queries:** Result rows (`@TotalMember`) are filtered automatically. Ensure your query delivers individual member rows.

---

## Not supported

- Fiscal Year / Fiscal Period
- Calendar Week
- Non-calendar time characteristics
- More than two analysis dimensions
- More than one time dimension in the Time feed
- Calendar Year or Year/Month placed in the Analysis dimensions feed

If an unsupported configuration is detected, Executive Pulse shows a setup message instead of rendering.

---

## Properties

| Property | Default | Description |
|----------|---------|-------------|
| `kpiLabel` | `Revenue` | KPI name shown in the narrative |
| `kpiUnit` | *(empty)* | Unit prefix, e.g. `€` or `$` |
| `kpiPolarity` | `higher-is-better` | Use `lower-is-better` for Costs, Defects |
| `dimLabel` | `Segment` | Display label for the analysis dimension |
| `comparisonMode` | `same-period` | See Time Comparison above |
| `currentYear` | *(empty)* | Legacy: manual period label override |
| `priorYear` | *(empty)* | Legacy: manual period label override |

---

## Limitations

- Designed for additive KPIs where member deltas can be aggregated meaningfully
- Tested in SAC; behavior in other environments is not guaranteed

---

*Provided as-is. No warranty, no support commitment.*
