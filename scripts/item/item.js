/**
 * Override and extend the basic :class:`Item` implementation
 */
class Item5e extends Item {

  /**
   * Roll the item to Chat, creating a chat card which contains follow up attack or damage roll options
   * @return {Promise}
   */
  async roll() {

    // Basic template rendering data
    const template = `public/systems/dnd5e/templates/chat/${this.data.type}-card.html`;
    const templateData = {
      actor: this.actor,
      item: this.data,
      data: this[this.data.type+"ChatData"]()
    };

    // Basic chat message data
    const chatData = {
      user: game.user._id,
      alias: this.actor.name,
    };

    // Toggle default roll mode
    let rollMode = game.settings.get("core", "rollMode");
    if ( ["gmroll", "blindroll"].includes(rollMode) ) chatData["whisper"] = ChatMessage.getWhisperIDs("GM");
    if ( rollMode === "blindroll" ) chatData["blind"] = true;

    // Render the template
    chatData["content"] = await renderTemplate(template, templateData);

    // Create the chat message
    return ChatMessage.create(chatData, {displaySheet: false});
  }

  /* -------------------------------------------- */

  equipmentChatData() {
    const data = duplicate(this.data.data);
    const properties = [
      CONFIG.armorTypes[data.armorType.value],
      data.armor.value + " AC",
      data.equipped.value ? "Equipped" : null,
      data.stealth.value ? "Stealth Disadv." : null,
    ];
    data.properties = properties.filter(p => p !== null);
    return data;
  }

  /* -------------------------------------------- */

  weaponChatData() {
    return this.data.data;
  }

  /* -------------------------------------------- */

  consumableChatData() {
    const data = duplicate(this.data.data);
    data.consumableType.str = CONFIG.consumableTypes[data.consumableType.value];
    data.properties = [data.consumableType.str, data.charges.value + "/" + data.charges.max + " Charges"];
    data.hasCharges = data.charges.value >= 0;
    return data;
  }

  /* -------------------------------------------- */

  toolChatData() {
    const data = duplicate(this.data.data);
    let abl = this.actor.data.data.abilities[data.ability.value].label,
        prof = data.proficient.value || 0;
    const properties = [abl, CONFIG.proficiencyLevels[prof]];
    data.properties = properties.filter(p => p !== null);
    return data;
  }

  /* -------------------------------------------- */

  backpackChatData() {
    return duplicate(this.data.data);
  }

  /* -------------------------------------------- */

