import { FormulaField } from "../../fields.mjs";

/**
 * Data model template for item actions.
 *
 * @property {string} ability             Ability score to use when determining modifier.
 * @property {string} actionType          Action type as defined in `DND5E.itemActionTypes`.
 * @property {string} attackBonus         Numeric or dice bonus to attack rolls.
 * @property {string} chatFlavor          Extra text displayed in chat.
 * @property {object} critical            Information on how critical hits are handled.
 * @property {number} critical.threshold  Minimum number on the dice to roll a critical hit.
 * @property {string} critical.damage     Extra damage on critical hit.
 * @property {object} damage              Item damage formulas.
 * @property {string[][]} damage.parts    Array of damage formula and types.
 * @property {string} damage.versatile    Special versatile damage formula.
 * @property {string} formula             Other roll formula.
 * @property {object} save                Item saving throw data.
 * @property {string} save.ability        Ability required for the save.
 * @property {number} save.dc             Custom saving throw value.
 * @property {string} save.scaling        Method for automatically determining saving throw DC.
 * @mixin
 */
export default class ActionTemplate extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      ability: new foundry.data.fields.StringField({
        required: true, nullable: true, initial: null, label: "DND5E.AbilityModifier"
      }),
      actionType: new foundry.data.fields.StringField({
        required: true, nullable: true, initial: null, label: "DND5E.ItemActionType"
      }),
      attackBonus: new FormulaField({required: true, label: "DND5E.ItemAttackBonus"}),
      chatFlavor: new foundry.data.fields.StringField({required: true, label: "DND5E.ChatFlavor"}),
      critical: new foundry.data.fields.SchemaField({
        threshold: new foundry.data.fields.NumberField({
          required: true, integer: true, initial: null, positive: true, label: "DND5E.ItemCritThreshold"
        }),
        damage: new FormulaField({required: true, label: "DND5E.ItemCritExtraDamage"})
      }),
      damage: new foundry.data.fields.SchemaField({
        parts: new foundry.data.fields.ArrayField(new foundry.data.fields.ArrayField(
          new foundry.data.fields.StringField()
        ), {required: true}),
        versatile: new FormulaField({required: true, label: "DND5E.VersatileDamage"})
      }, {label: "DND5E.Damage"}),
      formula: new FormulaField({required: true, label: "DND5E.OtherFormula"}),
      save: new foundry.data.fields.SchemaField({
        ability: new foundry.data.fields.StringField({required: true, blank: true, label: "DND5E.Ability"}),
        dc: new foundry.data.fields.NumberField({
          required: true, min: 0, integer: true, label: "DND5E.AbbreviationDC"
        }),
        scaling: new foundry.data.fields.StringField({
          required: true, blank: false, initial: "spell", label: "DND5E.ScalingFormula"
        })
      }, {label: "DND5E.SavingThrow"})
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static migrateData(source) {
    this.migrateAttackBonus(source);
  }

  /* -------------------------------------------- */

  /**
   * Ensure a 0 in attack bonus is converted to an empty string rather than "0".
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static migrateAttackBonus(source) {
    if ( (source.attackBonus === 0) || (source.attackBonus === "0") ) source.attackBonus = "";
  }
}
