import ItemSheet5e from "./item-sheet.mjs";
import ItemSheetV2Mixin from "./sheet-v2-mixin.mjs";
import ContextMenu5e from "../context-menu.mjs";

/**
 * V2 Item sheet implementation.
 */
export default class ItemSheet5e2 extends ItemSheetV2Mixin(ItemSheet5e) {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e2", "sheet", "item"],
      width: 500,
      height: "auto",
      resizable: false,
      scrollY: [".tab.active"],
      elements: { effects: "dnd5e-effects" },
      legacyDisplay: false,
      contextMenu: ContextMenu5e
    });
  }

  /* -------------------------------------------- */

  /** @override */
  get template() {
    return "systems/dnd5e/templates/items/item-sheet-2.hbs";
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options) {
    const context = await super.getData(options);
    const { activities, damage, properties, target, type } = this.item.system;

    // Effects
    for ( const category of Object.values(context.effects) ) {
      category.effects = await category.effects.reduce(async (arr, effect) => {
        effect.updateDuration();
        const { id, name, img, disabled, duration } = effect;
        const source = await effect.getSource();
        arr = await arr;
        arr.push({
          id, name, img, disabled, duration, source,
          parent,
          durationParts: duration.remaining ? duration.label.split(", ") : [],
          hasTooltip: true
        });
        return arr;
      }, []);
    }

    // Hit Dice
    context.hitDieTypes = CONFIG.DND5E.hitDieTypes.map(d => ({ label: d, value: d }));

    // Activation
    context.activationTypes = Object.entries(CONFIG.DND5E.activityActivationTypes).map(([value, { label, group }]) => {
      return { value, label, group };
    });

    // Targets
    context.targetTypes = [
      ...Object.entries(CONFIG.DND5E.individualTargetTypes).map(([value, label]) => {
        return { value, label, group: "DND5E.TargetTypeIndividual" };
      }),
      ...Object.entries(CONFIG.DND5E.areaTargetTypes).map(([value, { label }]) => {
        return { value, label, group: "DND5E.TargetTypeArea" };
      })
    ];
    context.scalarTarget = !["", "self", "any"].includes(target?.affects?.type);

    // Range
    context.rangeTypes = [
      ...Object.entries(CONFIG.DND5E.rangeTypes).map(([value, label]) => ({ value, label })),
      ...Object.entries(CONFIG.DND5E.movementUnits).map(([value, label]) => {
        return { value, label, group: "DND5E.RangeDistance" };
      })
    ];

    // Duration
    context.durationUnits = [
      ...Object.entries(CONFIG.DND5E.specialTimePeriods).map(([value, label]) => ({ value, label })),
      ...Object.entries(CONFIG.DND5E.scalarTimePeriods).map(([value, label]) => {
        return { value, label, group: "DND5E.DurationTime" };
      }),
      ...Object.entries(CONFIG.DND5E.permanentTimePeriods).map(([value, label]) => {
        return { value, label, group: "DND5E.DurationPermanent" };
      })
    ];

    // Templates
    const { sizes } = CONFIG.DND5E.areaTargetTypes[target?.template?.type] ?? {};
    if ( sizes ) {
      context.dimensions = {
        size: "DND5E.AreaOfEffect.Size.Label",
        width: sizes.includes("width") && (sizes.includes("length") || sizes.includes("radius")),
        height: sizes.includes("height")
      };
      if ( sizes.includes("radius") ) context.dimensions.size = "DND5E.AreaOfEffect.Size.Radius";
      else if ( sizes.includes("length") ) context.dimensions.size = "DND5E.AreaOfEffect.Size.Length";
      else if ( sizes.includes("width") ) context.dimensions.size = "DND5E.AreaOfEffect.Size.Width";
      if ( sizes.includes("thickness") ) context.dimensions.width = "DND5E.AreaOfEffect.Size.Thickness";
      else if ( context.dimensions.width ) context.dimensions.width = "DND5E.AreaOfEffect.Size.Width";
      if ( context.dimensions.height ) context.dimensions.height = "DND5E.AreaOfEffect.Size.Height";
    }

    // Equipment
    context.equipmentTypes = [
      ...Object.entries(CONFIG.DND5E.miscEquipmentTypes).map(([value, label]) => ({ value, label })),
      ...Object.entries(CONFIG.DND5E.armorTypes).map(([value, label]) => ({ value, label, group: "DND5E.Armor" }))
    ];

    // Limited Uses
    context.recoveryPeriods = [
      ...Object.entries(CONFIG.DND5E.limitedUsePeriods)
        .filter(([, { deprecated }]) => !deprecated)
        .map(([value, { label }]) => ({ value, label, group: "DND5E.DurationTime" })),
      { value: "recharge", label: "DND5E.USES.Recovery.Recharge.Label" }
    ];
    context.recoveryTypes = [
      { value: "recoverAll", label: "DND5E.USES.Recovery.Type.RecoverAll" },
      { value: "loseAll", label: "DND5E.USES.Recovery.Type.LoseAll" },
      { value: "formula", label: "DND5E.USES.Recovery.Type.Formula" }
    ];
    context.usesRecovery = (context.source.uses?.recovery ?? []).map((data, index) => ({
      data,
      fields: context.fields.uses.fields.recovery.element.fields,
      prefix: `system.uses.recovery.${index}.`,
      source: context.source.uses.recovery[index] ?? data,
      formulaOptions: data.period === "recharge" ? data.recharge?.options : null
    }));

    // Damage
    context.denominationOptions = [
      { value: "", label: "" },
      ...CONFIG.DND5E.dieSteps.map(value => ({ value, label: `d${value}` }))
    ];
    context.damageTypes = ["base", "versatile"].reduce((obj, k) => {
      obj[k] = Object.entries(CONFIG.DND5E.damageTypes).map(([value, { label }]) => {
        return { value, label, selected: damage?.[k]?.types?.has(value) };
      });
      return obj;
    }, {});

    // Activities
    context.activities = (activities ?? []).map(({ _id: id, name, img }) => ({
      id, name,
      img: { src: img, svg: img?.endsWith(".svg") }
    }));

    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  _getItemAdvancementTags(advancement) {
    if ( this.item.isEmbedded && (this._mode !== this.constructor.MODES.EDIT) ) return [];
    const tags = [];
    if ( advancement.classRestriction === "primary" ) {
      tags.push({
        label: "DND5E.AdvancementClassRestrictionPrimary",
        icon: "systems/dnd5e/icons/svg/original-class.svg"
      });
    } else if ( advancement.classRestriction === "secondary" ) {
      tags.push({
        label: "DND5E.AdvancementClassRestrictionSecondary",
        icon: "systems/dnd5e/icons/svg/multiclass.svg"
      });
    }
    return tags;
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);

    for ( const control of html[0].querySelectorAll(".tab.advancement [data-context-menu]") ) {
      control.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const { clientX, clientY } = event;
        event.currentTarget.closest("[data-id]").dispatchEvent(new PointerEvent("contextmenu", {
          view: window, bubbles: true, cancelable: true, clientX, clientY
        }));
      });
    }

    html.find(".activities .activity .name").on("click", this._onEditActivity.bind(this));

    if ( this.isEditable ) {
      html.find("button.control-button").on("click", this._onSheetAction.bind(this));
    }
  }

  /* -------------------------------------------- */

  /**
   * Create a new recovery profile.
   * @returns {Promise}
   * @protected
   */
  _onAddRecovery() {
    return this.submit({ updateData: { "system.uses.recovery": [...this.item.system.toObject().uses.recovery, {}] } });
  }

  /* -------------------------------------------- */

  /**
   * Delete an activity.
   * @param {HTMLElement} target  The deletion even target.
   * @returns {Promise|void}
   * @protected
   */
  _onDeleteActivity(target) {
    const { id } = target.closest("[data-id]").dataset;
    const activity = this.item.system.activities.get(id);
    return activity?.deleteDialog();
  }

  /* -------------------------------------------- */

  /**
   * Delete a recovery profile.
   * @param {HTMLElement} target  The deletion event target.
   * @returns {Promise}
   * @protected
   */
  _onDeleteRecovery(target) {
    const recovery = this.item.system.toObject().uses.recovery;
    recovery.splice(target.closest("[data-index]").dataset.index, 1);
    return this.submit({ updateData: { "system.uses.recovery": recovery } });
  }

  /* -------------------------------------------- */

  /**
   * Edit an activity.
   * @param {PointerEvent} event  The triggering event.
   * @returns {Promise|void}
   * @protected
   */
  _onEditActivity(event) {
    const { id } = event.currentTarget.closest("[data-id]").dataset;
    const activity = this.item.system.activities.get(id);
    return activity?.sheet?.render({ force: true });
  }

  /* -------------------------------------------- */

  /**
   * Handle performing some sheet action.
   * @param {PointerEvent} event  The originating event.
   * @returns {Promise|void}
   * @protected
   */
  _onSheetAction(event) {
    const target = event.currentTarget;
    const { action } = target.dataset;
    switch ( action ) {
      case "addRecovery": return this._onAddRecovery();
      case "deleteActivity": return this._onDeleteActivity(target);
      case "deleteRecovery": return this._onDeleteRecovery(target);
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _updateObject(event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    if ( foundry.utils.hasProperty(expanded, "uses.recovery") ) {
      formData.uses.recovery = Object.values(formData.uses.recovery);
    }
    return super._updateObject(event, formData);
  }

  /* -------------------------------------------- */
  /*  Filtering                                   */
  /* -------------------------------------------- */

  /**
   * Filter child embedded ActiveEffects based on the current set of filters.
   * @param {string} collection    The embedded collection name.
   * @param {Set<string>} filters  Filters to apply to the children.
   * @returns {Document[]}
   * @protected
   */
  _filterChildren(collection, filters) {
    if ( collection === "effects" ) return Array.from(this.item.effects);
    return [];
  }
}
