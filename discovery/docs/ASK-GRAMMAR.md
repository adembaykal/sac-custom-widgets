# ASK Grammar

ASK is a guided deterministic query interface. It is not a free-chat or LLM experience.

## Basic rule

Supported questions start with:

```text
Show me
```

The parser uses only dimensions, members, and analytical intents it can resolve from the current bound SAP BW Live result set.

## Supported building blocks

Depending on the current binding, ASK can recognize:

- one analysis dimension
- up to two grouping dimensions
- a member filter found in the current result set
- Month or time-series intent
- Top N, with a maximum of 25
- Growth
- Below prior year
- As table
- explicit `by` relationships
- explicit `x` or `combination` relationships

## Examples

```text
Show me top 10 Product
Show me top 10 Product by growth
Show me Country below prior year
Show me Country by City
Show me top 10 City x Product combinations
Show me Month
Show me Product as table
```

## Growth

Growth ranks members by aligned YoY percentage change.

Growth requires a prior-year comparison in the current SAP BW Live result set.

The implementation includes a prior-year materiality or base guard so that extremely small prior-year values do not automatically dominate the ranking with meaningless percentage growth.

## Below prior year

`Below prior year` compares each returned member against its own aligned prior-period value.

If no member is below prior year, an empty result is valid.

## Two dimensions

Two dimensions require an explicit relationship.

Supported style:

```text
Show me Country by City
Show me City x Product combinations
```

These are not the same intent.

`Country by City` returns the matching Country and City groupings. It does not silently become Top 10.

Explicit Top N with two dimensions requires an explicit combination intent, for example:

```text
Show me top 10 City x Product combinations
```

The following is intentionally rejected as ambiguous:

```text
Show me top 10 Product by City
```

Top N within each group, for example `top 10 Product in each City`, is not supported in the current beta.

## No silent defaults

ASK does not invent a missing dimension.

Examples that are rejected:

```text
Show me ranking top 10
Show me as table
```

A table is an output format, not an analysis intent. A ranking also needs a dimension.

## Ranking keyword

A separate generic `Ranking` command is not used.

Use:

```text
Top 10
```

for value ranking, or:

```text
Growth
```

for growth ranking.

## Partial tokens

Suggestion chips can complete an unfinished dimension token.

For example, typing:

```text
Show me prod
```

should still allow the Product chip to complete the token to the canonical dimension name.

Duplicate dimensions are rejected.

## Large results

Ordinary queries are not silently truncated to Top 10.

If a query returns many rows:

- the complete table result remains available within the practical SAC result-set limits
- the result count is shown
- a chart can be disabled in favor of Table or Map if the number of combinations would make the chart unreadable

## Measure selection

The measure is selected only in the DISCOVERY header.

ASK does not duplicate measure selection inside the query builder.

When a measure changes, an existing ASK intent can be rerun when it remains semantically valid.

## Clear behavior

Clear resets both the query and the result state, including chart, table, narrative, toggles, and result data.

## Unsupported questions

ASK should return a clear message such as:

```text
This question is not supported yet. Try one of the suggested queries below.
```

It should not guess missing intent or pretend to understand unsupported syntax.
