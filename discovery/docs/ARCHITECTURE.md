# DISCOVERY Architecture

## Purpose

DISCOVERY is a client-side SAP Analytics Cloud Custom Widget for SAP BW Live. It turns the result set supplied by the SAC data binding into a deterministic analytical experience.

The design goal is not to reproduce a full BI platform inside one widget. It is to demonstrate how far an SAC Custom Widget can be pushed toward an application-like experience while remaining inspectable and community-extensible.

## Runtime model

```text
SAP BW Live query
    ↓
SAC data binding
    ↓
BW Live and feed validation
    ↓
row normalization and row classification
    ↓
live rows and completed-analysis rows
    ↓
one aligned comparison ledger
    ↓
Discover / ASK / Map / Chart / Table / Findings / Details
    ↓
rendered application experience inside the SAC Story
```

## Binding gate

The widget validates that:

- a usable SAP BW Live binding is present
- at least one measure is bound
- exactly one time characteristic is bound
- at least one analysis dimension is bound
- the time characteristic resolves to supported day or month granularity

The current build accepts SAP BW `0CALDAY` or `0CALMONTH` style time characteristics.

## Row normalization and protection

The widget separates detail rows from rows that should not participate in ordinary member calculations.

Rows that represent totals, subtotals, aggregate cells, or hierarchy parent nodes are excluded from normal detail-grain calculations.

The core rule is simple:

> Analyze one consistent grain at a time.

This prevents detail rows from being summed together with totals or hierarchy parents.

## Live rows and analysis rows

The current period is handled differently from completed periods.

For monthly data:

- rows through the current month remain available to the live experience
- if the current month is present, it is treated as open
- the completed-period analysis excludes that current month

For day-level data:

- rows through today remain available to the live experience
- if today is present, it is treated as open
- the completed-period analysis excludes today

This separation is what allows DISCOVERY to show the live context without using an incomplete current period in YoY calculations.

See [Time and comparison logic](TIME-LOGIC.md).

## One comparison ledger

Discover, ASK, Map, Chart, Table, Findings, and Details should derive comparison values from the same aligned period logic.

The purpose is to avoid multiple numerical interpretations of the same bound SAP BW result set.

A headline, table row, map color, chart value, and detail view should not disagree because each feature chose a different period window.

## ASK parser

ASK is deterministic.

The parser recognizes a defined grammar based on:

- bound dimension names
- member labels found in the current result set
- time intent
- Top N
- Growth
- Below prior year
- Table output
- explicit one-dimension or two-dimension relationships

The parser rejects unsupported or ambiguous requests instead of passing them to an LLM or guessing the user's intent.

See [ASK grammar](ASK-GRAMMAR.md).

## Geographic analysis

Country geography is detected from the bound dimensions and handled locally.

The map does not rely on an external map or geocoding service. Country geometry and display behavior are part of the widget runtime.

Geo YoY values use the same aligned comparison logic as the rest of DISCOVERY.

City coordinates are not invented. City mapping should only be added with a safe coordinate strategy or known coordinate evidence.

## Measure handling

Measure selection is controlled from the DISCOVERY header.

When the selected measure changes, the existing ASK intent can be preserved and rerun when the intent is still semantically valid.

The widget uses the unit or currency made available by the binding when possible.

For non-additive measures and exception aggregation, SAP BW remains authoritative. A client-side sum of member rows is not guaranteed to reproduce every SAP BW semantic.

## State and presentation

Application state includes:

- active mode
- selected measure
- hero-entry state
- ASK query and result view
- chart or table or map choice
- time-series mode
- insight detail history
- map viewport state

Presentation animation does not change the analytical result.

## External dependencies

The current beta is designed to operate inside SAP Analytics Cloud on the result set delivered to the Custom Widget. It does not require an external AI model for ASK and does not use an external map service for country mapping.
