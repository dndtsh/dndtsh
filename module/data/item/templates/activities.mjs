import SystemDataModel from "../../abstract.mjs";
import { ActivitiesField } from "../../fields/activities-field.mjs";
import UsesField from "../../shared/uses-field.mjs";

/**
 * Data model template for items with activities.
 *
 * @property {ActivityCollection} activities  Activities on this item.
 * @mixin
 */
export default class ActivitiesTemplate extends SystemDataModel {

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.USES"];

  /* -------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return {
      activities: new ActivitiesField(),
      uses: new UsesField()
    };
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Which ability score modifier is used by this item?
   * @type {string|null}
   */
  get abilityMod() {
    return this._typeAbilityMod || null;
  }

  /**
   * Default ability key defined for this type.
   * @type {string|null}
   * @internal
   */
  get _typeAbilityMod() {
    return null;
  }

  /* -------------------------------------------- */

  /**
   * What is the critical hit threshold for this item? Uses the smallest value from among the following sources:
   *  - `critical.threshold` defined on the item
   *  - `critical.threshold` defined on ammunition, if consumption mode is set to ammo
   *  - Type-specific critical threshold
   * @type {number|null}
   */
  get criticalThreshold() {
    // TODO: Re-write this when `rollAttack` is moved into attack activity
    if ( !this.hasAttack ) return null;
    let ammoThreshold = Infinity;
    if ( this.hasAmmo ) {
      ammoThreshold = this.parent?.actor?.items.get(this.consume.target)?.system.critical.threshold ?? Infinity;
    }
    const threshold = Math.min(this.critical.threshold ?? Infinity, this._typeCriticalThreshold, ammoThreshold);
    return threshold < Infinity ? threshold : 20;
  }

