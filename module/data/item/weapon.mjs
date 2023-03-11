import SystemDataModel from "../abstract.mjs";
import { MappingField } from "../fields.mjs";
import ActionTemplate from "./templates/action.mjs";
import ActivatedEffectTemplate from "./templates/activated-effect.mjs";
import EquippableItemTemplate from "./templates/equippable-item.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";
import ItemTypeTemplate from "./templates/item-type.mjs";
import PhysicalItemTemplate from "./templates/physical-item.mjs";
import MountableTemplate from "./templates/mountable.mjs";

/**
 * Data definition for Weapon items.
 * @mixes ItemDescriptionTemplate
 * @mixes ItemTypeTemplate
 * @mixes PhysicalItemTemplate
 * @mixes EquippableItemTemplate
 * @mixes ActivatedEffectTemplate
 * @mixes ActionTemplate
 * @mixes MountableTemplate
 *
 * @property {object} properties   Mapping of various weapon property booleans.
 * @property {boolean} proficient  Does the weapon's owner have proficiency?
 */
export default class WeaponData extends SystemDataModel.mixin(
  ItemDescriptionTemplate, ItemTypeTemplate, PhysicalItemTemplate, EquippableItemTemplate,
  ActivatedEffectTemplate, ActionTemplate, MountableTemplate
) {
  /** @inheritdoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      properties: new MappingField(new foundry.data.fields.BooleanField(), {
        required: true, initialKeys: CONFIG.DND5E.weaponProperties, label: "DND5E.ItemWeaponProperties"
      }),
      proficient: new foundry.data.fields.BooleanField({required: true, initial: true, label: "DND5E.Proficient"})
    });
  }

  /* -------------------------------------------- */
  /*  Migrations                                  */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static migrateData(source) {
    super.migrateData(source);
    WeaponData.#migratePropertiesData(source);
    WeaponData.#migrateProficient(source);
    WeaponData.#migrateWeaponType(source);
  }

  /* -------------------------------------------- */

  /**
   * Migrate the weapons's properties object to remove any old, non-boolean values.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migratePropertiesData(source) {
    if ( !source.properties ) return;
    for ( const [key, value] of Object.entries(source.properties) ) {
      if ( typeof value !== "boolean" ) delete source.properties[key];
    }
  }

  /* -------------------------------------------- */

  /**
   * Migrate the proficient field to remove non-boolean values.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateProficient(source) {
    if ( typeof source.proficient === "number" ) source.proficient = Boolean(source.proficient);
  }

  /* -------------------------------------------- */

  /**
   * Migrate the weapon type.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateWeaponType(source) {
    if ( source.type.value === null ) source.type.value = "simpleM";
  }

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  /**
   * Properties displayed in chat.
   * @type {string[]}
   */
  get chatProperties() {
    return [CONFIG.DND5E.weaponTypes[this.type.value]];
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get _typeAbilityMod() {
    if ( ["simpleR", "martialR"].includes(this.type.value) ) return "dex";

    const abilities = this.parent?.actor?.system.abilities;
    if ( this.properties.fin && abilities ) {
      return (abilities.dex?.mod ?? 0) >= (abilities.str?.mod ?? 0) ? "dex" : "str";
    }

    return null;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get _typeCriticalThreshold() {
    return this.parent?.actor?.flags.dnd5e?.weaponCriticalThreshold ?? Infinity;
  }

  /* -------------------------------------------- */

  /**
   * Is this item a separate large object like a siege engine or vehicle component that is
   * usually mounted on fixtures rather than equipped, and has its own AC and HP?
   * @type {boolean}
   */
  get isMountable() {
    return this.type.value === "siege";
  }
}
