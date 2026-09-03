# Executive Pulse — SAC Custom Widget

Deterministic narrative engine: finds the biggest adverse contributor across one analysis dimension, renders a 3-step animated build-up with inline evidence. No AI/LLM required.

---

## Files

| File | Purpose |
|------|---------|
| `executive-pulse.zip` | Upload this to SAC |
| `index.json` | Widget manifest |
| `main.js` | Widget source |
| `styling.js` | Styling panel source |

---

## Installation

1. Download `executive-pulse.zip`
2. In SAC: **Files → Upload** → select the ZIP
3. Add the widget to a story page
4. Connect your data source in the **Data** tab
5. Configure properties in the **Styling** panel

---

## Required Data Binding

| Feed | Role |
|------|------|
| Measure | KPI measure (additive, e.g. Revenue, Costs) |
| Dimension | Analysis dimension (e.g. Region, Product, Channel) |
| Time | Calendar Year (`0CALYEAR`) or Year/Month (`0CALMONTH`) |

---

## Properties

All properties are available as visible controls directly in the SAC **Styling** panel under **Custom Widget Additional Properties**. Changes are applied immediately to the widget when you click **Apply** — no story save or browser refresh required.

### KPI Settings

| Property | Control | Default | Description |
|----------|---------|---------|-------------|
| `kpiLabel` | Text field | `Revenue` | KPI name shown in the narrative |
| `kpiUnit` | Text field | *(empty)* | Unit prefix for values (e.g. `€`, `$`) |
| `kpiPolarity` | Dropdown | `higher-is-better` | `higher-is-better` (Revenue, Sales) or `lower-is-better` (Costs, Defects) |

### Dimension

| Property | Control | Default | Description |
|----------|---------|---------|-------------|
| `dimLabel` | Text field | `Segment` | Display label for the analysis dimension (e.g. Region, Product, Channel) |

### Time Comparison

| Property | Control | Default | Description |
|----------|---------|---------|-------------|
| `comparisonMode` | Dropdown | `same-period` | Applies to Calendar Year/Month only — has no effect with Calendar Year |

#### comparisonMode values

| Value | Behavior |
|-------|----------|
| `same-period` | Current-year months compared to the same calendar months in the prior year |
| `all-prior` | Current-year periods compared to all available prior-year periods |

---

## Release Notes

### v4.0.0
- All properties are now available as visible controls in the SAC Styling panel under "Custom Widget Additional Properties"
- Changes apply immediately on Apply — no save or refresh required
- `comparisonMode` configurable via dropdown (Calendar Year/Month only)
- `currentYear` and `priorYear` properties removed (auto-resolved since v3)

### v3.0.0
- Stable release — deterministic narrative engine with BW Live support
