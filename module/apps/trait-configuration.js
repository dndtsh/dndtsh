import ProficiencySelector from "./proficiency-selector.js";


/**
 * Configuration for a specific trait grant.
 *
 * @typedef {object} TraitGrant
 * @property {number} count        How many traits can be selected.
 * @property {string[]} [choices]  List of trait or category keys that can be chosen. If no choices
 *                                 are provided, any trait of the specified type can be selected.
 */


/**
 * A form used to configure player choices for skill, tool, language, and other proficiencies
 * on Background and Class items.
 * @extends {DocumentSheet}
 */
export default class TraitConfiguration extends DocumentSheet {

  constructor(object={}, options={}) {
    super(object, options);

    /**
     * Internal version of the grants array.
     * @type {Array.<string|TraitGrant>}
     */
    this.grants = foundry.utils.getProperty(this.object.data, `${options.name}.grants`);

    /**
     * Index of the selected grant configuration.
     * @type {number|null}
     */
    this.selectedIndex = this.grants.length > 0 ? 0 : null;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "trait-configuration",
      classes: ["dnd5e", "trait-configuration", "subconfig"],
      title: "Trait Configuration",
      template: "systems/dnd5e/templates/apps/trait-configuration.html",
      width: 540,
      height: "auto",
      type: ""
    });
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {

    let grants = this.grants.map((grant, index) => {
      return {
        label: TraitConfiguration.grantLabel(this.options.type, grant) || "—", // TODO: Localize
        data: grant,
        selected: index === this.selectedIndex
      }
    });

    const selectedData = grants[this.selectedIndex]?.data;
    const chosen = (typeof selectedData === "string") ? [selectedData] : selectedData?.choices ?? [];
    let choices;
    if ( ["armor", "tool", "weapon"].includes(this.options.type) ) {

      /****************************************************************************/
      /*             TODO: Refactor out this code when !335 is merged             */
      /****************************************************************************/
      const type = this.options.type;
      choices = Object.entries(CONFIG.DND5E[`${type}Proficiencies`]).reduce((obj, [key, label]) => {
        obj[key] = { label: label, chosen: chosen?.includes(key) ?? false };
        return obj;
      }, {});
      const ids = CONFIG.DND5E[`${type}Ids`];
      const map = CONFIG.DND5E[`${type}ProficienciesMap`];
      if ( ids !== undefined ) {
        const typeProperty = (type !== "armor") ? `${type}Type` : `armor.type`;
        for ( const [key, id] of Object.entries(ids) ) {
          const pack = game.packs.get(CONFIG.DND5E.sourcePacks.ITEMS);
          const item = await pack.getDocument(id);
          if ( !item ) continue;
          let type = foundry.utils.getProperty(item.data.data, typeProperty);
          if ( map && map[type] ) type = map[type];
          const entry = {
            label: item.name,
            chosen: chosen?.includes(key) ?? false
          };
          if ( choices[type] === undefined ) {
            choices[key] = entry;
          } else {
            if ( choices[type].children === undefined ) {
              choices[type].children = {};
            }
            choices[type].children[key] = entry;
          }
        }
      }
      if ( type === "tool" ) {
        choices["vehicle"].children = Object.entries(CONFIG.DND5E.vehicleTypes).reduce((obj, [key, label]) => {
          obj[key] = { label: label, chosen: chosen?.includes(key) ?? false };
          return obj;
        }, {});
      }
      if ( type === "tool" ) choices = ProficiencySelector._sortObject(choices);
      for ( const category of Object.values(choices) ) {
        if ( !category.children ) continue;
        category.children = ProficiencySelector._sortObject(category.children);
      }
      /****************************************************************************/
      /*                                End Refactor                              */
      /****************************************************************************/


    } else {
      choices = Object.entries(CONFIG.DND5E[this.options.type] ?? {}).reduce((obj, [key, label]) => {
        obj[key] = {
          label,
          chosen: chosen.includes(key)
        };
        return obj;
      }, {});
    }

    return {
      grants,
      allowChoices: typeof grants[this.selectedIndex]?.data === "object",
      count: this.grants[this.selectedIndex]?.count ?? 1,
      choices
    }
  }

  /* -------------------------------------------- */

  /**
   * Create a human readable description of the provided grant.
   * @param {string} type             
   * @param {string|TraitGrant} data  
   */
  static grantLabel(type, data) {
    // Single trait
    if ( typeof data === "string" ) {
      return TraitConfiguration.keyLabel(type, data);
    }

    const typeLabel = TraitConfiguration.typeLabel(type).toLowerCase();
    // Select from all options
    if ( !data.choices ) {
      return `Any ${data.count} ${typeLabel}`; // TODO: Localize
    }

    const choices = data.choices.map(key => TraitConfiguration.keyLabel(type, key));
    const listFormatter = new Intl.ListFormat(game.i18n.lang, { type: "disjunction" });
    return `Choose ${data.count} from ${listFormatter.format(choices)}`; // TODO: Localize
  }

  /* -------------------------------------------- */

  /**
   * Get the localized label for a specific trait type.
   * @param {string} type  Trait type.
   * @return {string}      Localized label.
   */
  static typeLabel(type) {
    const typeCap = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();

    // TODO: Localize this correctly
    if ( ["armor", "tool", "weapon"].includes(type) ) {
      return game.i18n.localize(`DND5E.Trait${typeCap}Prof`);
    } else {
      return type;
    }
  }

  /* -------------------------------------------- */

  /**
   * Get the localized label for a specific key.
   * @param {string} type  
   * @param {string} key   
   * @return {string}
   */
  static keyLabel(type, key) {
    if ( ["armor", "tool", "weapon"].includes(type) ) {
      const categories = CONFIG.DND5E[`${type}Proficiencies`];
      if ( categories[key] ) return categories[key];

      if ( type === "tool" && CONFIG.DND5E.vehicleTypes[key] ) {
        return CONFIG.DND5E.vehicleTypes[key];
      }

      // TODO: Replace with ProficiencySelector#getBaseItem when !335 is merged
      const baseItems = CONFIG.DND5E[`${type}Ids`];
      const pack = game.packs.get(CONFIG.DND5E.sourcePacks.ITEMS);
      const item = pack.index.get(baseItems[key]);

      return item?.name ?? "";
    } else {
      const source = CONFIG.DND5E[type];
      return source[key] ?? "";
    }
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    const updateData = {};
    updateData[`${this.options.name}.grants`] = this.grants.filter(grant => grant !== "");
    return this.object.update(updateData);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);

    this.form.addEventListener("click", this._onListButtonClick.bind(this));

    if ( this.selectedIndex === null ) {
      this._disableFields(this.form);
      this.form.querySelector("button[name='add']").removeAttribute("disabled");
      return;
    }

    for ( const checkbox of html[0].querySelectorAll(".trait-selector input[type='checkbox']") ) {
      if ( checkbox.checked ) ProficiencySelector._onToggleCategory(checkbox);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle clicks to the Add and Remove buttons above the list.
   * @param {Event} event  Triggering click.
   */
  _onListButtonClick(event) {
    if ( event.target.tagName !== "BUTTON" ) return;

    switch (event.target.name) {
      case "add":
        this.grants.push("");
        this.selectedIndex = this.grants.length - 1;
        break;

      case "remove":
        if ( this.selectedIndex === null ) break;

        this.grants.splice(this.selectedIndex, 1);

        if ( this.grants.length === 0 ) this.selectedIndex = null;
        else if ( this.selectedIndex !== 0 ) this.selectedIndex -= 1;
        break;

      default:
        return;
    }

    event.preventDefault();
    this.render();
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onChangeInput(event) {
    super._onChangeInput(event);
    const t = event.target;

    if ( t.name === "selectedIndex" ) {
      this.selectedIndex = Number(t.value ?? 0);
      return this.render();
    }

    const current = this.grants[this.selectedIndex];
    if ( current === undefined ) return;

    if ( t.name === "allowChoices" ) {
      if ( t.checked ) {
        this.grants[this.selectedIndex] = { count: 1 }
        if ( current ) this.grants[this.selectedIndex].choices = [current];
      } else {
        this.grants[this.selectedIndex] = current.choices[0] ?? "";
      }
    }

    else if ( t.name === "count" ) {
      let count = Number.parseInt(t.value);
      if ( (count < 1) || Number.isNaN(count) ) count = 1;
      this.grants[this.selectedIndex].count = count;
    }

    else if ( t.closest(".trait-selector") ) {
      if ( typeof current === "string" ) {
        this.grants[this.selectedIndex] = t.checked ? t.name : "";
      } else {
        let choiceSet = new Set(current.choices ?? []);
        if ( t.checked ) choiceSet.add(t.name);
        else choiceSet.delete(t.name);
        if ( choiceSet.size > 0 ) {
          this.grants[this.selectedIndex].choices = Array.from(choiceSet);
        } else if ( current.choices ) {
          delete this.grants[this.selectedIndex].choices;
        }
      }
    }

    return this.render();
  }
}
