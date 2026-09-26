# DISCOVERY

**From widget to application. DISCOVERY on SAP BW Live data.**

DISCOVERY is a deterministic analytical application foundation built as an SAP Analytics Cloud Custom Widget for SAP BW Live data.

The goal is not to deliver a complete finished analytics application. The goal is to make one thing tangible: **how powerful SAC Custom Widgets can be**.

DISCOVERY is a working example that you can download, try, inspect, change, extend, or use as a starting point for something completely different.

## Status

**Public label:** BETA 1.0  
**Technical build:** 0.8.7  
**Release status:** Community beta

This is an independent community project. It is not an official SAP product, not an SAP-supported component, and does not represent an SAP product commitment.

## What DISCOVERY demonstrates

DISCOVERY takes the data returned by an SAP BW Live query and turns it into an application-like analytical experience inside an SAC Story.

The current beta includes:

- a dedicated hero entry experience before analysis is revealed
- deterministic finding discovery across the bound analysis dimensions
- a guided **ASK** experience with supported natural-language patterns
- value ranking and growth ranking
- prior-year comparison and below-prior-year analysis
- one-dimensional and two-dimensional exploration
- charts, tables, and local country maps
- automatic map availability when a supported country dimension is detected
- monthly or period views and cumulative time-series views
- aligned completed-period YoY logic
- detail navigation and related insights
- total, subtotal, grand-total, and hierarchy-parent protection for detail-grain calculations
- measure switching through the header

DISCOVERY does not use a free-chat or LLM parser. ASK is deterministic and only executes supported analytical intents.

## The most important rule: live context and fair comparison are different things

DISCOVERY deliberately separates the **live context** from the **comparison window**.

If the SAP BW Live result set contains the current open month or current day, that period remains visible in the live experience. YoY calculations use aligned completed periods so that incomplete current periods are not compared with longer prior-year periods.

Example for a monthly result set on September 27, 2026:

```text
Live context:       through Sep 2026
YoY comparison:     Jan-Aug 2026 vs Jan-Aug 2025
```

This means a value shown by DISCOVERY for a YoY table can intentionally differ from a simple full-year total in the SAC Data Analyzer if the Data Analyzer is currently showing different periods.

For the complete rules, read [Time and comparison logic](docs/TIME-LOGIC.md).

## Required data binding

DISCOVERY defines one binding named `discoveryData` with three feeds:

| Feed | Type | Requirement |
| --- | --- | --- |
| `measures` | Main Structure Member | One or more KPI measures |
| `time` | Dimension | Exactly one SAP BW time characteristic, currently `0CALMONTH` or `0CALDAY` |
| `dimensions` | Dimension | One or more analysis dimensions |

### For YoY analysis

The SAP BW Live query must return the periods required for the comparison.

A typical monthly setup includes the current year and the prior year in the query result, for example 2026 and 2025, together with `0CALMONTH`.

DISCOVERY only analyzes what the SAP BW Live query returns. It does not fetch missing years, periods, members, or dimensions on its own.

## Detail rows, totals, and hierarchy rows

DISCOVERY keeps the raw binding result conceptually separate from the detail-grain analytical rows.

For ordinary calculations it excludes:

- subtotal rows
- aggregate rows
- grand total rows
- hierarchy parent rows

This avoids double counting when SAP BW returns detail members together with totals or hierarchy structures.

Grand totals can still be useful for reconciliation, but they are not mixed into ordinary detail-member aggregation.

For non-additive measures and SAP BW exception aggregation, SAP BW remains the source of truth. Do not assume that summing visible members reproduces the SAP BW result for every measure.

## ASK

ASK is a guided deterministic interface. Questions start with `Show me` and can use the dimensions and supported analysis options exposed by the widget.

Examples:

```text
Show me top 10 Product
Show me top 10 Product by growth
Show me Country below prior year
Show me Country by City
Show me top 10 City x Product combinations
Show me Month
Show me Product as table
```

ASK does not guess an omitted dimension, relationship, ranking object, or unsupported intent.

If a question is not supported, DISCOVERY returns a clear message instead of inventing an interpretation.

See [ASK grammar](docs/ASK-GRAMMAR.md) for the current rules and boundaries.

## Geographic analysis

When a supported geographic country dimension is detected, DISCOVERY can enable a local country map.

Current map behavior includes:

- local country geometry with no external map or geocoding service
- fit to returned countries
- mouse-wheel zoom
- drag and pan
- zoom controls
- fit control
- labels for countries represented in the data
- the same aligned YoY comparison ledger used by Discover and ASK

Country mapping is intentionally conservative. City coordinates are not invented.

## Installation in SAP Analytics Cloud

DISCOVERY uses the two-file SAC Custom Widget upload pattern used by this build.

Use these two files:

- `discovery-v0.8.7.json`
- `discovery-v0.8.7.zip`

The ZIP contains `main.js` at its root.

Upload the JSON descriptor and ZIP resource package in the SAC Custom Widget administration flow, then add DISCOVERY to a story and configure the data binding.

Exact administration labels can vary by SAC release and tenant configuration.

## Repository layout

```text
discovery/
├── README.md
├── CHANGELOG.md
├── LICENSE
├── discovery-v0.8.7.json
├── discovery-v0.8.7.zip
├── main.js
└── docs/
    ├── ARCHITECTURE.md
    ├── ASK-GRAMMAR.md
    ├── TEST-CHECKLIST.md
    └── TIME-LOGIC.md
```

## Known boundaries

- BETA 1.0 can still contain edge cases and areas that need optimization.
- The current build is locked to SAP BW Live.
- Time analysis currently requires `0CALMONTH` or `0CALDAY`.
- The widget depends on the rows and metadata exposed by the SAC binding.
- SAC-side row limits and query design can affect high-cardinality analysis.
- ASK supports a defined grammar and is not a general natural-language query engine.
- City mapping is not performed without safe coordinate evidence.
- `supportsMobile`, `supportsExport`, and `supportsBookmark` are disabled in the current descriptor.
- There is no writeback or persistence in this beta.

## Community handoff

DISCOVERY is shared as a community project and reference implementation.

There is no support commitment, SLA, warranty, or obligation to provide implementation help, maintenance, troubleshooting, or compatibility updates.

You are welcome to use, fork, modify, extend, and redistribute the code under the MIT License.

**Download it, try it, take it apart, adapt it, extend it, improve it, or build something completely different with it.**

**Make something out of it.**

## License

DISCOVERY is licensed under the [MIT License](LICENSE).

## Disclaimer

DISCOVERY is an independent community project. It is not an official SAP product and is not supported by SAP.

SAP, SAP Analytics Cloud, SAP BW, SAP BTP, and related SAP marks are trademarks or registered trademarks of SAP SE or its affiliates.
