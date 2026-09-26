# Time and Comparison Logic

This document explains the period rules used by DISCOVERY BETA 1.0, technical build 0.8.7.

## Why the logic exists

A live SAP BW query can already contain the current open period. Comparing that incomplete period with a longer prior-year period can produce a misleading YoY result.

DISCOVERY therefore separates two concepts:

1. **Live context** - what the SAP BW Live query currently returns and what the user can still see.
2. **Comparable analytical window** - aligned completed periods used for YoY analysis.

The guiding principle is:

> Show what is live. Compare what is fairly comparable.

## Monthly example

Assume the current date is September 27, 2026 and the query returns monthly data for 2025 and 2026, including September 2026.

DISCOVERY can show:

```text
Live through Sep 2026
Comparison: Jan-Aug 2026 vs Jan-Aug 2025
```

September 2026 stays part of the live context, but the completed-period YoY comparison stops at August.

## Daily example

If the query returns data through the current day, today can remain visible in the live context while the comparison analysis uses completed days before today.

## Required periods

DISCOVERY does not fetch missing history.

For prior-year YoY analysis, the required current and prior-year periods must already exist in the SAP BW Live result set supplied by SAC.

A typical monthly query therefore includes:

- current year
- prior year
- `0CALMONTH`
- the required analysis dimensions
- one or more measures

## Aligned periods

Current and prior values are calculated against the same aligned end point.

If the completed current comparison window is Jan-Aug 2026, the corresponding prior window is Jan-Aug 2025.

The widget must not compare Jan-Aug 2026 with Jan-Dec 2025 and call that a YoY comparison.

## Full year is not YTD

If a comparison covers January through December of a completed year, DISCOVERY labels that period as a year total, for example:

```text
2025 total vs 2024 total
```

It should not call a complete calendar year YTD.

## Why Data Analyzer numbers can look different

The SAC Data Analyzer may show a different aggregation window from DISCOVERY.

For example, the Data Analyzer can show:

```text
2026: Jan-Sep
2025: Jan-Dec
```

while DISCOVERY is using:

```text
2026: Jan-Aug
2025: Jan-Aug
```

Both views can be mathematically correct for their own selected periods. They are not directly comparable until the period windows are aligned.

When validating DISCOVERY, expand or filter the Data Analyzer to the same months or days used by the DISCOVERY comparison label.

## Groups with activity only in the open period

A member or dimension combination can exist in the live SAP BW result set but have zero values in both aligned completed periods.

Example:

```text
City A
Jan-Aug 2026: 0
Jan-Aug 2025: 0
Sep 2026:     value exists
```

DISCOVERY keeps that live grouping visible in supported ASK tables instead of silently dropping it.

Its aligned comparison can therefore display:

```text
Current comparable period: 0
Prior comparable period:   0
Change:                    n/a
Change %:                  n/a
```

This preserves live-result visibility without inventing a growth percentage where no comparable base exists.

## One numerical truth

The same aligned comparison logic should be used across:

- Discover
- ASK
- Map
- Chart
- Table
- Findings
- Details

A view should not silently choose a different comparison period.

## Totals and hierarchy rows

Period alignment does not override row-grain rules.

Totals, subtotals, grand totals, and hierarchy parent rows must not be mixed with detail rows in ordinary calculations. Otherwise the same business value can be counted more than once.

## Validation rule

When a number looks surprising, validate in this order:

1. Confirm the same SAP BW Live query and filters.
2. Confirm the same measure.
3. Confirm the exact current and prior comparison-period labels in DISCOVERY.
4. Align the Data Analyzer to those same periods.
5. Compare at the same dimension grain.
6. Confirm that totals or hierarchy parents are not being mixed with detail rows.
