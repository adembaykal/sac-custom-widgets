(function () {

  const template = document.createElement('template');
  template.innerHTML = `
    <style>
      :host {
        display: block;
        font-family: "72","72full",Arial,Helvetica,sans-serif;
        font-size: 13px;
        color: #32363a;
      }
      #root { padding: 12px; }
      .section { margin-bottom: 16px; }
      .section-title {
        font-weight: bold;
        font-size: 11px;
        color: #6a6d70;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-bottom: 8px;
        border-bottom: 1px solid #e5e5e5;
        padding-bottom: 4px;
      }
      .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
        gap: 8px;
      }
      .row label { flex: 1; font-size: 12px; }
      input[type=text], select {
        width: 140px;
        padding: 3px 6px;
        border: 1px solid #ccc;
        border-radius: 3px;
        font-size: 12px;
        font-family: inherit;
        box-sizing: border-box;
      }
      .hint {
        font-size: 10px;
        color: #8a8a8a;
        margin-top: 2px;
        margin-bottom: 4px;
        line-height: 1.4;
      }
      button#apply {
        width: 100%;
        padding: 7px;
        background: #0070f2;
        color: #fff;
        border: none;
        border-radius: 4px;
        font-size: 13px;
        cursor: pointer;
        margin-top: 6px;
      }
      button#apply:hover { background: #0057d2; }
    </style>
    <div id="root">

      <div class="section">
        <div class="section-title">KPI Settings</div>
        <div class="row">
          <label>KPI Label</label>
          <input id="kpiLabel" type="text" placeholder="e.g. Revenue" />
        </div>
        <div class="row">
          <label>KPI Unit</label>
          <input id="kpiUnit" type="text" placeholder="e.g. € or $" />
        </div>
        <div class="row">
          <label>KPI Polarity</label>
          <select id="kpiPolarity">
            <option value="higher-is-better">Higher is better</option>
            <option value="lower-is-better">Lower is better</option>
          </select>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Dimension</div>
        <div class="row">
          <label>Contributor Label</label>
          <input id="dimLabel" type="text" placeholder="e.g. Segment" />
        </div>
      </div>

      <div class="section">
        <div class="section-title">Time Comparison</div>
        <div class="row">
          <label>Comparison Mode</label>
          <select id="comparisonMode">
            <option value="same-period">Same Period Prev. Year</option>
            <option value="all-prior">All Prev. Year Periods</option>
          </select>
        </div>
        <div class="hint">Applies to Calendar Year/Month only. No effect with Calendar Year.</div>
      </div>

      <button id="apply">Apply</button>
    </div>
  `;

  class ExecutivePulseStyling extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: 'open' });
      this._shadowRoot.appendChild(template.content.cloneNode(true));
      this._shadowRoot.getElementById('apply').addEventListener('click', () => {
        this._fireChanged();
      });
    }

    _fireChanged() {
      const sd = this._shadowRoot;
      this.dispatchEvent(new CustomEvent('propertiesChanged', {
        detail: {
          properties: {
            kpiLabel:       sd.getElementById('kpiLabel').value,
            kpiUnit:        sd.getElementById('kpiUnit').value,
            kpiPolarity:    sd.getElementById('kpiPolarity').value,
            dimLabel:       sd.getElementById('dimLabel').value,
            comparisonMode: sd.getElementById('comparisonMode').value
          }
        }
      }));
    }

    async onCustomWidgetBeforeUpdate(changedProps) {}

    async onCustomWidgetAfterUpdate(changedProps) {
      const sd = this._shadowRoot;
      if (changedProps.kpiLabel       !== undefined) sd.getElementById('kpiLabel').value       = changedProps.kpiLabel;
      if (changedProps.kpiUnit        !== undefined) sd.getElementById('kpiUnit').value        = changedProps.kpiUnit;
      if (changedProps.kpiPolarity    !== undefined) sd.getElementById('kpiPolarity').value    = changedProps.kpiPolarity;
      if (changedProps.dimLabel       !== undefined) sd.getElementById('dimLabel').value       = changedProps.dimLabel;
      if (changedProps.comparisonMode !== undefined) sd.getElementById('comparisonMode').value = changedProps.comparisonMode;
    }

    async onCustomWidgetResize() {}
    async onCustomWidgetDestroy() {}
  }

  customElements.define('com-custom-sac-executivepulse-styling', ExecutivePulseStyling);

})();
