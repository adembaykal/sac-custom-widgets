# Changelog

## 1.0.0

Initial public release of WHY, Variance Signal Analysis for SAP Analytics Cloud.

### Included

- deterministic current versus prior variance analysis on the bound SAC result set
- global material-signal ranking
- qualified dominant-driver logic with explicit fallback when no single signal dominates
- overlapping-view consolidation to reduce double counting
- inspectable related evidence
- signal semantics for Amplifies growth, Slows growth, Offsets decline and Countertrend
- lifecycle flags for New and Disappeared
- data-driven YTD and period-range labeling
- explicit separation of total YoY percent from signal impact in percentage points
- native unit and currency inheritance when supplied by the SAC binding
- interactive prior versus current monthly chart with clickable exact values
- compact period values below the chart
- trend baseline, actual change and gap-to-trend explanation
- selected-signal inspection without redefining the global dominant driver
- executive multi-phase analysis experience with Signal map ready reveal
- no internal result-screen or loader scrollbar in the validated reference layout
- white selected signal cards with blue selection border
- English UI
- synthetic executive demo dataset

### Architecture

- no AI model
- no backend service
- no telemetry
- no writeback
- no external runtime dependency required by the widget logic

### Release basis

Version 1.0.0 promotes the validated `0.16.2 TEST` build to the first public release without changing its analysis behavior.