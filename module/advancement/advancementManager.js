/**
 * Application for controlling the advancement workflow and displaying the interface.
 *
 * @property {Actor5e} actor                 Actor up which this advancement is being performed.
 * @property {AdvancementStep[]} [steps=[]]  Any initial steps that should be displayed.
 * @property {object} [options={}]           Additional application options.
 * @extends FormApplication
 */
export class AdvancementManager extends FormApplication {

  constructor(actor, steps=[], options={}) {
    super(actor, options);

    /**
     * A clone of the original actor to which the changes can be applied during the advancement process.
     * @type {Actor5e}
     */
    this.clone = actor.clone();

    /**
     * Individual steps that will be applied in order.
     * @type {AdvancementStep}
     */
    this.steps = steps;

    /**
     * Step being currently displayed.
     * @type {number|null}
     * @private
     */
    this._stepIndex = steps.length ? 0 : null;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "advancement", "flow"],
      template: "systems/dnd5e/templates/advancement/advancement-manager.html",
      width: 460,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return this.step?.title ?? game.i18n.localize("DND5E.AdvancementManagerTitle");
  }

  /* -------------------------------------------- */

  /**
   * Actor upon which this advancement is being performed.
   * @type {Actor5e}
   */
  get actor() {
    return this.object;
  }

  /* -------------------------------------------- */

  /**
   * Get the step that is currently in progress.
   * @type {AdvancementStep|null}
   */
  get step() {
    if ( this._stepIndex === null ) return null;
    return this.steps[this._stepIndex];
  }

  /* -------------------------------------------- */

  /**
   * Get the step before the current one.
   * @type {AdvancementStep|null}
   */
  get previousStep() {
    if ( this._stepIndex === null ) return null;
    return this.steps[this._stepIndex - 1];
  }

  /* -------------------------------------------- */

  /**
   * Get the step after the current one.
   * @type {AdvancementStep|null}
   */
  get nextStep() {
    if ( this._stepIndex === null ) return null;
    return this.steps[this._stepIndex + 1];
  }

  /* -------------------------------------------- */
  /*  Advancement Actions                         */
  /* -------------------------------------------- */

  /**
   * Represents data about a change is character and class level for an actor.
   *
   * @typedef {object} LevelChangeData
   * @property {Item5e|null} item  Class item that was added or changed.
   * @property {{ initial: number, final: number }} character  Overall character level changes.
   * @property {{ initial: number, final: number }} class      Changes to the class's level.
   */

  /**
   * Add a step to this advancement process when a class is added or level is changed.
   * @param {LevelChangeData} data  Information on the class and level changes.
   */
  levelChanged(data) {
    let levelDelta = data.character.final - data.character.initial;
    let offset = 1;

    // Level increased
    if ( levelDelta > 0 ) {
      while ( levelDelta > 0 ) {
        this._addStep(new game.dnd5e.advancement.steps.LevelIncreasedStep(this.actor, {
          item: data.item,
          level: data.character.initial + offset,
          classLevel: data.class.initial + offset
        }));
        offset += 1;
        levelDelta -= 1;
      }
    }

    // Level decreased
    else if ( levelDelta < 0 ) {
      this.actor._advancement = null;
      console.warn("Unapplying advancements from leveling not currently supported");
    }

    // Level didn't change
    else {
      throw new Error("Level did not change within level change advancement.");
    }
  }

  /* -------------------------------------------- */

  /**
   * Add a step to this advancement process when a non-class item is added.
   * @param {Item5e} item    Item that was added.
   */
  itemAdded(item) {
    this.actor._advancement = null;
    console.warn("Advancements on non-class items not currently supported");
  }

  /* -------------------------------------------- */

  /**
   * Add a step to this advancement process when a non-class item is removed.
   * @param {Item5e} item    Item that was removed.
   */
  itemRemoved(item) {
    this.actor._advancement = null;
    console.warn("Advancements on non-class items not currently supported");
  }

  /* -------------------------------------------- */

  /**
   * Modify the choices made on an item at the specified level.
   * @param {Item5e} item   Item to modify.
   * @param {number} level  Level at which the changes should be made.
   */
  modifyChoices(item, level) {
    this._addStep(new game.dnd5e.advancement.steps.ModifyChoicesStep(this.actor, { item, level }));
  }

  /* -------------------------------------------- */

  /**
   * Add an advancement step and re-render the app using debounce.
   * @param {AdvancementStep} step  Step to add.
   * @private
   */
  _addStep(step) {
    const newIndex = this.steps.push(step) - 1;
    if ( this._stepIndex === null ) this._stepIndex = newIndex;
    this.render(true);
    // TODO: Re-render using a debounce to avoid multiple renders if several steps are added in a row.
  }

  /* -------------------------------------------- */
  /*  Form Rendering                              */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    const data = {};
    if ( this.previousStep ) data.previousStep = true;

    // TODO: If step is empty or doesn't want to be rendered, move to next step automatically
    if ( !this.step ) return data;
    await this.step.getData(data);

    return data;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find("button[name='previous']")?.click(this.reverseStep.bind(this));
    html.find("button[name='next']").click(this.advanceStep.bind(this));
    this.step?.activateListeners(html);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async close(options={}) {
    if ( !options.skipConfirmation ) {
      // TODO: Add confirmation dialog informing players that no changes have been made
    }
    this.actor._advancement = null;
    await super.close(options);
  }

  /* -------------------------------------------- */
  /*  Process                                     */
  /* -------------------------------------------- */

  /**
   * Advance to the next step in the workflow.
   * @returns {Promise}
   */
  async advanceStep() {
    // TODO: Add protection from double submission, maybe just use FormApplication#_onSubmit

    // Clear visible errors
    this.form.querySelectorAll(".error").forEach(f => f.classList.remove("error"));

    // Prepare changes from current step
    const formData = this._getSubmitData();
    try {
      this.step.prepareUpdates({ actor: this.clone, data: foundry.utils.expandObject(formData) });
    } catch(error) {
      ui.notifications.error(error);
      return;
    }

    // Apply changes to actor clone
    await this.applyUpdates(this.clone, this.step.actorUpdates, this.step.itemUpdates);
    // TODO: Update clone actor advancement choices and ensure advancement flows have access to that data

    // Check to see if this is the final step, if so, head over to complete
    if ( !this.nextStep ) return this.complete();

    // Increase step number and re-render
    this._stepIndex += 1;
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Return to a previous step in the workflow.
   * @returns {Promise}
   */
  async reverseStep() {
    if ( !this.previousStep ) return;

    // Prepare updates that need to be removed
    this.previousStep.prepareUpdates({ actor: this.clone, reverse: true });

    // Revert actor clone to earlier state
    await this.applyUpdates(this.clone, this.previousStep.actorUpdates, this.previousStep.itemUpdates);
    // TODO: Revert changes to clone's advancement choices

    // Decrease step number and re-render
    this._stepIndex -= 1;
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Apply changes to actual actor after all choices have been made.
   * @returns {Promise}
   */
  async complete() {
    // Apply changes from each step to actual actor
    const { actorUpdates, itemUpdates } = this.collectUpdates(this.steps);
    const itemsAdded = await this.applyUpdates(this.actor, actorUpdates, itemUpdates);

    // Update advancement values to reflect player choices
    const flows = this.steps.flatMap(s => Object.values(s.flows).flatMap(f => Object.values(f)));
    await this.updateAdvancementData(this.actor, flows, itemsAdded);

    // Close manager & remove from actor
    await this.close({ skipConfirmation: true });
  }

  /* -------------------------------------------- */

  /**
   * Gather actor and item updates for the provided steps and merge in order.
   * @param {AdvancementStep[]} steps                          Steps to merge.
   * @returns {{ actorUpdates: object, itemUpdates: object }}  Updates.
   */
  collectUpdates(steps) {
    const actorUpdates = {};
    const itemUpdates = { add: new Set(), remove: new Set() };
    for ( const step of steps ) {
      foundry.utils.mergeObject(actorUpdates, step.actorUpdates);
      for ( const uuid of step.itemUpdates.add ) {
        if ( itemUpdates.remove.has(uuid) ) itemUpdates.remove.delete(uuid);
        else itemUpdates.add.add(uuid);
      }
      for ( const uuid of step.itemUpdates.remove ) {
        if ( itemUpdates.add.has(uuid) ) itemUpdates.add.delete(uuid);
        else itemUpdates.remove.add(uuid);
      }
    }
    itemUpdates.add = Array.from(itemUpdates.add);
    itemUpdates.remove = Array.from(itemUpdates.remove);
    return { actorUpdates, itemUpdates };
  }

  /* -------------------------------------------- */

  /**
   * Apply stored updates to an actor, modifying properties and adding or removing items.
   * @param {Actor5e} actor        Actor upon which to perform the updates.
   * @param {object} actorUpdates  Updates that will be applied to the actor's properties.
   * @param {object} itemUpdates   Items that will be added or removed from the actor.
   * @returns {Promise<Item5e[]>}  New items that have been created.
   */
  async applyUpdates(actor, actorUpdates, itemUpdates) {
    // Begin fetching data for new items
    let newItems = Promise.all(itemUpdates.add.map(fromUuid));

    // Apply property changes to actor
    await this.constructor._updateActor(actor, foundry.utils.deepClone(actorUpdates));

    // Add new items to actor
    newItems = (await newItems).map(item => {
      const data = item.toObject();
      foundry.utils.mergeObject(data, {
        "flags.dnd5e.sourceId": item.uuid
        // TODO: Store ID of originating item and advancement for later reference
        // "flags.dnd5e.advancementOrigin": `${originalItem.id}.${advancement.id}`
      });
      return data;
    });
    const itemsAdded = await this.constructor._createEmbeddedItems(actor, newItems);

    // Remove items from actor
    await this.constructor._deleteEmbeddedItems(actor, itemUpdates.remove.filter(id => actor.items.has(id)));

    return itemsAdded;
  }

  /* -------------------------------------------- */

  /**
   * Update stored advancement data for the provided flows.
   * @param {Actor5e} actor            Actor's whose advancements should be updated.
   * @param {AdvancementFlow[]} flows  Flows to update.
   * @param {Item5e[]} itemsAdded      New items that have been created.
   * @returns {Promise<Item5e[]>}      Items that have had their advancement data updated.
   */
  async updateAdvancementData(actor, flows, itemsAdded) {
    let embeddedUpdates = {};
    for ( const flow of flows ) {
      const update = flow.finalizeUpdate(flow.initialUpdate, itemsAdded);
      if ( foundry.utils.isObjectEmpty(update) ) continue;
      const itemId = flow.advancement.parent.id;
      if ( !embeddedUpdates[itemId] ) {
        embeddedUpdates[itemId] = foundry.utils.deepClone(actor.items.get(itemId).data.data.advancement);
      }
      const idx = embeddedUpdates[itemId].findIndex(a => a._id === flow.advancement.id);
      if ( idx === -1 ) continue;
      foundry.utils.mergeObject(embeddedUpdates[itemId][idx], { value: update });
    }

    // Update all advancements with new values
    embeddedUpdates = Object.entries(embeddedUpdates).map(([id, updates]) => {
      return { _id: id, "data.advancement": updates };
    });
    console.log(embeddedUpdates);
    return await this.constructor._updateEmbeddedItems(actor, embeddedUpdates);
  }

  /* -------------------------------------------- */

  /**
   * Check whether the actor is a normal actor or a clone and apply the updates appropriately.
   * @param {Actor5e} actor                          Actor to which to apply updates.
   * @param {object} updates                         Object of updates to apply.
   * @param {DocumentModificationContext} [context]  Additional context which customizes the update workflow.
   * @returns {Promise<Actor5e>}                     Actor with updates applied.
   * @protected
   */
  static async _updateActor(actor, updates, context) {
    // Normal actor, apply updates as normal
    if ( actor.data._id ) return actor.update(updates, context);

    // Actor clone, apply updates directly to ActorData
    actor.data.update(updates);
    actor.prepareData();

    return actor;
  }

  /* -------------------------------------------- */

  /**
   * Check whether the actor is a normal actor or a clone and create embedded items appropriately.
   * @param {Actor5e} actor                          Actor to which to create items.
   * @param {object[]} items                         An array of data objects used to create multiple documents.
   * @param {DocumentModificationContext} [context]  Additional context which customizes the creation workflow.
   * @returns {Promise<Item5e[]>}                    An array of created Item instances.
   * @protected
   */
  static async _createEmbeddedItems(actor, items, context) {
    if ( actor.id ) return actor.createEmbeddedDocuments("Item", items, context);

    // Create temporary documents
    const documents = await Promise.all(items.map(i => {
      return CONFIG.Item.documentClass.create(i, { parent: actor, temporary: true });
    }));
    actor.prepareData();

    // TODO: Trigger any additional advancement steps for added items

    return documents;
  }

  /* -------------------------------------------- */

  /**
   * Check whether the actor is a normal actor or a clone and update embedded items appropriately.
   * @param {Actor5e} actor                          Actor to which to update items.
   * @param {object[]} updates                       An array of differential data objects.
   * @param {DocumentModificationContext} [context]  Additional context which customizes the update workflow.
   * @returns {Promise<Item5e[]>}                    An array of updated Item instances.
   * @protected
   */
  static async _updateEmbeddedItems(actor, updates, context) {
    if ( actor.id ) return actor.updateEmbeddedDocuments("Item", updates, context);

    actor.data.update({"items": updates});
    actor.prepareData();

    const ids = new Set(updates.map(u => u._id));
    return actor.items.filter(i => ids.has(i.id));
  }

  /* -------------------------------------------- */

  /**
   * Check whether the actor is a normal actor or a clone and delete embedded items appropriately.
   * @param {Actor5e} actor                          Actor to which to delete items.
   * @param {object[]} ids                           An array of string ids for each Document to be deleted.
   * @param {DocumentModificationContext} [context]  Additional context which customizes the deletion workflow.
   * @returns {Promise<Item5e[]>}                    An array of deleted Item instances.
   * @protected
   */
  static async _deleteEmbeddedItems(actor, ids, context) {
    if ( actor.id ) return actor.deleteEmbeddedDocuments("Item", ids, context);

    let documents = [];
    for ( const id of ids ) {
      const item = actor.items.get(id);
      if ( !item ) continue;
      documents.push(item);
      actor.items.delete(id);
    }
    actor.prepareData();

    return documents;
  }

}
