# UNFOLD

**One KPI. One click. An entire analytical experience unfolds.**

UNFOLD is an SAP Analytics Cloud Custom Widget experiment that turns a single KPI into a staged analytical experience. It starts with one signal, unfolds into an executive overview, supports focused analysis and comparison, expands into a multi-view analytical experience, and can fold back into the original KPI.

**Version:** 0.5.5  
**Status:** Community release

This is an independent community project. It is not an official SAP product, not an SAP-supported component, and does not represent an SAP product commitment.

## What UNFOLD demonstrates

UNFOLD is deliberately more than one visualization. It demonstrates how a single SAC Custom Widget can orchestrate a connected analytical journey.

The current build includes:

- keynote-style Hero KPI reveal and unfolding transition
- subtle positive, negative and neutral signal pulse
- embedded Demo Mode
- SAP Live Mode through SAC Data Binding
- SAP Live measure unit and currency display when the bound result provides one unambiguous unit
- explicit Live Ready screen and manual refresh before live data is loaded
- multiple measures and analysis dimensions
- current vs previous period comparison
- automatic SAP BW `0VTYPE` recognition when it is part of the bound analysis dimensions
- Actual vs Plan, Actual vs Forecast and Plan vs Forecast comparisons when the corresponding members are returned
- country-first geographic analysis
- optional compact city markers with tooltips
- zoomable and pannable maps
- filter propagation through the analytical context
- KPI, trend, heatmap, scatter, structure and detail analysis
- Sankey-based commercial flow analysis
- focused KPI analysis
- multi-tab Full Analysis
- Spotlight Mode for individual analytical cards
- Compare Spotlight for two analytical cards
- deterministic Explain this view summaries
- Guided Story Mode
- full collapse and state reset back to the original KPI

## Recommended SAC layout

For the intended visual experience, place UNFOLD on a sufficiently large canvas and set the widget size in the SAC Designer to:

- **Width: 100%**
- **Height: 100%**

UNFOLD is designed as a full analytical experience rather than a small dashboard tile.

## Files

- `UNFOLD-v0.5.5.json` - Custom Widget descriptor
- `UNFOLD-v0.5.5.zip` - widget package containing `main.js` at ZIP root
- `main.js` - source
- `README.md` - setup and behavior
- `CHANGELOG.md` - release history
- `LICENSE` - MIT License

## Modes

### Demo Mode

Demo Mode uses an embedded deterministic showcase dataset. No model setup is required.

It is intended for exploring the interaction model, animation, maps, filters, Spotlight Mode, Compare Spotlight, Explain this view and Guided Story Mode.

### SAP Live Mode

SAP Live Mode uses the result set supplied through SAC Data Binding.

The live experience does not start automatically. UNFOLD first shows the Live Ready screen so the binding can be presented or reviewed in the SAC Builder. Click the refresh symbol to load the bound result set and start the KPI experience.

Demo Mode data and SAP Live Mode data are not mixed.

The current release was tested extensively with SAP BW Live. Other live source combinations should be validated against their own binding shape and semantics before use.

## Data Binding

The descriptor exposes one binding named `liveData` with three feeds.

| Feed | Type | Purpose |
| --- | --- | --- |
| `measures` | Main Structure Member | One or more measures |
| `time` | Dimension | Optional, recommended for trend and time comparison |
| `dimensions` | Dimension | One or more analysis dimensions |

### Measures

Bind one or more measures.

The first available measure becomes the initial Hero KPI. Additional measures can be selected inside the analytical experience.

### Units and currencies

In SAP Live Mode, UNFOLD reads measure units or currencies from the bound result when SAC provides them.

When a measure resolves to one unambiguous unit, the unit is carried into KPI and analytical value formatting, for example `76.1K EUR`. If the result contains no unit or contains mixed units for the same measure, UNFOLD does not invent one.

### Time Dimension

A time characteristic is optional but recommended for trends and time-based comparisons.

For the SAP BW Live tests, `0CALMONTH` was used.

