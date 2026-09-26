# DISCOVERY BETA 1.0 Test Checklist

This checklist documents the main regression checks for technical build 0.8.7.

## Binding prerequisites

- SAP BW Live binding is accepted.
- At least one measure is bound.
- Exactly one supported time characteristic is bound.
- `0CALMONTH` or `0CALDAY` resolves correctly.
- At least one analysis dimension is bound.
- Current and prior periods required for YoY are present when testing YoY features.

## Hero screen

- The initial screen reveals no real analytical findings before the CTA.
- Hero content stays centered when the widget is resized within the validated layout range.
- DISCOVERY signature line animates subtly.
- The small analytical bar visual animates without changing analytical data.
- BETA 1.0 is visible.
- `Enter the experience` transitions into the analytical application.

## Context and period labels

- Live-through label reflects the latest live period supplied within the current date boundary.
- The current open month or day remains visible in the live context.
- YoY uses aligned completed periods.
- A full completed calendar year is labeled as a total, not YTD.
- ASK result header shows the explicit current and prior comparison periods.

## Discover

- Discover can return a quiet state when no material pattern passes the thresholds.
- Findings use explanatory sentences rather than unexplained numbers.
- Related Insights remain clickable when present.
- Detail navigation can return to the prior insight state.
- Ranking headline and ranking detail use consistent values.
- Monthly or period and cumulative time-series modes switch without changing the underlying anomaly logic.

## ASK parser

- `Show me top 10 Product` runs when Product is bound.
- `Show me top 10 Product by growth` requires prior-year data and uses the growth guard.
- `Show me Country below prior year` compares row-specific aligned values.
- `Show me Country by City` returns all matching live groupings and defaults to Table.
- `Show me top 10 City x Product combinations` is accepted when both dimensions are bound.
- `Show me top 10 Product by City` is rejected as ambiguous.
- `Show me top 10 Product in each City` is rejected in the current beta.
- `Show me ranking top 10` does not silently default to a dimension.
- `Show me as table` does not silently default to a dimension.
- partial tokens can be completed by a dimension chip
- duplicate dimensions are rejected
- Clear resets query and result state

## Live grouping visibility

- Groupings that exist only in the open live period are not silently removed from a normal multi-dimensional ASK table.
- If both aligned comparison values are zero, the grouping can remain visible with no invented percentage change.
- Result count matches the visible grouping set within the bound result-set limits.

## Map

- Map opens without a runtime error.
- Map is only offered when a supported country dimension is detected.
- country labels match the data countries
- mouse-wheel zoom works
- drag and pan work
- plus and minus zoom controls work
- Fit returns the view to the data countries
- France displays Metropolitan France and Corsica for the France selection behavior
- Map YoY uses the same aligned period as Discover and ASK
- an empty ASK result does not display a misleading geo-matching error

## Table and chart

- Tables use available width without a large phantom blank area.
- Row count is visible for large table results.
- Ordinary queries are not silently truncated to Top 10.
- Large combination results can show guidance instead of an unreadable chart.

## SAP BW row-grain protection

- subtotal rows do not participate as detail members
- hierarchy parent rows do not participate as detail members
- grand total rows do not participate as detail members
- ordinary calculations use one consistent detail grain
- non-additive or exception-aggregated measures are not documented as safely summable client-side

## Measure switching

- Measure dropdown changes the active measure.
- Existing ASK intent is preserved or rerun only when semantically valid.
- Unit or currency formatting follows the binding where available.

## Release package

- `discovery-v0.8.7.json` is valid JSON.
- `discovery-v0.8.7.zip` opens successfully.
- ZIP root contains `main.js`.
- JavaScript parses without a syntax error in the validated build process.
