const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Base application from which all system applications should be based.
 */
export default class Application5e extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["dnd5e2"]
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
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
  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelectorAll("multi-select").forEach(select => {
      if ( select.disabled ) return;
      select.querySelectorAll(".tag").forEach(tag => {
        tag.classList.add("remove");
        tag.querySelector(":scope > span")?.classList.add("remove");
      });
    });
  }
}