### Analysis Dimensions

Bind the dimensions that should be available for analysis, filtering and structure views.

Examples include:

- Country
- City
- Region
- Product
- Division
- Distribution Channel
- Sales Person
- `0VTYPE`

UNFOLD uses the metadata returned through SAC to identify useful semantic roles. Separate feeds for Country, City, Product, Channel or `0VTYPE` are not required.

## SAP BW 0VTYPE

If SAP BW value type `0VTYPE` is part of the bound analysis dimensions, UNFOLD detects it automatically.

Recognized values:

- `10` = Actual
- `20` = Plan
- `30` = Forecast

When the corresponding members are present in the live result set, UNFOLD can expose:

- Actual vs Plan
- Actual vs Forecast
- Plan vs Forecast

If `0VTYPE` is not available, UNFOLD uses its normal time-based comparison logic.

A comparison can only use values actually returned by the live result set. If a query or filter restricts `0VTYPE` to one member, UNFOLD cannot calculate a comparison against a member that was not returned.

## Geography

Country is the leading geographic level.

When a supported Country dimension is available, UNFOLD can render a local country-based map without an external map service or external geocoding.

Current interaction includes:

- zoom in and out
- mouse wheel or trackpad zoom
- drag to pan
- reset
- click a country to zoom toward it
- optional compact city markers when a recognized City dimension is available

City labels are intentionally kept out of the default map surface to avoid clutter. Details are available through tooltips.

City markers depend on the local city mapping included in the widget. UNFOLD does not invent coordinates for unknown cities.

## Explain this view

Explain this view is deterministic. It does not use a free-chat interface or an LLM.

It summarizes the current analytical state in a small number of statements using data already available to the widget.

## Compare Spotlight

Select two analytical cards to open them side by side in a larger comparison view. Both cards keep the current analytical context.

## Guided Story Mode

Guided Story Mode turns the current analytical state into a short staged sequence. Depending on the available context, the story can move through elements such as:

1. Signal
2. Driver
3. Geography
4. Trend
5. Structure

The story can be played, paused or navigated manually.

## Collapse and reset behavior

`Collapse to KPI` returns UNFOLD to the original entry state for the current mode.

Transient state is cleared, including filters, tab selection, map zoom, city overlay state, comparison selection, Spotlight state and temporary analytical selections.

## Important aggregation note

SAP BW remains the semantic source of truth for SAP BW Live scenarios.

UNFOLD analyzes the result set returned through SAC and performs local comparisons and regrouping for the widget experience. Additive measures are the safest fit for locally recomposed totals.

Ratios, averages, distinct counts, exception aggregation and other non-additive measures should be validated against the source semantics before public use.

For the release tests, selected Actual vs Plan calculations were reconciled against the corresponding SAP BW Data Analyzer extract.

## Current boundaries

UNFOLD is a showcase and community experiment, not a replacement for the SAC analytical runtime or the semantics of the connected source.

Current boundaries include:

- no AI backend
- no free-form ASK
- no writeback
- no persistence layer
- no external geocoding
- no invented geography
- no automatic retrieval of data that is not part of the bound live result set
- local analytical regrouping must be validated for non-additive measures

## Suggested release test

Before using a new build, test the relevant mode and data combination, including:

- initial Hero reveal and unfold transition
- Live Ready refresh
- multiple measures
- SAP Live unit or currency display for monetary and unit-bearing measures
- `0VTYPE` Actual, Plan and Forecast comparisons
- filters
- map zoom, pan, reset and city markers
- Spotlight open and close by X, backdrop and ESC
- Compare Spotlight
- Explain this view
- Guided Story Mode
- all Full Analysis tabs
- repeated navigation in and out of Full Analysis
- Collapse to KPI and state reset
- resizing with SAC Builder open and closed

## License

MIT. See [LICENSE](LICENSE).

---

*SAP and SAP Analytics Cloud are trademarks or registered trademarks of SAP SE or its affiliates.*
