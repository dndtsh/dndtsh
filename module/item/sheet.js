import TraitConfiguration from "../apps/trait-configuration.js";
import TraitSelector from "../apps/trait-selector.js";
import ActiveEffect5e from "../active-effect.js";

/**
 * Override and extend the core ItemSheet implementation to handle specific item types
 * @extends {ItemSheet}
 */
export default class ItemSheet5e extends ItemSheet {
  constructor(...args) {
    super(...args);

    // Expand the default size of the class sheet
    if ( this.object.data.type === "class" ) {
      this.options.width = this.position.width =  600;
      this.options.height = this.position.height = 680;
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
	static get defaultOptions() {
	  return foundry.utils.mergeObject(super.defaultOptions, {
      width: 560,
      height: 400,
      classes: ["dnd5e", "sheet", "item"],
      resizable: true,
      scrollY: [".tab.details"],
      tabs: [{navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description"}]
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get template() {
    const path = "systems/dnd5e/templates/items/";
    return `${path}/${this.item.data.type}.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData(options) {
    const data = super.getData(options);
    const itemData = data.data;
    data.labels = this.item.labels;
    data.config = CONFIG.DND5E;

    // Item Type, Status, and Details
    data.itemType = game.i18n.localize(`ITEM.Type${data.item.type.titleCase()}`);
    data.itemStatus = this._getItemStatus(itemData);
    data.itemProperties = this._getItemProperties(itemData);
    data.isPhysical = itemData.data.hasOwnProperty("quantity");

    // Potential consumption targets
    data.abilityConsumptionTargets = this._getItemConsumptionTargets(itemData);

    // Action Details
    data.hasAttackRoll = this.item.hasAttack;
    data.isHealing = itemData.data.actionType === "heal";
    data.isFlatDC = getProperty(itemData, "data.save.scaling") === "flat";
    data.isLine = ["line", "wall"].includes(itemData.data.target?.type);

    // Original maximum uses formula
    const sourceMax = foundry.utils.getProperty(this.item.data._source, "data.uses.max");
    if ( sourceMax ) itemData.data.uses.max = sourceMax;

    // Vehicles
    data.isCrewed = itemData.data.activation?.type === 'crew';
    data.isMountable = this._isItemMountable(itemData);

    // Prepare Active Effects
    data.effects = ActiveEffect5e.prepareActiveEffectCategories(this.item.effects);

    if ( itemData.type === "background" ) {
      await this._prepareGrantedTraits(data);
    }

    // Re-define the template data references (backwards compatible)
    data.item = itemData;
    data.data = itemData.data;
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Get the valid item consumption targets which exist on the actor
   * @param {Object} item         Item data for the item being displayed
   * @return {{string: string}}   An object of potential consumption targets
   * @private
   */
  _getItemConsumptionTargets(item) {
    const consume = item.data.consume || {};
    if ( !consume.type ) return [];
    const actor = this.item.actor;
    if ( !actor ) return {};

    // Ammunition
    if ( consume.type === "ammo" ) {
      return actor.itemTypes.consumable.reduce((ammo, i) =>  {
        if ( i.data.data.consumableType === "ammo" ) {
          ammo[i.id] = `${i.name} (${i.data.data.quantity})`;
        }
        return ammo;
      }, {[item._id]: `${item.name} (${item.data.quantity})`});
    }

    // Attributes
    else if ( consume.type === "attribute" ) {
      const attributes = TokenDocument.getTrackedAttributes(actor.data.data);
      attributes.bar.forEach(a => a.push("value"));
      return attributes.bar.concat(attributes.value).reduce((obj, a) => {
        let k = a.join(".");
        obj[k] = k;
        return obj;
      }, {});
    }

    // Materials
    else if ( consume.type === "material" ) {
      return actor.items.reduce((obj, i) => {
        if ( ["consumable", "loot"].includes(i.data.type) && !i.data.data.activation ) {
          obj[i.id] = `${i.name} (${i.data.data.quantity})`;
        }
        return obj;
      }, {});
    }

    // Charges
    else if ( consume.type === "charges" ) {
      return actor.items.reduce((obj, i) => {

        // Limited-use items
        const uses = i.data.data.uses || {};
        if ( uses.per && uses.max ) {
          const label = uses.per === "charges" ?
            ` (${game.i18n.format("DND5E.AbilityUseChargesLabel", {value: uses.value})})` :
            ` (${game.i18n.format("DND5E.AbilityUseConsumableLabel", {max: uses.max, per: uses.per})})`;
          obj[i.id] = i.name + label;
        }

        // Recharging items
        const recharge = i.data.data.recharge || {};
        if ( recharge.value ) obj[i.id] = `${i.name} (${game.i18n.format("DND5E.Recharge")})`;
        return obj;
      }, {})
    }
    else return {};
  }

  /* -------------------------------------------- */

  /**
   * Get the text item status which is shown beneath the Item type in the top-right corner of the sheet
   * @return {string}
   * @private
   */
  _getItemStatus(item) {
    if ( item.type === "spell" ) {
      return CONFIG.DND5E.spellPreparationModes[item.data.preparation];
    }
    else if ( ["weapon", "equipment"].includes(item.type) ) {
      return game.i18n.localize(item.data.equipped ? "DND5E.Equipped" : "DND5E.Unequipped");
    }
    else if ( item.type === "tool" ) {
      return game.i18n.localize(item.data.proficient ? "DND5E.Proficient" : "DND5E.NotProficient");
    }
  }

  /* -------------------------------------------- */

  /**
   * Get the Array of item properties which are used in the small sidebar of the description tab
   * @return {Array}
   * @private
   */
  _getItemProperties(item) {
    const props = [];
    const labels = this.item.labels;

    if ( item.type === "weapon" ) {
      props.push(...Object.entries(item.data.properties)
        .filter(e => e[1] === true)
        .map(e => CONFIG.DND5E.weaponProperties[e[0]]));
    }

    else if ( item.type === "spell" ) {
      props.push(
        labels.components,
        labels.materials,
        item.data.components.concentration ? game.i18n.localize("DND5E.Concentration") : null,
        item.data.components.ritual ? game.i18n.localize("DND5E.Ritual") : null
      )
    }

    else if ( item.type === "equipment" ) {
      props.push(CONFIG.DND5E.equipmentTypes[item.data.armor.type]);
      props.push(labels.armor);
    }

    else if ( item.type === "feat" ) {
      props.push(labels.featType);
    }

    // Action type
    if ( item.data.actionType ) {
      props.push(CONFIG.DND5E.itemActionTypes[item.data.actionType]);
    }

    // Action usage
    if ( (item.type !== "weapon") && item.data.activation && !isObjectEmpty(item.data.activation) ) {
      props.push(
        labels.activation,
        labels.range,
        labels.target,
        labels.duration
      )
    }
    return props.filter(p => !!p);
  }

  /* -------------------------------------------- */

  /**
   * Is this item a separate large object like a siege engine or vehicle
   * component that is usually mounted on fixtures rather than equipped, and
   * has its own AC and HP.
   * @param item
   * @returns {boolean}
   * @private
   */
  _isItemMountable(item) {
    const data = item.data;
    return (item.type === 'weapon' && data.weaponType === 'siege')
      || (item.type === 'equipment' && data.armor.type === 'vehicle');
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  setPosition(position={}) {
    if ( !(this._minimized  || position.height) ) {
      position.height = (this._tabs[0].active === "details") ? "auto" : this.options.height;
    }
    return super.setPosition(position);
  }

  /* -------------------------------------------- */
  /*  Granted Traits                              */
  /* -------------------------------------------- */

  /**
   * Prepare the labels and selection lists for granted traits (used by Background & Class items).
   * @param {object} data  Data being prepared.
   */
  async _prepareGrantedTraits(data) {
    const listFormatter = new Intl.ListFormat(game.i18n.lang, { type: "unit" });
    const types = ["skills", "tool", "languages"];
    data.labels.grants = {};
    for ( const type of types ) {
      const grants = data.data.data[type].grants;
      if ( this.object.isEmbedded ) {
        const allowReplacements = ["skills", "tool"].includes(type);
        const choices = await this._prepareUnfulfilledGrants(
          type, grants, this.object.actor.getSelectedTraits(type), data.data.data[type].value, allowReplacements
        );
        data.data.data[type].available = choices;
        if ( choices ) {
          data.labels.grants[type] = game.i18n.format("DND5E.TraitConfigurationChoicesRemaining", {
            count: choices.remaining,
            type: TraitConfiguration.typeLabel(type, choices.remaining)
          });
        }
      } else {
        data.labels.grants[type] = listFormatter.format(grants.map(g => TraitConfiguration.grantLabel(type, g)));
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Determine which of the provided grants, if any, still needs to be fulfilled.
   * @param {string} type                      Trait affected by these grants.
   * @param {Array.<string|TraitGrant> grants  Grants that should be fulfilled.
   * @param {Array.<string>} actorSelected     Values that have already been selected on the actor.
   * @param {Array.<string>} selected          Values that have already been selected on this item.
   * @param {boolean} allowReplacements        If a grant with limited choices has no available options,
   *                                           allow player to select from full list of options.
   * @param {{
   *   choices: object
   *   remaining: number
   * }|null}  Choices available for most permissive unfulfilled grant & number of remaining traits to select.
   */
  async _prepareUnfulfilledGrants(type, grants, actorSelected, itemSelected, allowReplacements) {
    const expandedGrants = grants.reduce((arr, grant) => {
      if ( typeof grant === "string" ) {
        arr.push([grant]);
        return arr;
      }
      arr.push(grant.choices ?? []);
      if ( (typeof grant === "object") && (grant.count > 1) ) {
        let count = grant.count - 1;
        while ( count > 0 ) {
          arr.push(grant.choices ?? []);
          count -= 1;
        }
      }
      return arr;
    }, []);

    // If all of the grants have been selected, no need to go further
    if ( expandedGrants.length <= itemSelected.length ) return null;
 
    // Figure out how many choices each grant and sort by most restrictive first
    const allChoices = await TraitConfiguration.getTraitChoices(type);
    let available = expandedGrants.map(grant => this._filterGrantChoices(allChoices, grant));
    const setSort = (lhs, rhs) => lhs.set.size - rhs.set.size;
    available.sort(setSort);

    // Remove any fulfilled grants
    for ( const selected of itemSelected ) {
      let foundMatch = false;
      available = available.filter(grant => {
        if ( foundMatch || !grant.set.has(selected) ) return true;
        foundMatch = true;
        return false;
      });
    }

    // Filter out any traits that have already been selected
    this._filterTraitObject(allChoices, actorSelected, false);
    available = available.map(a => this._filterGrantChoices(allChoices, Array.from(a.set)));
    let unfilteredCount = available.length;

    available = available.filter(a => a.set.size > 0);
    const remainingSet = new Set(available.flatMap(a => Array.from(a.set)));
    let remainingChoices = foundry.utils.duplicate(allChoices);
    this._filterTraitObject(remainingChoices, Array.from(remainingSet), true);

    if ( foundry.utils.isObjectEmpty(allChoices) ) {
      if ( !allowReplacements || (unfilteredCount >= available.length) ) return null;
      remainingChoices = allChoices;
    }
    return {
      choices: remainingChoices,
      remaining: available.length
    }
  }

  /* -------------------------------------------- */

  /**
   * Turn a grant into a set of possible choices it provides.
   * @param {object} traits       Object containing all potential traits grouped into categories.
   * @param {string[]} choices    Choices to use when building trait list. Empty array means all traits passed through.
   * @return {{
   *   choices: object,
   *   set: Set.<string>
   * }}
   * @private
   */
  _filterGrantChoices(traits, choices) {
    const choiceSet = (choices) => Object.entries(choices).reduce((set, [key, choice]) => {
      if ( choice.children ) choiceSet(choice.children).forEach(c => set.add(c));
      else set.add(key);
      return set;
    }, new Set());

    let traitsSet = foundry.utils.duplicate(traits);
    if ( choices.length > 0 ) this._filterTraitObject(traitsSet, choices, true);
    return { choices: traitsSet, set: choiceSet(traitsSet) };
  }

  /* -------------------------------------------- */

  /**
   * Filters the provided trait object.
   * @param {object} traits    Object of traits to filter.
   * @param {string[]} filter  Array of keys to use when applying the filter.
   * @param {boolean} union    If true, only items in filter array will be included.
   *                           If false, only items not in the filter array will be included.
   */
  _filterTraitObject(traits, filter, union) {
    for ( const [key, trait] of Object.entries(traits) ) {
      if ( filter.includes(key) ) {
        if ( !union ) delete traits[key];
        continue;
      };

      let selectedChildren = false;
      if ( trait.children ) {
        this._filterTraitObject(trait.children, filter, union);
        if ( !foundry.utils.isObjectEmpty(trait.children) ) selectedChildren = true;
      }

      if ( union && !selectedChildren ) delete traits[key];
    }
  }

  /* -------------------------------------------- */
  /*  Form Submission                             */
	/* -------------------------------------------- */

  /** @inheritdoc */
  _getSubmitData(updateData={}) {

    // Create the expanded update data object
    const fd = new FormDataExtended(this.form, {editors: this.editors});
    let data = fd.toObject();
    if ( updateData ) data = mergeObject(data, updateData);
    else data = expandObject(data);

    // Handle Damage array
    const damage = data.data?.damage;
    if ( damage ) damage.parts = Object.values(damage?.parts || {}).map(d => [d[0] || "", d[1] || ""]);

    // Return the flattened submission data
    return flattenObject(data);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    if ( this.isEditable ) {
      html.find(".damage-control").click(this._onDamageControl.bind(this));
      html.find('.trait-configuration').click(this._onConfigureTraits.bind(this));
      html.find('.trait-selector').click(this._onSelectTraits.bind(this));
      html.find(".effect-control").click(ev => {
        if ( this.item.isOwned ) return ui.notifications.warn("Managing Active Effects within an Owned Item is not currently supported and will be added in a subsequent update.")
        ActiveEffect5e.onManageActiveEffect(ev, this.item)
      });
    }
  }

  /* -------------------------------------------- */

  /**
   * Add or remove a damage part from the damage formula
   * @param {Event} event     The original click event
   * @return {Promise}
   * @private
   */
  async _onDamageControl(event) {
    event.preventDefault();
    const a = event.currentTarget;

    // Add new damage component
    if ( a.classList.contains("add-damage") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const damage = this.item.data.data.damage;
      return this.item.update({"data.damage.parts": damage.parts.concat([["", ""]])});
    }

    // Remove a damage component
    if ( a.classList.contains("delete-damage") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const li = a.closest(".damage-part");
      const damage = foundry.utils.deepClone(this.item.data.data.damage);
      damage.parts.splice(Number(li.dataset.damagePart), 1);
      return this.item.update({"data.damage.parts": damage.parts});
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle spawning the TraitSelector application for selection various options.
   * @param {Event} event   The click event which originated the selection
   * @private
   */
  _onSelectTraits(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const options = {
      name: a.dataset.target,
      title: a.parentElement.innerText,
      choices: [],
      allowCustom: false
    };
    switch(a.dataset.options) {
      case "saves":
        options.choices = CONFIG.DND5E.abilities;
        options.valueKey = null;
        break;
      case "skills.choices":
        options.choices = CONFIG.DND5E.skills;
        options.valueKey = null;
        break;
      case "skills":
        const skills = this.item.data.data.skills;
        const choiceSet = skills.choices?.length ? skills.choices : Object.keys(CONFIG.DND5E.skills);
        options.choices = Object.fromEntries(Object.entries(CONFIG.DND5E.skills).filter(([skill,]) => choiceSet.includes(skill)));
        options.maximum = skills.number;
        break;
    }
    new TraitSelector(this.item, options).render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle spawning the TraitConfiguration application for configuring which traits
   * can be chosen by the player.
   * @param {Event} event  The click event which originated the configuration.
   * @private
   */
  _onConfigureTraits(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const options = {
      name: a.dataset.target,
      title: a.parentElement.innerText,
      type: a.dataset.type
    };
    new TraitConfiguration(this.item, options).render(true);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onSubmit(...args) {
    if ( this._tabs[0].active === "details" ) this.position.height = "auto";
    await super._onSubmit(...args);
  }
}
