// Activhome Action Stack - v0.1.2 (no-build, dependency-free)
// Type: custom:activhome-action-stack
//
// Goal:
// - A single ha-card container with style/theme applied on container
// - Renders a vertical stack of "switch panel" rows (NOT generic cards)
// - Each row: icon (more-info) + name (navigate/more-info) + optional play + power toggle
//
// Config:
//   items (required): array of rows
//     - entity (required): switch.xxx | input_boolean.xxx | script.xxx
//     - name (optional)
//     - animate_active (optional): animate icon while entity is active
//     - animation_duration (optional): duration of one rotation in seconds (0.2..5, default 1)
//     - stop_script (optional, script only): custom script called by Stop
//     - navigation_path (optional): /dashboard/0
//     - tap_action (optional): HA native ui_action (we only use action=navigate + navigation_path)
//     - font_size (optional): "16px".."24px" (empty => container default)
//
//   style (optional): transparent|activhome|glass|dark_glass|solid|neon_pulse|neon_glow|primary_breathe|primary_tint...
//   theme (optional): HA theme name (applies theme vars to this card container only)
//   card_style (optional): CSS injected into container (targets ha-card)
//   accent_color (optional): "#RRGGBB" (used by neon_glow + primary_* styles via --ah-accent-color)
//   default_font_size (optional): "16px".."24px" (applies if item.font_size is empty)
//
// Notes:
// - If item.font_size is set, it overrides default.
// - Otherwise, default is 20px (guaranteed), unless user sets default_font_size.

