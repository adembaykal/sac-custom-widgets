# SAC Custom Widgets

A collection of community-built custom widgets for SAP Analytics Cloud.

Each widget lives in its own folder with its source files, widget package, and documentation.

These projects are independent community projects and are not official SAP products or SAP-supported components.

---

## Widgets

| Widget | Version | Description |
|---|---:|---|
| [DISCOVERY](discovery/) | BETA 1.0 | Deterministic SAP BW Live analytical application foundation with Discover, guided ASK, aligned YoY, charts, tables, and local country maps |
| [UNFOLD](unfold/) | 0.5.5 | Keynote-style analytical journey from one KPI to executive overview, focused analysis, comparison, guided story and SAP Live Data Binding |
| [Executive Pulse](executive-pulse/) | 4.0.0 | Deterministic narrative widget for KPI variance analysis and contributor ranking |
| [Hierarchy Pulse](hierarchy-pulse/) | 1.1.1 | BW Live hierarchy variance visualization with native parent child reconstruction, persistent selectable layout, and branch/product inspection |
| [WHY](why/) | 1.0.0 | Deterministic variance signal analysis that groups overlapping evidence and shows where to inspect first |

---

## Repository structure

Each widget is self-contained in its own folder.

```text
sac-custom-widgets/
├── discovery/
│   ├── discovery-v0.8.7.json
│   ├── main.js
│   ├── discovery-v0.8.7.zip
│   ├── README.md
│   ├── CHANGELOG.md
│   ├── LICENSE
│   └── docs/
│       ├── ARCHITECTURE.md
│       ├── ASK-GRAMMAR.md
│       ├── TEST-CHECKLIST.md
│       └── TIME-LOGIC.md
├── unfold/
│   ├── UNFOLD-v0.5.5.json
│   ├── main.js
│   ├── UNFOLD-v0.5.5.zip
│   ├── README.md
│   ├── CHANGELOG.md
│   └── LICENSE
├── executive-pulse/
│   ├── index.json
│   ├── main.js
│   ├── styling.js
│   ├── executive-pulse.zip
│   └── README.md
├── hierarchy-pulse/
│   ├── hierarchy-pulse.json
│   ├── main.js
│   ├── hierarchy-pulse.zip
│   ├── README.md
│   ├── CHANGELOG.md
│   └── docs/
│       ├── ARCHITECTURE.md
│       └── TEST-CHECKLIST.md
├── why/
│   ├── why.json
│   ├── main.js
│   ├── why.zip
│   ├── README.md
│   ├── CHANGELOG.md
│   ├── LICENSE
│   ├── demo/
│   │   └── WHY_Executive_Demo_Dataset.csv
│   └── docs/
│       └── TEST-CHECKLIST.md
├── LICENSE
└── README.md
```

Additional widgets can be added as separate folders without changing the existing widget packages.

---

## License

This repository is licensed under the MIT License. See [LICENSE](LICENSE).

Individual widget folders may repeat the license file so that downloaded source folders remain self-contained.

---

*SAP and SAP Analytics Cloud are trademarks or registered trademarks of SAP SE or its affiliates.*
