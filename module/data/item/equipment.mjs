import SystemDataModel from "../abstract.mjs";
import ActionTemplate from "./templates/action.mjs";
import ActivatedEffectTemplate from "./templates/activated-effect.mjs";
import EquippableItemTemplate from "./templates/equippable-item.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";
import ItemTypeTemplate from "./templates/item-type.mjs";
import PhysicalItemTemplate from "./templates/physical-item.mjs";
import MountableTemplate from "./templates/mountable.mjs";
import ItemTypeField from "./fields/item-type-field.mjs";

/**
 * Data definition for Equipment items.
 * @mixes ItemDescriptionTemplate
 * @mixes ItemTypeTemplate
 * @mixes PhysicalItemTemplate
 * @mixes EquippableItemTemplate
 * @mixes ActivatedEffectTemplate
 * @mixes ActionTemplate
 * @mixes MountableTemplate
 *
 * @property {object} armor             Armor details and equipment type information.
 * @property {number} armor.value       Base armor class or shield bonus.
 * @property {number} armor.dex         Maximum dex bonus added to armor class.
 * @property {object} speed             Speed granted by a piece of vehicle equipment.
 * @property {number} speed.value       Speed granted by this piece of equipment measured in feet or meters
 *                                      depending on system setting.
 * @property {string} speed.conditions  Conditions that may affect item's speed.
 * @property {number} strength          Minimum strength required to use a piece of armor.
 * @property {boolean} stealth          Does this equipment grant disadvantage on stealth checks when used?
 * @property {number} proficient        Does the owner have proficiency in this piece of equipment?
 */
export default class EquipmentData extends SystemDataModel.mixin(
  ItemDescriptionTemplate, ItemTypeTemplate, PhysicalItemTemplate, EquippableItemTemplate,
  ActivatedEffectTemplate, ActionTemplate, MountableTemplate
) {
  /** @inheritdoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      type: new ItemTypeField({value: "light", subtype: false}, {label: "DND5E.ItemEquipmentType"}),
      armor: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.NumberField({required: true, integer: true, min: 0, label: "DND5E.ArmorClass"}),
        dex: new foundry.data.fields.NumberField({required: true, integer: true, label: "DND5E.ItemEquipmentDexMod"})
      }),
      speed: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.NumberField({required: true, min: 0, label: "DND5E.Speed"}),
        conditions: new foundry.data.fields.StringField({required: true, label: "DND5E.SpeedConditions"})
      }, {label: "DND5E.Speed"}),
      strength: new foundry.data.fields.NumberField({
        required: true, integer: true, min: 0, label: "DND5E.ItemRequiredStr"
      }),
      stealth: new foundry.data.fields.BooleanField({required: true, label: "DND5E.ItemEquipmentStealthDisav"}),
      proficient: new foundry.data.fields.NumberField({
        required: true, min: 0, max: 1, integer: true, initial: null, label: "DND5E.ProficiencyLevel"
      })
    });
  }

  /* -------------------------------------------- */
  /*  Migrations                                  */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static _migrateData(source) {
    super._migrateData(source);
    EquipmentData.#migrateArmor(source);
    EquipmentData.#migrateType(source);
    EquipmentData.#migrateStrength(source);
    EquipmentData.#migrateProficient(source);
  }

  /* -------------------------------------------- */

  /**
   * Apply migrations to the armor field.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateArmor(source) {
    if ( !("armor" in source) ) return;
    source.armor ??= {};
    if ( (typeof source.armor.dex === "string") ) {
      const dex = source.armor.dex;
      if ( dex === "" ) source.armor.dex = null;
      else if ( Number.isNumeric(dex) ) source.armor.dex = Number(dex);
    }
  }

  /* -------------------------------------------- */

  /**
   * Apply migrations to the type field.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateType(source) {
    if ( !("type" in source) ) return;
    if ( source.type.value === "bonus" ) source.type.value = "trinket";
  }

  /* -------------------------------------------- */

  /**
   * Ensure blank strength values are migrated to null, and string values are converted to numbers.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateStrength(source) {
    if ( typeof source.strength !== "string" ) return;
    if ( source.strength === "" ) source.strength = null;
    if ( Number.isNumeric(source.strength) ) source.strength = Number(source.strength);
  }

  /* -------------------------------------------- */

  /**
   * Migrate the proficient field to convert boolean values.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateProficient(source) {
    if ( typeof source.proficient === "boolean" ) source.proficient = Number(source.proficient);
  }

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  /**
   * Properties displayed in chat.
   * @type {string[]}
   */
  get chatProperties() {
    return [
      CONFIG.DND5E.equipmentTypes[this.type.value],
      this.parent.labels?.armor ?? null,
      this.stealth ? game.i18n.localize("DND5E.StealthDisadvantage") : null
    ];
  }

  /* -------------------------------------------- */

  /**
   * Is this Item any of the armor subtypes?
   * @type {boolean}
   */
  get isArmor() {
    return this.type.value in CONFIG.DND5E.armorTypes;
  }

  /* -------------------------------------------- */

  /**
   * Is this item a separate large object like a siege engine or vehicle component that is
   * usually mounted on fixtures rather than equipped, and has its own AC and HP?
   * @type {boolean}
   */
  get isMountable() {
    return this.type.value === "vehicle";
  }

  /* -------------------------------------------- */

  /**
   * The proficiency multiplier for this item.
   * @returns {number}
   */
  get proficiencyMultiplier() {
    if ( Number.isFinite(this.proficient) ) return this.proficient;
    const actor = this.parent.actor;
    if ( !actor ) return 0;
    if ( actor.type === "npc" ) return 1; // NPCs are always considered proficient with any armor in their stat block.
    const config = CONFIG.DND5E.armorProficienciesMap;
    const itemProf = config[this.type.value];
    const actorProfs = actor.system.traits?.armorProf?.value ?? new Set();
    const isProficient = (itemProf === true) || actorProfs.has(itemProf) || actorProfs.has(this.type.baseItem);
    return Number(isProficient);
  }
}