(() => {
  const YELLOW = "#FFCC00";

  function fireEvent(node, type, detail = {}, options = {}) {
    const event = new CustomEvent(type, {
      bubbles: options.bubbles ?? true,
      composed: options.composed ?? true,
      cancelable: options.cancelable ?? false,
      detail,
    });
    node.dispatchEvent(event);
    return event;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function _normalizeIcon(value) {
    if (typeof value === "string") return value.trim();
    if (value && typeof value === "object") {
      if (typeof value.icon === "string") return value.icon.trim();
      if (typeof value.value === "string") return value.value.trim();
    }
    return "";
  }

  // --- Height helpers (row / total mode) -----------------------------------
  function _toNumber(v) {
    if (v === null || v === undefined) return NaN;
    if (typeof v === "number") return v;
    const s = String(v).trim();
    if (!s) return NaN;
    // Accept "350", "350px", "350 px"
    const n = parseFloat(s.replace(/px\s*$/i, ""));
    return Number.isFinite(n) ? n : NaN;
  }

  function _clampNum(n, min, max) {
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }
  // -------------------------------------------------------------------------

  // --- Optional Home Assistant theme support -------------------------------
  function _getThemeVars(hass, themeName) {
    const themes = hass?.themes?.themes;
    if (!themes || !themeName) return null;
    const theme = themes[themeName];
    if (!theme) return null;

    // Theme structure can be flat or { modes: { light: {...}, dark: {...} } }
    if (theme.modes && (theme.modes.light || theme.modes.dark)) {
      const modeKey = hass.themes?.darkMode ? "dark" : "light";
      return theme.modes[modeKey] || theme.modes.light || theme.modes.dark || null;
    }
    return theme;
  }

  function _clearTheme(el, prevVars) {
    if (!el || !prevVars) return;
    Object.keys(prevVars).forEach((k) => {
      const cssVar = k.startsWith("--") ? k : `--${k}`;
      el.style.removeProperty(cssVar);
    });
  }

  function _applyTheme(el, hass, themeName, prevVars) {
    const vars = _getThemeVars(hass, themeName);
    if (!vars) return null;

    _clearTheme(el, prevVars);

    Object.entries(vars).forEach(([key, val]) => {
      const cssVar = key.startsWith("--") ? key : `--${key}`;
      el.style.setProperty(cssVar, String(val));
    });
    return vars;
  }
  // -------------------------------------------------------------------------

  function stylePresetCss(styleName) {
    const s = (styleName || "transparent").toLowerCase();
    switch (s) {
      case "activhome":
        return `
          ha-card {
            --mdc-icon-size: 0px;
            --ha-card-padding: 10px;

            padding: var(--ha-card-padding) !important;
            background-color: rgba(0,0,0,0.40);
            border: 1px solid rgba(255,255,255,0.15);

            border-radius: 16px;
            box-shadow: none;
          }`;

      case "glass":
        return `
          ha-card{
            --mdc-icon-size: 0px;
            --ha-card-padding: 10px;

            padding: var(--ha-card-padding) !important;

            background: rgba(255,255,255,0.10);
            border-radius: 16px;
            box-shadow: none;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
          }`;

      case "dark_glass":
        return `
          ha-card{
            --mdc-icon-size: 0px;
            --ha-card-padding: 10px;

            padding: var(--ha-card-padding) !important;
            border-radius: 16px;
            background: rgba(15, 15, 15, 0.55);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.12);
          }`;

      case "solid":
        return `
          ha-card{
            --mdc-icon-size: 0px;
            --ha-card-padding: 10px;

            padding: var(--ha-card-padding) !important;

            background: var(--card-background-color, rgba(0,0,0,0.2));
            border-radius: 16px;
            box-shadow: none;
          }`;

      case "neon_pulse":
        return `
          ha-card {
            border-radius: 16px;
            background: rgba(10, 10, 10, 0.45);
            padding: 8px 10px;

            backdrop-filter: blur(8px) brightness(1.1);
            -webkit-backdrop-filter: blur(8px) brightness(1.1);

            border: 1px solid rgba(255, 0, 180, 0.4);

            box-shadow:
              0 0 12px rgba(255, 0, 180, 0.5),
              0 0 24px rgba(255, 0, 180, 0.3),
              0 8px 20px rgba(0, 0, 0, 0.4);

            animation: ah_neon_pulse 12s linear infinite;
            transition:
              box-shadow 0.4s ease,
              border-color 0.4s ease,
              background 0.4s ease;

            will-change: box-shadow, border-color;
          }

          @keyframes ah_neon_pulse {
            0% {
              border-color: rgba(255, 0, 180, 0.5);
              box-shadow:
                0 0 12px rgba(255, 0, 180, 0.6),
                0 0 24px rgba(255, 0, 180, 0.35),
                0 8px 20px rgba(0, 0, 0, 0.4);
            }
            25% {
              border-color: rgba(0, 180, 255, 0.5);
              box-shadow:
                0 0 12px rgba(0, 180, 255, 0.6),
                0 0 24px rgba(0, 180, 255, 0.35),
                0 8px 20px rgba(0, 0, 0, 0.4);
            }
            50% {
              border-color: rgba(0, 255, 120, 0.5);
              box-shadow:
                0 0 12px rgba(0, 255, 120, 0.6),
                0 0 24px rgba(0, 255, 120, 0.35),
                0 8px 20px rgba(0,  0, 0, 0.4);
            }
            75% {
              border-color: rgba(255, 140, 0, 0.5);
              box-shadow:
                0 0 12px rgba(255, 140, 0, 0.6),
                0 0 24px rgba(255, 140, 0, 0.35),
                0 8px 20px rgba(0, 0, 0, 0.4);
            }
            100% {
              border-color: rgba(255, 0, 180, 0.5);
              box-shadow:
                0 0 12px rgba(255, 0, 180, 0.6),
                0 0 24px rgba(255, 0, 180, 0.35),
                0 8px 20px rgba(0, 0, 0, 0.4);
            }
          }`;

      case "neon_glow":
        return `
          ha-card{
            --ah-accent: var(--ah-accent-color, var(--primary-color, #00ffff));

            border-radius: 16px;
            background: rgba(10, 10, 10, 0.45);
            padding: 8px 10px;

            backdrop-filter: blur(6px) brightness(1.1);
            -webkit-backdrop-filter: blur(6px) brightness(1.1);

            border: 1px solid color-mix(in oklab, var(--ah-accent) 55%, transparent);

            box-shadow:
              0 0 10px color-mix(in oklab, var(--ah-accent) 55%, transparent),
              0 0 20px color-mix(in oklab, var(--ah-accent) 35%, transparent),
              0 8px 20px rgba(0, 0, 0, 0.4);

            transition: box-shadow 0.3s ease;
          }

          ha-card:hover{
            box-shadow:
              0 0 14px color-mix(in oklab, var(--ah-accent) 70%, transparent),
              0 0 26px color-mix(in oklab, var(--ah-accent) 45%, transparent),
              0 10px 24px rgba(0, 0, 0, 0.45);
          }`;

      case "primary_breathe":
        return `
          ha-card{
            --ah-accent: var(--ah-accent-color, var(--primary-color));

            border-radius: 16px;

            background: linear-gradient(
              120deg,
              color-mix(in oklab, var(--ah-accent) 20%, rgba(12,12,12,0.55)),
              rgba(12,12,12,0.55)
            );

            padding: 8px 10px;

            backdrop-filter: blur(8px) saturate(115%);
            -webkit-backdrop-filter: blur(8px) saturate(115%);

            border: 1px solid color-mix(in oklab, var(--ah-accent) 60%, transparent);

            box-shadow:
              0 0 10px color-mix(in oklab, var(--ah-accent) 40%, transparent),
              0 8px 20px rgba(0, 0, 0, 0.40);

            transition: box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease;

            animation: ah_breathe 5.5s ease-in-out infinite;
            will-change: transform, box-shadow;
            transform: translateZ(0);
          }

          @keyframes ah_breathe {
            0% {
              box-shadow:
                0 0 10px color-mix(in oklab, var(--ah-accent) 40%, transparent),
                0 8px 20px rgba(0, 0, 0, 0.40);
              transform: translateZ(0) scale(1.00);
            }
            50% {
              box-shadow:
                0 0 18px color-mix(in oklab, var(--ah-accent) 65%, transparent),
                0 10px 24px rgba(0, 0, 0, 0.42);
              transform: translateZ(0) scale(1.01);
            }
            100% {
              box-shadow:
                0 0 10px color-mix(in oklab, var(--ah-accent) 40%, transparent),
                0 8px 20px rgba(0, 0, 0, 0.40);
              transform: translateZ(0) scale(1.00);
            }
          }`;

      case "primary_tint":
        return `
          ha-card{
            --ah-accent: var(--ah-accent-color, var(--primary-color));

            border-radius: 16px;

            background: linear-gradient(
              120deg,
              color-mix(in oklab, var(--ah-accent) 18%, rgba(12,12,12,0.55)),
              rgba(12,12,12,0.55)
            );

            padding: 8px 10px;

            backdrop-filter: blur(8px) saturate(115%);
            -webkit-backdrop-filter: blur(8px) saturate(115%);

            border: 1px solid color-mix(in oklab, var(--ah-accent) 65%, transparent);

            box-shadow:
              0 0 12px color-mix(in oklab, var(--ah-accent) 45%, transparent),
              0 8px 20px rgba(0, 0, 0, 0.40);

            transition:
              box-shadow 0.25s ease,
              border-color 0.25s ease,
              background 0.25s ease;
          }

          ha-card:hover{
            box-shadow:
              0 0 16px color-mix(in oklab, var(--ah-accent) 60%, transparent),
              0 10px 24px rgba(0, 0, 0, 0.42);

            border-color: color-mix(in oklab, var(--ah-accent) 80%, transparent);
          }`;

      case "transparent":
      default:
        return `
          ha-card{
            --mdc-icon-size: 0px;
            --ha-card-padding: 10px;

            padding: var(--ha-card-padding) !important;

            background: none;
            box-shadow: none;
          }`;
    }
  }

  function _defaultActiveStates(entityId) {
    const domain = String(entityId || "").split(".")[0];
    if (domain === "cover") return ["open", "opening"];
    return ["on"];
  }

  class ActivhomeActionStack extends HTMLElement {
    set hass(hass) {
      this._hass = hass;

      // IMPORTANT: Avoid full Shadow DOM rebuild on every hass update.
      // Rebuilding (shadowRoot.innerHTML = ...) can cause iOS Safari/WebView to snap scroll.
      if (!this.shadowRoot || !this._config || !this._didRenderOnce) {
        this._render();
        this._didRenderOnce = true;
        return;
      }

      this._updateFromHass();
    }

    setConfig(config) {
      if (!config || !Array.isArray(config.items) || config.items.length === 0) {
        throw new Error("activhome-action-stack: 'items' (non-empty array) is required");
      }
      const style = config.style ?? "transparent";
      const height_mode = (String(config.height_mode || "row").toLowerCase() === "total") ? "total" : "row";
      const row_height = _toNumber(config.row_height);
      const target_total_height = config.target_total_height;

      this._config = {
        ...config,
        style,
        height_mode,
        row_height: Number.isFinite(row_height) ? row_height : 50,
        target_total_height,
        // Default behavior: value includes padding/borders unless user explicitly sets false
        target_total_includes_padding: config.target_total_includes_padding !== false,
      };
      this._render();
    }

    getCardSize() {
      return Math.max(1, (this._config?.items?.length || 1));
    }

    connectedCallback() {
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      this._render();

      // Responsive actions sizing (native-like): keep text size, shrink only action buttons/icons on narrow cards.
      // This matches the approach validated on activhome-cover-stack: fixed typography, adaptive controls.
      if (!this._roActions) {
        this._roActions = new ResizeObserver(() => this._applyResponsiveActions());
        this._roActions.observe(this);
      }
      this._applyResponsiveActions();
    }

    disconnectedCallback() {
      if (this._roActions) {
        try { this._roActions.disconnect(); } catch (_) {}
        this._roActions = null;
      }
    }

    _applyResponsiveActions() {
      // Default (large screens / iPad Pro / desktop)
      let actionW = 60;
      let gap = 6;
      let icon = 32;

      const w = this.getBoundingClientRect?.().width || 0;

      // Typical iPad 3-columns range
      if (w > 0 && w < 520) {
        actionW = 52;
        gap = 5;
        icon = 28;
      }
      // Very narrow (phone / split view)
      if (w > 0 && w < 420) {
        actionW = 60; // keep a usable hit area
        gap = 5;
        icon = 28;
      }

      this.style.setProperty("--ah-action-w", `${actionW}px`);
      this.style.setProperty("--ah-action-gap", `${gap}px`);
      this.style.setProperty("--ah-action-icon", `${icon}px`);
    }

    _openMoreInfo(entityId) {
      fireEvent(this, "hass-more-info", { entityId });
    }

    _navigate(path) {
      if (!path) return;
      fireEvent(this, "hass-action", {
        config: { tap_action: { action: "navigate", navigation_path: path } },
        action: "tap",
      });
    }

    _toggle(entityId, powerService = "") {
      const svc = String(powerService || "").trim();
      if (!svc) {
        this._hass?.callService("homeassistant", "toggle", { entity_id: entityId });
        return;
      }

      const parts = svc.split(".");
      if (parts.length !== 2 || !parts[0] || !parts[1]) return;

      this._hass?.callService(parts[0], parts[1], { entity_id: entityId });
    }

    _playScript(scriptEntity) {
      if (!scriptEntity) return;
      this._hass?.callService("script", "turn_on", { entity_id: scriptEntity });
    }

    _stopScript(scriptEntity, stopScript = "") {
      if (!scriptEntity) return;
      const customStop = String(stopScript || "").trim();
      if (customStop) {
        this._hass?.callService("script", "turn_on", { entity_id: customStop });
        return;
      }
      this._hass?.callService("script", "turn_off", { entity_id: scriptEntity });
    }

    _updateFromHass() {
      const hass = this._hass;

      if (!hass || !this.shadowRoot || !this._config) return;

      // Keep container theme vars in sync (dark/light mode, etc.) without rerendering
      const cardEl = this.shadowRoot.querySelector("ha-card");
      const themeName = (this._config.theme || "").trim();
      if (cardEl && themeName) {
        this._appliedThemeVars = _applyTheme(cardEl, hass, themeName, this._appliedThemeVars);
      }

      const rows = this.shadowRoot.querySelectorAll(".row");
      rows.forEach((row) => {
        const entityId = row?.dataset?.entity;
        if (!entityId) return;

        const stateObj = hass.states?.[entityId];
        const meta = this._itemMeta?.get?.(entityId);
        const activeStates = Array.isArray(meta?.activeStates) && meta.activeStates.length
          ? meta.activeStates
          : _defaultActiveStates(entityId);
        const entityOn = activeStates.includes(stateObj?.state);

        // Update icon
        const iconHost = row.querySelector(".entityIconHost");
        const customIcon = meta?.icon || "";

        if (iconHost && stateObj) {
          const currentCustom = iconHost.dataset.customIcon || "";
          const wantedCustom = customIcon || "";

          if (currentCustom !== wantedCustom) {
            iconHost.innerHTML = wantedCustom
              ? `<ha-icon icon="${escapeHtml(wantedCustom)}"></ha-icon>`
              : `<ha-state-icon></ha-state-icon>`;
            iconHost.dataset.customIcon = wantedCustom;
          }

          const stateIcon = iconHost.querySelector("ha-state-icon");
          if (stateIcon) {
            stateIcon.hass = hass;
            stateIcon.stateObj = stateObj;
            stateIcon.style.color = entityOn ? YELLOW : "var(--primary-text-color)";
          }

          const customHaIcon = iconHost.querySelector("ha-icon");
          if (customHaIcon) {
            customHaIcon.style.color = entityOn ? YELLOW : "var(--primary-text-color)";
          }

          iconHost.style.setProperty("--ah-animation-duration", `${meta?.animationDuration || 1}s`);
          iconHost.classList.toggle("activeAnimation", !!meta?.animateActive && entityOn);
        }

        // Script button: Play when idle, Stop while running
        if (meta?.isScript) {
          const actionBtn = row.querySelector('button[data-action="script-toggle"]');
          const actionIcon = actionBtn?.querySelector("ha-icon");
          if (actionBtn) actionBtn.classList.toggle("playRunning", !!entityOn);
          if (actionIcon) actionIcon.setAttribute("icon", entityOn ? "mdi:stop" : "mdi:play");
          if (actionBtn) actionBtn.setAttribute("aria-label", entityOn ? "Stop" : "Play");
        }
      });
    }


    _render() {
      if (!this.shadowRoot || !this._config) return;
      const hass = this._hass;

      // Cache item metadata for incremental updates (avoid rerender on hass updates)
      this._itemMeta = new Map();

      // Height settings
      const itemsCount = Array.isArray(this._config.items) ? this._config.items.length : 0;

      const heightModeRaw = String(this._config.height_mode || "row").toLowerCase();
      const heightMode = (heightModeRaw === "total") ? "total" : "row";

      const rowMin = 50;
      const rowMax = 220;

      const baseRow = _clampNum(_toNumber(this._config.row_height), rowMin, rowMax);
      // Apply initial row height (updated later in TOTAL mode after padding/border measure)
      this.style.setProperty("--ah-row-height", `${baseRow}px`);

      const presetCss = stylePresetCss(this._config.style);
      const customCss = this._config.card_style ? `\n/* card_style */\n${this._config.card_style}\n` : "";

      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display:block;
            --ah-row-height: 50px;

            /* Responsive actions (default values for large screens) */
            --ah-action-w: 60px;
            --ah-action-gap: 6px;
            --ah-action-icon: 32px;
          }

          ha-card{
            padding: 0;
            --ha-card-border-width: 0px;
            color: var(--primary-text-color);
          }
          ${presetCss}
          ${customCss}

          .list{
            display: flex;
            flex-direction: column;
          }

          .row{
            display:grid;
            grid-template-columns: 48px 1fr var(--ah-action-w) var(--ah-action-w); /* play + power */
            align-items:center;
            column-gap: var(--ah-action-gap);
            height: var(--ah-row-height);
          }

          button{
            font: inherit;
            -webkit-tap-highlight-color: transparent; /* ✅ iOS: supprime le flash */
            outline: none; /* ✅ évite le ring focus collé */
            touch-action: manipulation; /* ✅ iOS: réduit les comportements scroll/zoom au tap */
          }

          button:focus{
            outline: none !important;
          }

          button:focus-visible{
            outline: none !important;
          }


          .iconBtn{
            height: var(--ah-row-height); width:48px;
            display:flex; align-items:center; justify-content:center;
            background:none; border:none; padding:0;
            cursor:pointer;
          }

          .entityIconHost{
            display:flex;
            align-items:center;
            justify-content:center;
            width:48px;
            height:var(--ah-row-height);
          }

          ha-state-icon{ --mdc-icon-size:32px; }
          .entityIconHost ha-icon{ --mdc-icon-size:32px; }

          .nameBtn{
            height: var(--ah-row-height);
            background:none; border:none;
            padding:0 0 0 4px;
            text-align:left;
            min-width:0;
            display:flex; align-items:center;
            cursor:pointer;
          }

          .name{
            font-size: var(
              --ah-font-size,
              var(
                --ha-font-size-m,
                var(--paper-font-body1_-_font-size, 20px)
              )
            );
            font-weight: var(
              --ha-font-weight-normal,
              var(--paper-font-body1_-_font-weight, 500)
            );
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
            width:100%;
            color: var(--primary-text-color);
          }

          .actionBtn{
            height: var(--ah-row-height); width: var(--ah-action-w);
            display:flex; align-items:center; justify-content:center;
            background:none; border:none; padding:0;
            cursor:pointer;
            border-radius:10px;
            transition: background-color 120ms ease;
            color: var(--primary-text-color); /* ✅ force white icons (avoid HA default blue) */
          }
          .actionBtn:hover{ background: color-mix(in oklab, currentColor 12%, transparent); }
          .actionBtn:active{ background: color-mix(in oklab, currentColor 18%, transparent); }
          .actionBtn[disabled]{ cursor: default; opacity: 0.35; }

          /* ✅ iOS/tactile : feedback au tap conservé, sans effet stroboscope */
          @media (hover: none) and (pointer: coarse) {
            .actionBtn,
            .iconBtn,
            .nameBtn {
              transition: none !important; /* supprime la source du flash iOS */
            }
            
            /* iOS : empêche le hover "collé" après tap */
            .actionBtn:hover,
            .iconBtn:hover,
            .nameBtn:hover {
              background: none !important;
            }
        
          /* Feedback "pressed" stable (pas de color-mix) */
            .actionBtn:active,
            .iconBtn:active,
            .nameBtn:active {
              background: rgba(255, 255, 255, 0.10) !important;
            }
          }

          ha-icon{ --mdc-icon-size: var(--ah-action-icon); color: currentColor; }
          .activeAnimation ha-state-icon,
          .activeAnimation ha-icon{
            animation: ah-spin-y var(--ah-animation-duration, 1s) linear infinite;
            transform-origin: center center;
          }
          @keyframes ah-spin-y{
            from{ transform: perspective(100px) rotateY(0deg); }
            to{ transform: perspective(100px) rotateY(360deg); }
          }
          @media (prefers-reduced-motion: reduce){
            .activeAnimation ha-state-icon,
            .activeAnimation ha-icon{ animation:none; }
          }

          .playRunning ha-icon{ color: ${YELLOW}; }

          .playHidden{ display:none; }
          .rowNoPlay{
            grid-template-columns: 48px 1fr var(--ah-action-w);
          }
        </style>

        <ha-card>
          <div class="list" id="list"></div>
        </ha-card>
      `;

      // Ensure responsive action sizing is applied immediately after (re)render.
      // (ResizeObserver will keep it updated, but may not fire synchronously.)
      this._applyResponsiveActions();

      const cardEl = this.shadowRoot.querySelector("ha-card");

      // Apply optional HA theme to container
      const themeName = (this._config.theme || "").trim();
      if (cardEl) {
        if (themeName) {
          this._appliedThemeVars = _applyTheme(cardEl, hass, themeName, this._appliedThemeVars);
        } else if (this._appliedThemeVars) {
          _clearTheme(cardEl, this._appliedThemeVars);
          this._appliedThemeVars = null;
        }

        // Optional container accent color (used by neon_glow + primary_* styles)
        const acc = (this._config.accent_color || "").trim();
        if (acc) cardEl.style.setProperty("--ah-accent-color", acc);
        else cardEl.style.removeProperty("--ah-accent-color");

        // ✅ Default font size: guaranteed 20px unless user sets default_font_size
        const dfs = (this._config.default_font_size || "").trim();
        cardEl.style.setProperty("--ah-default-font-size", dfs || "20px");
      }

      const list = this.shadowRoot.getElementById("list");
      if (!list) return;

      this._didRenderOnce = true;

      // Ensure responsive variables are updated after render (important when switching views / columns)
      this._applyResponsiveActions();

      const items = this._config.items || [];
      items.forEach((it) => {
        const entityId = (it?.entity || "").trim();
        if (!entityId) return;

        const stateObj = hass?.states?.[entityId];
        const domain = entityId.split(".")[0];
        const isScript = domain === "script";
        const icon = _normalizeIcon(it?.icon);
        const powerService = (it?.power_service || "").trim();
        const stopScript = (it?.stop_script || "").trim();
        const animateActive = it?.animate_active === true;
        const animationDurationRaw = Number(it?.animation_duration);
        const animationDuration = Number.isFinite(animationDurationRaw)
          ? Math.min(5, Math.max(0.2, animationDurationRaw))
          : 1;
        const activeStates = Array.isArray(it?.active_states) && it.active_states.length
          ? it.active_states.map((v) => String(v))
          : _defaultActiveStates(entityId);

        const name =
          (it?.name || "").trim() ||
          (stateObj?.attributes?.friendly_name || "") ||
          entityId;

        // Keep per-entity metadata for incremental updates
        this._itemMeta.set(entityId, { icon, powerService, activeStates, stopScript, animateActive, animationDuration, isScript });

        const entityOn = activeStates.includes(stateObj?.state);

        const row = document.createElement("div");
        row.className = "row rowNoPlay";
        row.dataset.entity = entityId;

        // ✅ Per-item font size handling:
        // - if item.font_size: use it
        // - else use container default font size (guaranteed 20px)
        const rowFontSize = (it?.font_size || "").trim();
        const containerDefaultFs = (this._config.default_font_size || "").trim() || "20px";
        row.style.setProperty("--ah-font-size", rowFontSize || containerDefaultFs);

        row.innerHTML = `
          <button class="iconBtn" data-action="more-info" aria-label="More info" tabindex="-1" type="button">
            <span class="entityIconHost"></span>
          </button>

          <button class="nameBtn" data-action="name" aria-label="Navigate or more-info" tabindex="-1" type="button">
            <span class="name">${escapeHtml(name)}</span>
          </button>

          ${isScript
            ? `<button class="actionBtn ${entityOn ? "playRunning" : ""}" data-action="script-toggle" aria-label="${entityOn ? "Stop" : "Play"}" tabindex="-1" type="button">
                 <ha-icon icon="${entityOn ? "mdi:stop" : "mdi:play"}"></ha-icon>
               </button>`
            : `<button class="actionBtn" data-action="power" aria-label="Power" tabindex="-1" type="button">
                 <ha-icon icon="mdi:power-standby"></ha-icon>
               </button>`}
        `;

        // Setup entity icon
        const iconHost = row.querySelector(".entityIconHost");
        if (iconHost && hass && stateObj) {
          const customIcon = icon;

          if (customIcon) {
            iconHost.innerHTML = `<ha-icon icon="${escapeHtml(customIcon)}"></ha-icon>`;
            iconHost.dataset.customIcon = customIcon;

            const customHaIcon = iconHost.querySelector("ha-icon");
            if (customHaIcon) {
              customHaIcon.style.color = entityOn ? YELLOW : "var(--primary-text-color)";
            }
          } else {
            iconHost.innerHTML = `<ha-state-icon></ha-state-icon>`;
            iconHost.dataset.customIcon = "";

            const stateIcon = iconHost.querySelector("ha-state-icon");
            if (stateIcon) {
              stateIcon.hass = hass;
              stateIcon.stateObj = stateObj;
              stateIcon.style.color = entityOn ? YELLOW : "var(--primary-text-color)";
            }
          }
        }

        iconHost?.style.setProperty("--ah-animation-duration", `${animationDuration}s`);
        iconHost?.classList.toggle("activeAnimation", animateActive && entityOn);

        // Click handling
        row.addEventListener("click", (ev) => {
          const btn = ev.target?.closest?.("button");
          if (!btn) return;

          // ✅ iOS: empêche le focus implicite (source de micro-scroll)
          try { btn.blur?.(); } catch (_) {}
          try { this.shadowRoot?.activeElement?.blur?.(); } catch (_) {}

          const action = btn.getAttribute("data-action");
          if (action === "more-info") {
            this._openMoreInfo(entityId);
            return;
          }

          if (action === "name") {
            // ✅ Optional HA native action (we only support navigate here)
            const ta = it?.tap_action;
            if (ta && typeof ta === "object") {
              const a = String(ta.action || "").toLowerCase();
              if (a === "navigate") {
                const p = String(ta.navigation_path || "").trim();
                if (p) {
                  this._navigate(p);
                  return;
                }
              }
            }

            // ✅ Backward-compatible behavior (unchanged)
            const path = (it?.navigation_path || "").trim();
            if (path) this._navigate(path);
            else this._openMoreInfo(entityId);
            return;
          }

          if (action === "script-toggle") {
            if (entityOn) this._stopScript(entityId, stopScript);
            else this._playScript(entityId);
            return;
          }

          if (action === "power") {
            this._toggle(entityId, powerService);
            return;
          }
        });

        list.appendChild(row);
      });


      // --- TOTAL height mode: calibrate using real ha-card padding + borders -----
      const card = this.shadowRoot.querySelector("ha-card");
      if (card) {
        // Ensure predictable box model when forcing height
        card.style.boxSizing = "border-box";
      }

      // Reset total-mode layout when not in total mode
      if (heightMode !== "total" || !_toNumber(this._config.target_total_height)) {
        if (card) {
          card.style.removeProperty("height");
          card.style.removeProperty("display");
          card.style.removeProperty("flex-direction");
        }
        // list flex reset
        if (list) {
          list.style.removeProperty("flex");
          list.style.removeProperty("min-height");
        }
        return;
      }

      const requested = _toNumber(this._config.target_total_height);
      const includesPadding = this._config.target_total_includes_padding !== false;

      // Post-render measure (needs computed styles)
      requestAnimationFrame(() => {
        const cardEl = this.shadowRoot?.querySelector?.("ha-card");
        const listEl = this.shadowRoot?.getElementById?.("list");
        if (!cardEl || !listEl) return;

        const cs = getComputedStyle(cardEl);

        const padTop = parseFloat(cs.paddingTop) || 0;
        const padBottom = parseFloat(cs.paddingBottom) || 0;

        const bTop = parseFloat(cs.borderTopWidth) || 0;
        const bBottom = parseFloat(cs.borderBottomWidth) || 0;

        const count = itemsCount || 1;

        const innerAvailable = Math.max(
          includesPadding
            ? (requested - padTop - padBottom - bTop - bBottom)
            : requested,
          0
        );

        let computedRow = innerAvailable / count;
        computedRow = _clampNum(computedRow, rowMin, rowMax);

        const finalTotal = (computedRow * count) + padTop + padBottom + bTop + bBottom;

        // Apply row height + force total height
        this.style.setProperty("--ah-row-height", `${computedRow}px`);

        // Make ha-card a flex container so list fits without breaking padding
        cardEl.style.display = "flex";
        cardEl.style.flexDirection = "column";
        listEl.style.flex = "1 1 auto";
        listEl.style.minHeight = "0";

        cardEl.style.height = `${finalTotal}px`;
      });
    }

    static getConfigElement() {
      return document.createElement("activhome-action-stack-editor");
    }

    static getStubConfig() {
      return {
        type: "custom:activhome-action-stack",
        style: "activhome",
        theme: "",
        card_style: "",
        accent_color: "",
        default_font_size: "", // UI can override; runtime default is 20px
        height_mode: "row",
        row_height: 50,
        target_total_height: "",
        target_total_includes_padding: true,
        items: [
          {
            entity: "switch.example",
            animate_active: false,
            animation_duration: 1,
            stop_script: "",
            icon: "",
            power_service: "",
            navigation_path: "/dashboard/0",
            tap_action: { action: "navigate", navigation_path: "/dashboard/0" },
            font_size: ""
          },
        ],
      };
    }
  }

  class ActivhomeActionStackEditor extends HTMLElement {
    set hass(hass) {
      this._hass = hass;
      if (this._form) this._form.hass = hass;

      if (this._schema) {
        const themeNames = Object.keys(this._hass?.themes?.themes || {}).sort((a, b) => a.localeCompare(b));
        const themeField = this._schema.find((f) => f.name === "theme");
        if (themeField && themeField.selector?.select) {
          themeField.selector.select.options = [{ label: "Aucun", value: "" }].concat(
            themeNames.map((t) => ({ label: t, value: t }))
          );
        }
        if (this._form) this._form.schema = this._schema;
      }
    }

    setConfig(config) {
      this._config = {
        style: "transparent",
        theme: "",
        card_style: "",
        accent_color: "",
        default_font_size: "",
        height_mode: "row",
        row_height: 50,
        target_total_height: "",
        target_total_includes_padding: true,
        items: [],
        ...config,
      };
      this._ensureRendered();
      this._refresh();
    }

    connectedCallback() {
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      this._ensureRendered();
      this._refresh();
    }

    _ensureRendered() {
      if (this._rendered) return;
      this._rendered = true;

      this.shadowRoot.innerHTML = `
        <style>
          .wrap { display: grid; gap: 12px; }
          .sectionTitle { font-weight: 600; }
          .items { display: grid; gap: 10px; }
          .itemCard {
            border: 1px solid color-mix(in oklab, var(--primary-text-color) 18%, transparent);
            border-radius: 12px;
            padding: 10px;
          }
          .itemHeader { display:flex; align-items:center; justify-content: space-between; gap: 8px; }
          .btnRow { display:flex; gap: 6px; }
          button {
            cursor: pointer;
            border-radius: 10px;
            padding: 6px 10px;
            border: 1px solid color-mix(in oklab, var(--primary-text-color) 18%, transparent);
            background: none;
            color: var(--primary-text-color);
          }
          button:hover { background: color-mix(in oklab, var(--primary-text-color) 8%, transparent); }
          button:disabled { opacity: 0.4; cursor: default; }
          .hint { opacity:0.8; font-size: 12px; line-height: 1.3; }
          code { font-family: var(--code-font-family, ui-monospace, SFMono-Regular, Menlo, monospace); }
        </style>

        <div class="wrap">
          <ha-form id="form"></ha-form>

          <div>
            <div class="sectionTitle">Items</div>
            <div class="items" id="items"></div>
            <div style="margin-top:10px;">
              <button id="add">+ Ajouter un switch</button>
            </div>
            <div class="hint" style="margin-top:6px;">
              Chaque item crée une ligne "Switch Panel" (icône + nom + play optionnel + power).
            </div>
          </div>

          <div class="hint">
            <div><b>CSS avancé</b> : le contenu de <code>card_style</code> est injecté tel quel dans la carte.</div>
            <div>Pour modifier le fond/radius/ombre, cible <code>ha-card { ... }</code>.</div>
          </div>
        </div>
      `;

      this._form = this.shadowRoot.getElementById("form");
      if (this._hass) this._form.hass = this._hass;

      this._schema = [
        {
          name: "theme",
          label: "Theme conteneur (optionnel)",
          selector: { select: { options: [{ label: "Aucun", value: "" }], mode: "dropdown" } },
        },
        {
          name: "style",
          label: "Style conteneur",
          selector: {
            select: {
              options: [
                { label: "Transparent", value: "transparent" },
                { label: "Activhome", value: "activhome" },
                { label: "Glass", value: "glass" },
                { label: "Dark glass (Activhome)", value: "dark_glass" },
                { label: "Solid", value: "solid" },
                { label: "Neon Pulse", value: "neon_pulse" },
                { label: "Neon Glow", value: "neon_glow" },
                { label: "Primary + Breathe", value: "primary_breathe" },
                { label: "Primary Tint", value: "primary_tint" },
              ],
              mode: "dropdown",
            },
          },
        },
	        {
          name: "height_mode",
          label: "Mode de hauteur",
          selector: {
            select: {
              options: [
                { label: "Hauteur de ligne (px)", value: "row" },
                { label: "Hauteur totale cible", value: "total" },
              ],
              mode: "dropdown",
            },
          },
        },
        {
          name: "row_height",
          label: "Hauteur des lignes (px) — min 50",
          selector: { number: { min: 50, max: 220, step: 1, mode: "box" } },
        },
        {
          name: "target_total_height",
          label: "Hauteur totale cible (px)",
          selector: { number: { min: 50, max: 2000, step: 1, mode: "box" } },
        },
        {
          name: "target_total_includes_padding",
          label: "La hauteur saisie correspond à la hauteur totale de la carte",
          selector: { boolean: {} },
        },
	        {
	          name: "default_font_size",
          label: "Taille police par défaut (optionnel)",
          selector: {
            select: {
              options: [
                { label: "Par défaut (20)", value: "" },
                { label: "16", value: "16px" },
                { label: "17", value: "17px" },
                { label: "18", value: "18px" },
                { label: "19", value: "19px" },
                { label: "20", value: "20px" },
                { label: "21", value: "21px" },
                { label: "22", value: "22px" },
                { label: "23", value: "23px" },
                { label: "24", value: "24px" },
              ],
              mode: "dropdown",
            },
          },
        },
        { name: "accent_color", label: "Couleur accent (Neon/Primary seulement, optionnel)", selector: { text: {} } },
        { name: "card_style", label: "CSS avancé (optionnel)", selector: { text: { multiline: true } } },
      ];

      // Populate theme dropdown from HA
      const themeNames = Object.keys(this._hass?.themes?.themes || {}).sort((a, b) => a.localeCompare(b));
      const themeField = this._schema.find((f) => f.name === "theme");
      if (themeField && themeField.selector?.select) {
        themeField.selector.select.options = [{ label: "Aucun", value: "" }].concat(
          themeNames.map((t) => ({ label: t, value: t }))
        );
      }

      this._form.schema = this._schema;

      this._form.addEventListener("value-changed", (ev) => {
        const v = ev.detail?.value || {};
        const merged = { ...this._config, ...v, type: "custom:activhome-action-stack" };

        // Clean empties
        ["theme", "card_style", "accent_color", "default_font_size"].forEach((k) => {
          if (merged[k] === "" || merged[k] == null) delete merged[k];
        });

        
        // Height defaults / clean
        const hm = (String(merged.height_mode || "row").toLowerCase() === "total") ? "total" : "row";
        merged.height_mode = hm;

        const rh = _toNumber(merged.row_height);
        if (Number.isFinite(rh)) merged.row_height = rh;

        // Default: includes padding/borders unless explicitly false
        merged.target_total_includes_padding = merged.target_total_includes_padding !== false;

        // Remove default values to keep YAML clean
        if (hm === "row") {
          // In row mode, total fields are irrelevant
          delete merged.target_total_height;
          // keep includes_padding implicit default unless user explicitly set false (rare in row mode)
          if (merged.target_total_includes_padding === true) delete merged.target_total_includes_padding;
        }

        const rhClean = _toNumber(merged.row_height);
        if (!Number.isFinite(rhClean) || rhClean === 50) delete merged.row_height;

        if (hm === "row") delete merged.height_mode;

        if (merged.target_total_includes_padding === true) delete merged.target_total_includes_padding;

        const tth = _toNumber(merged.target_total_height);
        if (!Number.isFinite(tth) || tth <= 0) delete merged.target_total_height;
if (!merged.style) merged.style = "transparent";
        if (!Array.isArray(merged.items)) merged.items = [];

        this._config = merged;
        fireEvent(this, "config-changed", { config: merged });
        this._refreshItems();
      });

      this.shadowRoot.getElementById("add")?.addEventListener("click", () => {
        const next = { ...this._config };
        next.items = Array.isArray(next.items) ? [...next.items] : [];
        next.items.push({
          entity: "",
          name: "",
          animate_active: false,
          animation_duration: 1,
          stop_script: "",
          icon: "",
          power_service: "",
          navigation_path: "",
          tap_action: undefined,
          font_size: ""
        });
        this._config = next;
        this._emit();
        this._refreshItems();
      });
    }

    _emit() {
      const clean = { ...this._config, type: "custom:activhome-action-stack" };
      // Clean top-level height defaults
      const hm = (String(clean.height_mode || "row").toLowerCase() === "total") ? "total" : "row";
      if (hm === "row") delete clean.height_mode;
      else clean.height_mode = "total";

      const rh = _toNumber(clean.row_height);
      if (!Number.isFinite(rh) || rh === 50) delete clean.row_height;
      else clean.row_height = rh;

      const tth = _toNumber(clean.target_total_height);
      if (!Number.isFinite(tth) || tth <= 0) delete clean.target_total_height;
      else clean.target_total_height = tth;

      // Default true is implicit
      if (clean.target_total_includes_padding === true || clean.target_total_includes_padding == null) {
        delete clean.target_total_includes_padding;
      }


      // Clean item empties
      clean.items = (clean.items || []).map((it) => {
        const out = { ...it };
        ["name", "stop_script", "icon", "power_service", "active_states", "navigation_path", "tap_action", "font_size"].forEach((k) => {
          if (out[k] === "" || out[k] == null) delete out[k];
        });
        if (out.animate_active !== true) {
          delete out.animate_active;
          delete out.animation_duration;
        } else {
          const d = Number(out.animation_duration);
          out.animation_duration = Number.isFinite(d) ? Math.min(5, Math.max(0.2, d)) : 1;
        }
        return out;
      });

      fireEvent(this, "config-changed", { config: clean });
    }

    _refresh() {
      if (!this._form || !this._config) return;

      this._form.data = {
        theme: this._config.theme || "",
        style: this._config.style || "transparent",

        height_mode: (String(this._config.height_mode || "row").toLowerCase() === "total") ? "total" : "row",
        row_height: Number.isFinite(_toNumber(this._config.row_height)) ? _toNumber(this._config.row_height) : 50,
        target_total_height: (this._config.target_total_height === 0 || this._config.target_total_height)
          ? _toNumber(this._config.target_total_height)
          : "",
        target_total_includes_padding: this._config.target_total_includes_padding !== false,

        card_style: this._config.card_style || "",
        accent_color: this._config.accent_color || "",
        default_font_size: this._config.default_font_size || "",
      };

      this._refreshItems();
    }

    _refreshItems() {
      const host = this.shadowRoot.getElementById("items");
      if (!host) return;

      const items = Array.isArray(this._config.items) ? this._config.items : [];

      // Element réellement focus dans le shadowRoot (input, textarea, etc.)
      const focusedEl = this.shadowRoot.querySelector(":focus");

      // --- 1) Rebuild UNIQUEMENT si le nombre d'items a changé ---
      if (host.childElementCount !== items.length) {
        host.innerHTML = "";

        items.forEach((it, idx) => {
          const wrap = document.createElement("div");
          wrap.className = "itemCard";

          const header = document.createElement("div");
          header.className = "itemHeader";
          header.innerHTML = `<div><b>Item ${idx + 1}</b></div>`;

          const btnRow = document.createElement("div");
          btnRow.className = "btnRow";

          const up = document.createElement("button");
          up.textContent = "↑";
          up.disabled = idx === 0;
          up.addEventListener("click", () => {
            const current = Array.isArray(this._config.items) ? this._config.items : [];
            const next = { ...this._config, items: [...current] };
            const tmp = next.items[idx - 1];
            next.items[idx - 1] = next.items[idx];
            next.items[idx] = tmp;
            this._config = next;
            this._emit();
            this._refreshItems(); // length unchanged => update, no DOM wipe
          });

          const down = document.createElement("button");
          down.textContent = "↓";
          down.disabled = idx === items.length - 1;
          down.addEventListener("click", () => {
            const current = Array.isArray(this._config.items) ? this._config.items : [];
            const next = { ...this._config, items: [...current] };
            const tmp = next.items[idx + 1];
            next.items[idx + 1] = next.items[idx];
            next.items[idx] = tmp;
            this._config = next;
            this._emit();
            this._refreshItems();
          });

          const del = document.createElement("button");
          del.textContent = "Supprimer";
          del.addEventListener("click", () => {
            const current = Array.isArray(this._config.items) ? this._config.items : [];
            const next = { ...this._config, items: [...current] };
            next.items.splice(idx, 1);
            this._config = next;
            this._emit();
            this._refreshItems(); // length changed => rebuild
          });

          btnRow.appendChild(up);
          btnRow.appendChild(down);
          btnRow.appendChild(del);
          header.appendChild(btnRow);

          const form = document.createElement("ha-form");
          if (this._hass) form.hass = this._hass;

          form.schema = [
            {
              name: "entity",
              label: "Entité",
              required: true,
              selector: { entity: { domain: ["switch", "input_boolean", "script"] } }
            },
            { name: "name", label: "Nom affiché (optionnel)", selector: { text: {} } },
            { name: "animate_active", label: "Animer l’icône lorsque l’entité est active", selector: { boolean: {} } },
            ...(it.animate_active === true ? [{
              name: "animation_duration",
              label: "Durée d’un tour (secondes)",
              selector: { number: { min: 0.2, max: 5, step: 0.1, mode: "box", unit_of_measurement: "s" } }
            }] : []),
            { name: "stop_script", label: "Script d’arrêt (optionnel, pour une entité script)", selector: { entity: { domain: "script" } } },
            { name: "icon", label: "Icône (optionnel - sinon icône de l’entité)", selector: { icon: {} } },
            { name: "power_service", label: "Service bouton Power (optionnel)", selector: { text: {} } },
            { name: "navigation_path", label: "Navigation path (optionnel)", selector: { text: {} } },
            { name: "tap_action", label: "Navigation (UI native, optionnel)", selector: { ui_action: {} } },
            {
              name: "font_size",
              label: "Taille police (optionnel)",
              selector: {
                select: {
                  options: [
                    { label: "Par défaut (20)", value: "" },
                    { label: "16", value: "16px" },
                    { label: "17", value: "17px" },
                    { label: "18", value: "18px" },
                    { label: "19", value: "19px" },
                    { label: "20", value: "20px" },
                    { label: "21", value: "21px" },
                    { label: "22", value: "22px" },
                    { label: "23", value: "23px" },
                    { label: "24", value: "24px" },
                  ],
                  mode: "dropdown",
                },
              },
            },
          ];

          form.data = {
            entity: it.entity || "",
            name: it.name || "",
            animate_active: it.animate_active === true,
            animation_duration: Number.isFinite(Number(it.animation_duration)) ? Number(it.animation_duration) : 1,
            stop_script: it.stop_script || "",
            icon: it.icon || "",
            power_service: it.power_service || "",
            navigation_path: it.navigation_path || "",
            tap_action: it.tap_action || undefined,
            font_size: it.font_size || "",
          };

          form.addEventListener("value-changed", (ev) => {
            const v = ev.detail?.value || {};
            const current = Array.isArray(this._config.items) ? this._config.items : [];
            const next = { ...this._config, items: [...current] };

            const previousAnimate = next.items[idx]?.animate_active === true;
            const merged = { ...next.items[idx], ...v };
            if (merged.animate_active === true) {
              const d = Number(merged.animation_duration);
              merged.animation_duration = Number.isFinite(d) ? Math.min(5, Math.max(0.2, d)) : 1;
            } else {
              delete merged.animation_duration;
            }

            // Clean empties in this item
            ["name", "stop_script", "icon", "power_service", "active_states", "navigation_path", "tap_action", "font_size"].forEach((k) => {
              if (merged[k] === "" || merged[k] == null) delete merged[k];
            });

            next.items[idx] = merged;
            this._config = next;
            this._emit();

            // Rebuild only when the animation checkbox changes so the speed field appears/disappears.
            if (previousAnimate !== (merged.animate_active === true)) {
              host.innerHTML = "";
            }
            this._refreshItems();
          });

          wrap.appendChild(header);
          wrap.appendChild(form);
          host.appendChild(wrap);
        });

        return;
      }

      // --- 2) Sinon: pas de rebuild -> update des forms existants + boutons ---
      const cards = host.querySelectorAll(".itemCard");

      cards.forEach((card, idx) => {
        // Update header title (au cas où)
        const title = card.querySelector(".itemHeader > div");
        if (title) title.innerHTML = `<b>Item ${idx + 1}</b>`;

        // Update buttons state
        const buttons = card.querySelectorAll(".btnRow button");
        const up = buttons[0];
        const down = buttons[1];

        if (up) up.disabled = idx === 0;
        if (down) down.disabled = idx === items.length - 1;

        // Update form data, MAIS pas celui actuellement focus
        const form = card.querySelector("ha-form");
        if (!form) return;

        const isFocusedInside = focusedEl ? form.contains(focusedEl) : false;
        if (isFocusedInside) return;

        const it = items[idx] || {};
        form.schema = [
          { name: "entity", label: "Entité", required: true, selector: { entity: { domain: ["switch", "input_boolean", "script"] } } },
          { name: "name", label: "Nom affiché (optionnel)", selector: { text: {} } },
          { name: "animate_active", label: "Animer l’icône lorsque l’entité est active", selector: { boolean: {} } },
          ...(it.animate_active === true ? [{ name: "animation_duration", label: "Durée d’un tour (secondes)", selector: { number: { min: 0.2, max: 5, step: 0.1, mode: "box", unit_of_measurement: "s" } } }] : []),
          { name: "stop_script", label: "Script d’arrêt (optionnel, pour une entité script)", selector: { entity: { domain: "script" } } },
          { name: "icon", label: "Icône (optionnel - sinon icône de l’entité)", selector: { icon: {} } },
          { name: "power_service", label: "Service bouton Power (optionnel)", selector: { text: {} } },
          { name: "navigation_path", label: "Navigation path (optionnel)", selector: { text: {} } },
          { name: "tap_action", label: "Navigation (UI native, optionnel)", selector: { ui_action: {} } },
          { name: "font_size", label: "Taille police (optionnel)", selector: { select: { options: [
            { label: "Par défaut (20)", value: "" }, { label: "16", value: "16px" }, { label: "17", value: "17px" },
            { label: "18", value: "18px" }, { label: "19", value: "19px" }, { label: "20", value: "20px" },
            { label: "21", value: "21px" }, { label: "22", value: "22px" }, { label: "23", value: "23px" }, { label: "24", value: "24px" }
          ], mode: "dropdown" } } }
        ];
        form.data = {
          entity: it.entity || "",
          name: it.name || "",
          animate_active: it.animate_active === true,
          animation_duration: Number.isFinite(Number(it.animation_duration)) ? Number(it.animation_duration) : 1,
          stop_script: it.stop_script || "",
          icon: it.icon || "",
          power_service: it.power_service || "",
          navigation_path: it.navigation_path || "",
          tap_action: it.tap_action || undefined,
          font_size: it.font_size || "",
        };
      });
    }
  }

  if (!customElements.get("activhome-action-stack")) {
    customElements.define("activhome-action-stack", ActivhomeActionStack);
  }
  if (!customElements.get("activhome-action-stack-editor")) {
    customElements.define("activhome-action-stack-editor", ActivhomeActionStackEditor);
  }

  window.customCards = window.customCards || [];
  if (!window.customCards.find((c) => c.type === "activhome-action-stack")) {
    window.customCards.push({
      type: "activhome-action-stack",
      name: "Activhome Action Stack",
      description: "Stack vertical d’actions : switch, input_boolean et script",
    });
  }
})();
