# Changelog

## BETA 1.0 - technical build 0.8.7

Community beta release of DISCOVERY for SAP BW Live.

### Application experience

- Added a true hero screen before any SAP BW Live analysis result is revealed.
- Added centered responsive hero layout and animated DISCOVERY signature line.
- Added animated analytical hero visual and BETA 1.0 label.
- Preserved a clear transition from entry screen to analysis experience.

### Discover

- Added deterministic finding discovery across bound analysis dimensions.
- Added unusual-pattern, trend, ranking, mix, activity-gap, and related-insight experiences where supported by the available data.
- Added detail navigation with history behavior.
- Added monthly or period and cumulative time-series views.

### ASK

- Renamed the action button to `Run`.
- Removed duplicate measure selection from ASK. Measure selection is controlled by the header.
- Removed ambiguous default dimension behavior.
- Removed silent Top-N truncation for ordinary multi-dimensional queries.
- Added deterministic Growth ranking with a prior-year materiality guard.
- Added clearer rejection of ambiguous or unsupported questions.
- Added partial-token chip completion and duplicate-dimension protection.
- `Country by City` now returns the complete live grouping set and defaults to Table.
- Groups with no value in the aligned completed comparison window remain visible instead of silently disappearing.
- Large chart requests return guidance instead of unreadable charts.
- Clear resets the ASK query and result state.

### Time and numerical consistency

- Unified Discover, ASK, Map, Chart, Table, Findings, and Details around aligned comparison logic.
- Current open periods remain visible in the live context while YoY comparisons use aligned completed periods.
- Full-year periods are labeled as totals rather than YTD.
- Added explicit current and prior comparison-period labels in ASK results.

### SAP BW row handling

- Added protection against mixing totals, subtotals, hierarchy parents, and grand totals with ordinary detail rows.
- Preserved SAP BW as the authority for non-additive and exception-aggregated measures.

### Map

- Added automatic country-map availability when supported geo data is present.
- Added local country geometry, zoom, pan, fit, and data-country labels.
- Corrected France selection to Metropolitan France plus Corsica instead of French Guiana.
- Unified Geo YoY calculations with the same aligned comparison period used elsewhere.
- Fixed a Map runtime error caused by a missing display-ring override definition.
- Empty ASK results no longer surface a misleading geo-matching error.

### Table

- Improved width usage and row-count visibility.
- Added complete live-grouping visibility while keeping aligned-period comparison values explicit.