  spellChatData() {
    const data = duplicate(this.data.data),
          ad = this.actor.data.data;

    // Spell saving throw text and DC
    data.isSave = data.spellType.value === "save";
    if ( data.ability.value ) data.save.dc = 8 + ad.abilities[data.ability.value].mod + ad.attributes.prof.value;
    else data.save.dc = ad.attributes.spelldc.value;
    data.save.str = data.save.value ? this.actor.data.data.abilities[data.save.value].label : "";

    // Spell attack labels
    data.damageLabel = data.spellType.value === "heal" ? "Healing" : "Damage";
    data.isAttack = data.spellType.value === "attack";

    // Combine properties
    const props = [
      CONFIG.spellSchools[data.school.value],
      CONFIG.spellLevels[data.level.value],
      data.components.value + " Components",
      data.target.value,
      data.time.value,
      data.duration.value,
      data.concentration.value ? "Concentration" : null,
      data.ritual.value ? "Ritual" : null
    ];
    data.properties = props.filter(p => p !== null);
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Prepare chat card data for items of the "Feat" type
   */
  featChatData() {
    const data = duplicate(this.data.data);

    // Feat button actions
    data.isSave = data.save.value !== "";
    data.save.str = data.save.value ? this.actor.data.data.abilities[data.save.value].label : "";
    data.isAttack = data.featType.value === "attack";

    // Feat properties
    const props = [
      data.requirements.value,
      data.target.value,
      data.range.value,
      data.time.value,
      data.duration.value
    ];
    data.properties = props.filter(p => p);
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Roll a Weapon Attack
   * Rely upon the Dice5e.d20Roll logic for the core implementation
   */
  rollWeaponAttack(event) {
    if ( this.type !== "weapon" ) throw "Wrong item type!";

    // Prepare roll data
    let itemData = this.data.data,
        rollData = duplicate(this.actor.data.data),
        abl = itemData.ability.value || "str",
        parts = ["@item.bonus.value", `@abilities.${abl}.mod`, "@attributes.prof.value"],
        title = `${this.name} - Attack Roll`;
    rollData.item = itemData;
    if ( !itemData.proficient.value ) parts.pop();

    // Call the roll helper utility
    Dice5e.d20Roll({
      event: event,
      parts: parts,
      data: rollData,
      title: title,
      alias: this.actor.name,
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll Weapon Damage
   * Rely upon the Dice5e.damageRoll logic for the core implementation
   */
  rollWeaponDamage(event, alternate=false) {
    if ( this.type !== "weapon" ) throw "Wrong item type!";

    // Get data
    let itemData = this.data.data,
        rollData = duplicate(this.actor.data.data),
        abl = itemData.ability.value || "str",
        parts = [alternate ? itemData.damage2.value : itemData.damage.value, `@abilities.${abl}.mod`],
        title = `${this.name} - Damage Roll`;
    rollData.item = itemData;

    // Call the roll helper utility
    Dice5e.damageRoll({
      event: event,
      parts: parts,
      data: rollData,
      title: title,
      alias: this.actor.name,
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll Spell Damage
   * Rely upon the Dice5e.d20Roll logic for the core implementation
   */
  rollSpellAttack(event) {
    if ( this.type !== "spell" ) throw "Wrong item type!";

    // Prepare roll data
    let itemData = this.data.data,
        rollData = duplicate(this.actor.data.data),
        abl = itemData.ability.value || rollData.attributes.spellcasting.value || "int",
        parts = [`@abilities.${abl}.mod`, "@attributes.prof.value"],
        title = `${this.name} - Spell Attack Roll`;

    // Call the roll helper utility
    Dice5e.d20Roll({
      event: event,
      parts: parts,
      data: rollData,
      title: title,
      alias: this.actor.name,
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll Spell Damage
   * Rely upon the Dice5e.damageRoll logic for the core implementation
   */
  rollSpellDamage(event) {
    if ( this.type !== "spell" ) throw "Wrong item type!";

    // Get data
    let itemData = this.data.data,
        rollData = duplicate(this.actor.data.data),
        abl = itemData.ability.value || "str",
        parts = [itemData.damage.value],
        title = this.name + (itemData.spellType.value === "heal" ? " - Healing Amount" : " - Damage Roll");
    rollData["mod"] = rollData.abilities[abl].mod;
    rollData.item = itemData;

    // Call the roll helper utility
    Dice5e.damageRoll({
      event: event,
      parts: parts,
      data: rollData,
      title: title,
      alias: this.actor.name,
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Use a consumable item
   */
  rollConsumable(ev) {
    let itemData = this.data.data;

    // Submit the roll to chat
    let cv = itemData['consume'].value,
        content = `Uses ${this.name}`;
    if ( cv ) {
      new Roll(cv).toMessage({
        alias: this.actor.name,
        flavor: content
      });
    } else {
      ChatMessage.create({user: game.user._id, alias: this.actor.name, content: content})
    }

    // Deduct consumed charges from the item
    if ( itemData['autoUse'].value ) {
      let qty = itemData['quantity'],
          chg = itemData['charges'];

      // No charges are remaining
      if ( itemData['autoDestroy'] && chg.value <= 1 ) {

        // Deduct an item quantity
        if ( qty.value > 1 ) {
          this.actor.updateOwnedItem({
            id: this.data.id,
            'data.quantity.value': qty.value - 1,
            'data.charges.value': chg.max
          }, true);
        }

        // Destroy the item
        else this.actor.deleteOwnedItem(this.data.id);
      }

      // Deduct the remaining charges
      else {
        this.actor.updateOwnedItem({id: this.data.id, 'data.charges.value': Math.max(chg.value - 1, 0)}, true);
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Roll a Tool Check
   * Rely upon the Dice5e.d20Roll logic for the core implementation
   */
  rollToolCheck(event) {
    if ( this.type !== "tool" ) throw "Wrong item type!";

    // Prepare roll data
    let rollData = duplicate(this.actor.data.data),
      abl = this.data.data.ability.value || "int",
      ability = rollData.abilities[abl],
      parts = [`@abilities.${abl}.mod`, "@proficiency"],
      title = `${this.name} - Tool Check`;
    rollData["ability"] = abl;
    rollData["proficiency"] = (this.data.data.proficient.value || 0) * rollData.attributes.prof.value;

    // Call the roll helper utility
    Dice5e.d20Roll({
      event: event,
      parts: parts,
      data: rollData,
      template: "public/systems/dnd5e/templates/chat/tool-roll-dialog.html",
      title: title,
      alias: this.actor.name,
      flavor: (parts, data) => `${this.name} - ${data.abilities[data.ability].label} Check`,
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710,
      },
      onClose: (html, parts, data) => {
        abl = html.find('[name="ability"]').val();
        data.ability = abl;
        parts[1] = `@abilities.${abl}.mod`;
      }
    }).then(roll => {
      roll.toMessage({
        alias: alias,
        flavor: flavor,
        highlightSuccess: roll.parts[0].total === 20,
        highlightFailure: roll.parts[0].total === 1
      });
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll a Feat Attack
   * Rely upon the Dice5e.d20Roll logic for the core implementation
   */
  rollFeatAttack(event) {
    if ( this.type !== "feat" ) throw "Wrong item type!";

    // Prepare roll data
    let itemData = this.data.data,
        rollData = duplicate(this.actor.data.data),
        abl = itemData.ability.value || "str",
        parts = [`@abilities.${abl}.mod`, "@attributes.prof.value"],
        title = `${this.name} - Attack Roll`;
    rollData.item = itemData;

    // Call the roll helper utility
    Dice5e.d20Roll({
      event: event,
      parts: parts,
      data: rollData,
      title: title,
      alias: this.actor.name,
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll Feat Damage
   * Rely upon the Dice5e.damageRoll logic for the core implementation
   */
  rollFeatDamage(event) {
    if ( this.type !== "feat" ) throw "Wrong item type!";

    // Get data
    let itemData = this.data.data,
        rollData = duplicate(this.actor.data.data),
        abl = itemData.ability.value || "str",
        parts = [itemData.damage.value],
        title = `${this.name} - Damage Roll`;
    rollData["mod"] = rollData.abilities[abl].mod;
    rollData.item = itemData;

    // Call the roll helper utility
    Dice5e.damageRoll({
      event: event,
      parts: parts,
      data: rollData,
      title: title,
      alias: this.actor.name,
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710
      }
    });
  }

  /* -------------------------------------------- */

  static chatListeners(html) {

    // Chat card actions
    html.on('click', '.card-buttons button', ev => {
      ev.preventDefault();

      // Extract card data
      let button = $(ev.currentTarget),
          messageId = button.parents('.message').attr("data-message-id"),
          senderId = game.messages.get(messageId).user._id;

      // Confirm roll permission
      if ( !game.user.isGM && ( game.user._id !== senderId )) return;

      // Extract action data
      let action = button.attr("data-action"),
          card = button.parents('.chat-card'),
          actor = game.actors.get(card.attr('data-actor-id')),
          itemId = Number(card.attr("data-item-id"));

      // Get the item
      if ( !actor ) return;
      let itemData = actor.items.find(i => i.id === itemId);
      if ( !itemData ) return;
      let item = new Item5e(itemData, actor);

      // Weapon attack
      if ( action === "weaponAttack" ) item.rollWeaponAttack(ev);
      else if ( action === "weaponDamage" ) item.rollWeaponDamage(ev);
      else if ( action === "weaponDamage2" ) item.rollWeaponDamage(ev, true);

      // Spell actions
      else if ( action === "spellAttack" ) item.rollSpellAttack(ev);
      else if ( action === "spellDamage" ) item.rollSpellDamage(ev);

      // Feat actions
      else if ( action === "featAttack" ) item.rollFeatAttack(ev);
      else if ( action === "featDamage" ) item.rollFeatDamage(ev);

      // Consumable usage
      else if ( action === "consume" ) item.rollConsumable(ev);

      // Tool usage
      else if ( action === "toolCheck" ) item.rollToolCheck(ev);
    });
  }
}

// Assign Item5e class to CONFIG
CONFIG.Item.entityClass = Item5e;


/**
 * Hook into chat log context menu to add damage application options
 */
Hooks.on("getChatLogEntryContext", (html, options) => {

  // Condition
  let canApply = li => canvas.tokens.controlledTokens.length && li.find(".dice-roll").length;

  // Apply Damage to Token
  options["Apply Damage"] = {
    icon: '<i class="fas fa-user-minus"></i>',
    condition: canApply,
    callback: li => Actor5e.applyDamage(li, 1)
  };

  // Apply Healing to Token
  options["Apply Healing"] = {
    icon: '<i class="fas fa-user-plus"></i>',
    condition: canApply,
    callback: li => Actor5e.applyDamage(li, -1)
  };

  // Apply Double-Damage
  options["Double Damage"] = {
    icon: '<i class="fas fa-user-injured"></i>',
    condition: canApply,
    callback: li => Actor5e.applyDamage(li, 2)
  };

  // Apply Half-Damage
  options["Half Damage"] = {
    icon: '<i class="fas fa-user-shield"></i>',
    condition: canApply,
    callback: li => Actor5e.applyDamage(li, 0.5)
  }
});
