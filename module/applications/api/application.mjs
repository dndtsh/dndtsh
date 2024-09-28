const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Base application from which all system applications should be based.
 */
export default class Application5e extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["dnd5e2"],
    window: {
      subtitle: ""
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * A reference to the window subtitle.
   * @type {string}
   */
  get subtitle() {
    return game.i18n.localize(this.options.window.subtitle ?? "");
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    if ( options.isFirstRender && this.hasFrame ) {
      options.window ||= {};
      options.window.subtitle ||= this.subtitle;
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.CONFIG = CONFIG.DND5E;
    context.inputs = { ...foundry.applications.fields, ...dnd5e.applications.fields };
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _renderFrame(options) {
    const frame = await super._renderFrame(options);

    // Subtitles
    const subtitle = document.createElement("h2");
    subtitle.classList.add("window-subtitle");
    frame.querySelector(".window-title").insertAdjacentElement("afterend", subtitle);

    // Icon
    if ( (options.window?.icon ?? "").includes(".") ) {
      const icon = frame.querySelector(".window-icon");
      const newIcon = document.createElement(options.window.icon?.endsWith(".svg") ? "dnd5e-icon" : "img");
      newIcon.classList.add("window-icon");
      newIcon.src = options.window.icon;
      icon.replaceWith(newIcon);
    }

    return frame;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _updateFrame(options) {
    super._updateFrame(options);
    if ( options.window && ("subtitle" in options.window) ) {
      this.element.querySelector(".window-header > .window-subtitle").innerText = options.window.subtitle;
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender(context, options);

    // Allow multi-select tags to be removed when the whole tag is clicked.
    this.element.querySelectorAll("multi-select").forEach(select => {
      if ( select.disabled ) return;
      select.querySelectorAll(".tag").forEach(tag => {
        tag.classList.add("remove");
        tag.querySelector(":scope > span")?.classList.add("remove");
      });
    });

    // Add special styling for label-top hints.
    this.element.querySelectorAll(".label-top > p.hint").forEach(hint => {
      const label = hint.parentElement.querySelector(":scope > label");
      if ( !label ) return;
      hint.ariaLabel = hint.innerText;
      hint.dataset.tooltip = hint.innerHTML;
      hint.innerHTML = "";
      label.insertAdjacentElement("beforeend", hint);
    });
  }

  /* -------------------------------------------- */

  /**
   * Disable form fields that aren't marked with the `interface-only` class.
   */
  _disableFields() {
    const selector = `.window-content :is(${[
      "INPUT", "SELECT", "TEXTAREA", "BUTTON", "DND5E-CHECKBOX", "COLOR-PICKER", "DOCUMENT-TAGS",
      "FILE-PICKER", "HUE-SLIDER", "MULTI-SELECT", "PROSE-MIRROR", "RANGE-PICKER", "STRING-TAGS"
    ].join(", ")}):not(.interface-only)`;
    for ( const element of this.element.querySelectorAll(selector) ) {
      if ( element.tagName === "TEXTAREA" ) element.readOnly = true;
      else element.disabled = true;
    }
  }
}