  /**
   * Default critical threshold for this type.
   * @type {number}
   * @internal
   */
  get _typeCriticalThreshold() {
    return Infinity;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement an attack roll as part of its usage?
   * @type {boolean}
   */
  get hasAttack() {
    return !!this.activities.getByType("attack").size;
  }

  /* -------------------------------------------- */

  /**
   * Is this Item limited in its ability to be used by charges or by recharge?
   * @type {boolean}
   */
  get hasLimitedUses() {
    return !!this._source.uses?.max;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement a saving throw as part of its usage?
   * @type {boolean}
   */
  get hasSave() {
    return !!this.activities.getByType("save").size;
  }

  /* -------------------------------------------- */

  /**
   * Does this Item implement summoning as part of its usage?
   * @type {boolean}
   */
  get hasSummoning() {
    const activity = this.activities.getByType("summon")[0];
    return activity && activity.profiles.length > 0;
  }

  /* -------------------------------------------- */

  /**
   * Is this Item an activatable item?
   * @type {boolean}
   */
  get isActive() {
    return this.activities.size > 0;
  }

  /* -------------------------------------------- */

  /**
   * Can this item enchant other items?
   * @type {boolean}
   */
  get isEnchantment() {
    return !!this.activities.getByType("enchant").size;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item provide an amount of healing instead of conventional damage?
   * @type {boolean}
   */
  get isHealing() {
    return !!this.activities.getByType("heal").size;
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
  /* -------------------------------------------- */

  /**
   * Migrate the uses data structure from before activities.
   * @param {object} source  Candidate source data to migrate.
   */
  static migrateActivities(source) {
    ActivitiesTemplate.#migrateUses(source);
  }

  /* -------------------------------------------- */

  /**
   * Migrate the uses to the new data structure.
   * @param {object} source  Candidate source data to migrate.
   */
  static #migrateUses(source) {
    const charged = source.recharge?.charged;
    if ( charged !== undefined ) {
      source.uses ??= {};
      source.uses.spent = charged ? 0 : 1;
    }

    if ( foundry.utils.getType(source.uses?.recovery) !== "string" ) return;

    // If period is charges, set the recovery type to `formula`
    if ( source.uses.per === "charges" ) {
      source.uses.recovery = [{ period: "lr", type: "formula", formula: source.uses.recovery }];
    }

    // If period is not blank, set recovery type to `recoverAll`
    else if ( source.uses.per ) {
      source.uses.recovery = [{ period: source.uses.per, type: "recoverAll" }];
    }

    // Otherwise, check to see if recharge is set
    else if ( source.recharge?.value ) {
      source.uses.recovery = [{ period: "recharge", formula: source.recharge.value }];
    }

    // Prevent a string value for uses recovery from being cleaned into an default recovery entry
    else if ( source.uses?.recovery === "" ) {
      delete source.uses.recovery;
    }
  }

  /* -------------------------------------------- */

  /**
   * Modify data before initialization to create initial activity if necessary.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static initializeActivities(source) {
    if ( this.#shouldCreateInitialActivity(source) ) this.#createInitialActivity(source);
  }

  /* -------------------------------------------- */

  /**
   * Method to determine whether the activity creation migration should be performed. This migration should only be
   * performed on whole item data rather than partial updates, so check to ensure all of the necessary data is present.
   * @param {object} source  The candidate source data from which the model will be constructed.
   * @returns {boolean}
   */
  static #shouldCreateInitialActivity(source) {
    // If item doesn't have an action type or activation, then it doesn't need an activity
    if ( !source.system.actionType || !source.system.activation?.type ) return false;

    // If item was updated after `4.0.0`, it shouldn't need the migration
    if ( !foundry.utils.isNewerVersion("4.0.0", source._stats.systemVersion ?? "0.0.0") ) return false;

    // If the initial activity has already been created, no reason to create it again
    if ( !foundry.utils.isEmpty(source.system.activities) ) return false;

    return true;
  }

  /* -------------------------------------------- */

  /**
   * Migrate data from ActionTemplate and ActivatedEffectTemplate into a newly created activity.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #createInitialActivity(source) {
    let type = {
      mwak: "attack",
      rwak: "attack",
      msak: "attack",
      rsak: "attack",
      abil: null, // TODO: No specific activity type for this, perhaps UtilityActivity with the ability as an enricher?
      save: "save",
      ench: "enchant",
      summ: "summon",
      heal: "heal"
    }[source.system.actionType] ?? "utility";
    if ( (type === "utility") && source.system.damage?.parts?.length ) type = "damage";

    const cls = CONFIG.DND5E.activityTypes[type].documentClass;
    cls.createInitialActivity(source);
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Prepare final data for the activities & uses.
   * @param {object} rollData
   */
  prepareFinalActivityData(rollData) {
    const labels = this.parent.labels ??= {};
    UsesField.prepareData.call(this, rollData, labels);
    for ( const activity of this.activities ) activity.prepareFinalData();
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Retrieve information on available uses for display.
   * @returns {{value: number, max: number, name: string}}
   */
  getUsesData() {
    return { value: this.uses.value, max: this.uses.max, name: "system.uses.value" };
  }

  /* -------------------------------------------- */
  /*  Shims                                       */
  /* -------------------------------------------- */

  /**
   * Apply shims for data removed from ActionTemplate & ActivatedEffectTemplate.
   * @this {ItemDataModel}
   */
  static _applyActivityShims() {
    const shim = (template, property, get) => {
      if ( property in this ) return;
      Object.defineProperty(this, property, {
        get: () => {
          foundry.utils.logCompatibilityWarning(
            `The \`${property}\` property on \`${template}\` has been deprecated.`,
            { since: "DnD5e 4.0", until: "DnD5e 4.4", once: true }
          );
          return get();
        },
        configurable: true,
        enumerable: false
      });
    };
    const addShims = (template, shims) => Object.entries(shims).forEach(([key, method]) => shim(template, key, method));
    const firstActivity = this.activities.contents[0] ?? {};

    addShims("ActionTemplate", {
      ability: () => firstActivity.ability ?? null,
      actionType: () => firstActivity.actionType ?? "",
      attack: () => {
        const activity = this.activities.getByType("attack")[0] ?? {};
        return {
          bonus: activity.attack?.bonus ?? "",
          flat: activity.attack?.flat ?? false
        };
      },
      chatFlavor: () => firstActivity.description?.chatFlavor ?? "",
      critical: () => {
        const activity = this.activities.getByType("attack")[0] || this.activities.getByType("damage")[0];
        return {
          threshold: activity?.attack?.critical?.threshold ?? null,
          damage: activity?.damage?.critical?.bonus ?? ""
        };
      },
      damage: () => {
        const activity = this.activities.getByType("attack")[0] || this.activities.getByType("damage")[0]
          || this.activities.getByType("save")[0];
        return {
          parts: activity?.damage.parts.map(d => ([d.formula, d.types.first() ?? ""])) ?? [],
          versatile: ""
        };
      },
      enchantment: () => this.activities.getByType("enchant")[0],
      formula: () => this.activities.getByType("utility")[0]?.roll?.formula ?? "",
      hasAbilityCheck: () => false,
      hasDamage: () => !!this.activities.find(a => a.damage?.parts?.length),
      isVersatile: () => this.properties?.has("ver"),
      save: () => {
        const activity = this.activities.getByType("save")[0] ?? {};
        return {
          ability: activity.ability ?? null,
          dc: activity.save?.dc?.formula ?? null,
          scaling: activity.save?.dc?.calculation ?? ""
        };
      },
      summons: () => this.activities.getByType("summon")[0]
    });

    addShims("ActivatedEffectTemplate", {
      activatedEffectCardProperties: () => [
        this.parent.labels.activation,
        this.parent.labels.target,
        this.parent.labels.range,
        this.parent.labels.duration
      ],
      activation: () => {
        const activation = firstActivity.activation ?? {};
        return {
          type: activation.type ?? "",
          cost: activation.value ?? null,
          condition: activation.condition ?? ""
        };
      },
      consume: () => {
        const consumption = firstActivity.consumption ?? {};
        const target = consumption.targets?.[0] ?? {};
        return {
          type: target.type ?? "",
          target: target.target ?? "",
          amount: target.value ?? 1,
          scale: consumption.scaling?.allowed ?? false
        };
      },
      duration: () => firstActivity.duration ?? { value: null, units: "" },
      hasAmmo: () => {
        const consume = this.consume;
        return this.isActive && !!consume.target && !!consume.type && this.hasAttack && (consume.type === "ammo");
      },
      hasAreaTarget: () => this.isActive && this.target.template?.type,
      hasIndividualTarget: () => this.isActive && this.target.affects?.type,
      hasResource: () => this.isActive && !!this.consume.target && !!this.consume.type && !this.hasAttack,
      hasScalarDuration: () => this.duration.units in CONFIG.DND5E.scalarTimePeriods,
      hasScalarRange: () => this.range.units in CONFIG.DND5E.movementUnits,
      hasScalarTarget: () => this.target.template?.type || ![null, "", "self"].includes(this.target.affects?.type),
      hasTarget: () => this.isActive && (this.target.template?.type || this.target.affects?.type),
      range: () => firstActivity.range ?? { value: null, type: "" },
      target: () => {
        const target = firstActivity.target ?? {};
        return {
          value: target.affects?.count || target.template?.size || "",
          width: target.template?.width ?? "",
          units: target.template?.units ?? "",
          type: target.affects?.type ?? target.template?.type,
          prompt: target.prompt ?? true
        };
      }
    });
  }
}
