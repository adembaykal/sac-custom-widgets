# Executive Pulse - SAC Custom Widget

A deterministic narrative widget for SAP Analytics Cloud. For a supported KPI comparison, it identifies the largest adverse contributors by calculated impact and renders a step-by-step animated executive view with inline evidence.

The runtime analysis is deterministic and does not call an LLM or generative AI service. No backend is required.

![Executive Pulse](Executive%20Pulse.png)

---

## What it does

1. **Hero KPI** - current vs. prior period delta with polarity-aware color
2. **Contributor ranking** - ranks members of the contributor dimension by their calculated impact on the KPI change
3. **Explanation layer** - breaks down the selected contributor across a second analysis dimension (if bound)

Designed for additive KPIs (e.g. Revenue, Costs) where member deltas can be aggregated meaningfully.

---

## Files

| File | Purpose |
|------|---------|
| `executive-pulse.zip` | Upload this to SAC |
| `index.json` | Widget manifest (source reference) |
| `main.js` | Widget source (source reference) |

---

## Installation

1. Download `executive-pulse.zip`
2. In SAC: **Files → Upload** → select the ZIP
3. Add the widget to a story page
4. Bind your data using the SAC data binding panel
5. Set the widget properties (KPI label, unit, polarity)

`index.json` and `main.js` are source files in this repository and are not required as separate installation steps.

Refer to the SAC documentation for Custom Widget upload and data binding.

---

## Required Data Binding

One data binding with three feeds:

| Feed | Required | Description |
|------|----------|-------------|
| **Measures** | Yes | Exactly one KPI measure (e.g. Revenue) |
| **Analysis dimensions** | Yes | 1 or 2 business dimensions (e.g. Region, Product). Calendar Year and Calendar Year/Month must **not** be placed here. |
| **Time** | Yes | Exactly one time dimension: Calendar Year (`0CALYEAR`) or Calendar Year/Month (`0CALMONTH`) |

Without a valid Time dimension, Executive Pulse does not render and shows a setup message.

The data must contain at least two distinct calendar years. If only one year is present, a setup message is shown.

---

## Analysis Dimension Logic

When **two Analysis Dimensions** are bound:
- The dimension with **fewer distinct members** becomes the **Contributor Dimension** (executive layer)
- The other dimension becomes the **Explanation Dimension** (breakdown layer)

When **one Analysis Dimension** is bound, only the contributor layer is shown. There is no explanation layer.

The assignment is based primarily on the number of distinct members in the delivered data. If both dimensions have the same number of distinct members, binding order is used as the tie-breaker.

---

## Time Comparison

Executive Pulse evaluates the calendar periods delivered by the binding. It does not interpret BW variable, user-exit, or query semantics.

**Calendar Year (`0CALYEAR`):** Year-over-year comparison. Labels show e.g. `2026 vs. 2025`. The `comparisonMode` property has no effect in this mode.

**Calendar Year/Month (`0CALMONTH`):** Period-set comparison using only the months actually delivered by the data. No YTD inference, no automatic gap filling, no construction of periods not present in the data. Labels reflect the actual delivered period set. Contiguous periods may be shown as Jan-Sep 2026; non-contiguous periods are represented without implying continuity.

**Comparison modes** (`comparisonMode` - applies to Calendar Year/Month only):

| Mode | Behavior |
|------|----------|
| `same-period` *(default)* | Only month numbers present in **both** the current and prior year are included on each side |
| `all-prior` | All delivered current-year months vs. all delivered prior-year months |

No Full-Year or YTD label is inferred from the comparison result.

---

## BW/4HANA Live Support

Executive Pulse has been tested with BW/4HANA Live queries in SAC. Result total rows (`@TotalMember`) are filtered automatically and do not affect contributor aggregation or period resolution.

The widget works exclusively with the delivered result rows and member values. It does not interpret BW variable, user-exit, or query semantics beyond what is present in the delivered data.

---

## Not Supported

If an unsupported configuration is detected, Executive Pulse shows a setup message and does not render.

- Fiscal Year / Fiscal Period
- Special Periods
- Calendar Year/Week
- Quarter-only time characteristics
- Other non-calendar time characteristics
- More than two Analysis Dimensions
- More than one dimension in the Time feed
- Calendar Year or Calendar Year/Month placed in the Analysis Dimensions feed
- BW queries with two structures
- Custom time semantics that cannot be derived from delivered Calendar Year or Calendar Year/Month member IDs

---

## Properties

Note: The properties listed below are currently defined in the widget manifest and documented here, but they are not yet exposed as dedicated controls in the SAC Styling panel. Dedicated Styling/Properties controls are planned for Executive Pulse v4.

| Property | Default | Description |
|----------|---------|-------------|
| `kpiLabel` | `Revenue` | KPI name shown in the narrative |
| `kpiUnit` | *(empty)* | Unit prefix, e.g. `€` or `$` |
| `kpiPolarity` | `higher-is-better` | Use `lower-is-better` for Costs, Defects |
| `dimLabel` | `Segment` | Display label for the contributor dimension |
| `comparisonMode` | `same-period` | Calendar Year/Month only. `same-period` = intersection of months in both years · `all-prior` = all delivered months on each side |

---

## Limitations

- Designed for additive KPIs where member deltas can be aggregated meaningfully
- Tested in SAC Stories; behavior in other environments is not guaranteed

---

*Provided as-is. No warranty, no support commitment.*
