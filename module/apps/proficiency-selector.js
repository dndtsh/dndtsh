import TraitSelector from "./trait-selector.js";

/**
 * An application for selecting proficiencies with categories that can contain children.
 *
 * @extends {TraitSelector}
 */
export default class ProficiencySelector extends TraitSelector {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Actor Proficiency Selection",
      type: "",
      sortCategories: false
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    const attr = foundry.utils.getProperty(this.object.data, this.attribute);
    const chosen = (this.options.valueKey) ? foundry.utils.getProperty(attr, this.options.valueKey) ?? [] : attr;

    const data = super.getData();
    data.choices = await ProficiencySelector.getChoices(this.options.type, chosen, this.options.sortCategories);
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Structure representing proficiency choices split into categories.
   *
   * @typedef {object} ProficiencyChoice
   * @property {string} label                    Localized label for the choice.
   * @property {boolean} chosen                  Should this choice be selected by default?
   * @property {ProficiencyChoice[]} [children]  Array of children if this is a category.
   */

  /**
   * A static helper method to get a list of choices for a proficiency type.
   *
   * @param {string} type               Proficiency type to select, either `armor`, `tool`, or `weapon`.
   * @param {string[]} [chosen]         Optional list of items to be marked as chosen.
   * @param {boolean} [sortCategories]  Should top level categories be sorted?
   * @return {Object.<string,ProficiencyChoice>}  Object mapping proficiency ids to choice objects.
   */
  static async getChoices(type, chosen, sortCategories=false) {
    let data = Object.entries(CONFIG.DND5E[`${type}Proficiencies`]).reduce((obj, [key, label]) => {
      obj[key] = { label: label, chosen: chosen?.includes(key) ?? false };
      return obj;
    }, {});

    const ids = CONFIG.DND5E[`${type}Ids`];
    const map = CONFIG.DND5E[`${type}ProficienciesMap`];
    if ( ids !== undefined ) {
      const typeProperty = (type !== "armor") ? `${type}Type` : `armor.type`;
      for ( const [key, id] of Object.entries(ids) ) {
        const item = await ProficiencySelector.getBaseItem(id);
        if ( !item ) continue;

        let type = foundry.utils.getProperty(item.data.data, typeProperty);
        if ( map && map[type] ) type = map[type];
        const entry = {
          label: item.name,
          chosen: chosen?.includes(key) ?? false
        };
        if ( data[type] === undefined ) {
          data[key] = entry;
        } else {
          if ( data[type].children === undefined ) {
            data[type].children = {};
          }
          data[type].children[key] = entry;
        }
      }
    }

    if ( type === "tool" ) {
      data["vehicle"].children = Object.entries(CONFIG.DND5E.vehicleTypes).reduce((obj, [key, label]) => {
        obj[key] = { label: label, chosen: chosen?.includes(key) ?? false };
        return obj;
      }, {});
    }

    if ( sortCategories ) data = ProficiencySelector._sortObject(data);
    for ( const category of Object.values(data) ) {
      if ( !category.children ) continue;
      category.children = ProficiencySelector._sortObject(category.children);
    }

    return data;
  }

  /* -------------------------------------------- */

  /**
   * Fetch an item for the provided ID. If the provided ID contains a compendium pack name
   * it will be fetched from that pack, otherwise it will be fetched from the compendium defined
   * in `DND5E.sourcePacks.ITEMS`.
   *
   * @param {string} identifier            Simple ID or compendium name and ID separated by a dot.
   * @param {object} [options]             
   * @param {boolean} [options.indexOnly]  If set to true, only the index data will be fetched.
   * @return {Promise<Document>|object}    Promise for a `Document` if `options.indexOnly` is false, else a simple
   *                                       object containing the minimal index data.
   */
  static getBaseItem(identifier, { indexOnly = false }={}) {
    const split = identifier.split(".");
    const pack = game.packs.get(split.length > 1 ? `${split[0]}.${split[1]}` : CONFIG.DND5E.sourcePacks.ITEMS);
    const id = split[2] ?? identifier;

    if ( indexOnly ) {
      return pack?.index.get(id);
    } else {
      return pack?.getDocument(id);
    }
  }

  /* -------------------------------------------- */

  /**
   * Take the provided object and sort by the "label" property.
   *
   * @param {object} object  Object to be sorted.
   * @return {object}        Sorted object.
   * @private
   */
  static _sortObject(object) {
    return Object.fromEntries(Object.entries(object).sort((lhs, rhs) =>
      lhs[1].label.localeCompare(rhs[1].label)
    ));
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);

    for ( const checkbox of html[0].querySelectorAll("input[type='checkbox']") ) {
      if ( checkbox.checked ) this._onToggleCategory(checkbox);
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onChangeInput(event) {
    super._onChangeInput(event);

    if ( event.target.tagName === "INPUT" ) this._onToggleCategory(event.target);
  }

  /* -------------------------------------------- */

  /**
   * Enable/disable all children when a category is checked.
   *
   * @param {HTMLElement} checkbox  Checkbox that was changed.
   * @private
   */
  _onToggleCategory(checkbox) {
    const children = checkbox.closest("li")?.querySelector("ol");
    if ( !children ) return;

    for ( const child of children.querySelectorAll("input[type='checkbox']") ) {
      child.checked = child.disabled = checkbox.checked;
    }
  }

}
