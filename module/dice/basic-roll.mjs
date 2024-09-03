import RollConfigurationDialog from "../applications/dice/roll-configuration-dialog.mjs";

const { DiceTerm, NumericTerm } = foundry.dice.terms;

/**
 * Configuration data for the process of creating one or more basic rolls.
 *
 * @typedef {object} BasicRollProcessConfiguration
 * @property {BasicRollConfiguration[]} rolls  Configuration data for individual rolls.
 * @property {Event} [event]                   Event that triggered the rolls.
 * @property {Document} [origin]               Document that initiated this roll.
 */

/**
 * Configuration data for an individual roll.
 *
 * @typedef {object} BasicRollConfiguration
 * @property {string[]} [parts=[]]         Parts used to construct the roll formula.
 * @property {object} [data={}]            Data used to resolve placeholders in the formula.
 * @property {boolean} [situational=true]  Whether the situational bonus can be added to this roll in the prompt.
 * @property {BasicRollOptions} [options]  Additional options passed through to the created roll.
 */

/**
 * Options allowed on a basic roll.
 *
 * @typedef {object} BasicRollOptions
 * @property {number} [target]  The total roll result that must be met for the roll to be considered a success.
 */

/* -------------------------------------------- */

/**
 * Configuration data for the roll prompt.
 *
 * @typedef {object} BasicRollDialogConfiguration
 * @property {boolean} [configure=true]  Display a configuration dialog for the rolling process.
 * @property {typeof RollConfigurationDialog} [applicationClass]  Alternate configuration application to use.
 * @property {BasicRollConfigurationDialogOptions} [options]      Additional options passed to the dialog.
 */

/* -------------------------------------------- */

/**
 * Configuration data for creating a roll message.
 *
 * @typedef {object} BasicRollMessageConfiguration
 * @property {boolean} [create=true]  Create a message when the rolling is complete.
 * @property {string} [rollMode]      The roll mode to apply to this message from `CONFIG.Dice.rollModes`.
 * @property {object} [data={}]       Additional data used when creating the message.
 */

/* -------------------------------------------- */

/**
 * Custom base roll type with methods for building rolls, presenting prompts, and creating messages.
 */
export default class BasicRoll extends Roll {

  /**
   * Default application used for the roll configuration prompt.
   * @type {typeof RollConfigurationDialog}
   */
  static DefaultConfigurationDialog = RollConfigurationDialog;

  /* -------------------------------------------- */
  /*  Static Construction                         */
  /* -------------------------------------------- */

  /**
   * Create a roll instance from a roll config.
   * @param {BasicRollConfiguration} config  Configuration info for the roll.
   * @returns {BasicRoll}
   */
  static fromConfig(config) {
    const formula = (config.parts ?? []).join(" + ");
    return new this(formula, config.data, config.options);
  }

  /* -------------------------------------------- */

  /**
   * Construct and perform a roll through the standard workflow.
   * @param {BasicRollProcessConfiguration} [config={}]   Configuration for the rolls.
   * @param {BasicRollDialogConfiguration} [dialog={}]    Configuration for roll prompt.
   * @param {BasicRollMessageConfiguration} [message={}]  Configuration for message creation.
   * @returns {BasicRoll[]}
   */
  static async build(config={}, dialog={}, message={}) {
    this.applyKeybindings(config, dialog, message);

    let rolls;
    if ( dialog.configure === false ) rolls = config.rolls?.map(config => this.fromConfig(config)) ?? [];
    else {
      const DialogClass = dialog.applicationClass ?? this.DefaultConfigurationDialog;
      rolls = await DialogClass.configure(config, dialog, message);
    }

    for ( const roll of rolls ) await roll.evaluate();

    if ( rolls?.length && (message.create !== false) ) {
      await this.toMessage(rolls, message.data, {
        rollMode: message.rollMode ?? rolls.reduce((mode, r) => mode ?? r.options.rollMode)
      });
    }

    return rolls;
  }

  /* -------------------------------------------- */

  /**
   * Determines whether the roll process should be fast forwarded.
   * @param {BasicRollProcessConfiguration} config   Roll configuration data.
   * @param {BasicRollDialogConfiguration} dialog    Data for the roll configuration dialog.
   * @param {BasicRollMessageConfiguration} message  Message configuration data.
   */
  static applyKeybindings(config, dialog, message) {
    dialog.configure ??= true;
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Is the result of this roll a failure? Returns `undefined` if roll isn't evaluated.
   * @type {boolean|void}
   */
  get isFailure() {
    if ( !this._evaluated ) return;
    if ( !Number.isNumeric(this.options.target) ) return false;
    return this.total < this.options.target;
  }

  /* -------------------------------------------- */

  /**
   * Is the result of this roll a success? Returns `undefined` if roll isn't evaluated.
   * @type {boolean|void}
   */
  get isSuccess() {
    if ( !this._evaluated ) return;
    if ( !Number.isNumeric(this.options.target) ) return false;
    return this.total >= this.options.target;
  }

  /* -------------------------------------------- */
  /*  Chat Messages                               */
  /* -------------------------------------------- */

  /**
   * Transform a Roll instance into a ChatMessage, displaying the roll result.
   * This function can either create the ChatMessage directly, or return the data object that will be used to create it.
   *
   * @param {BasicRoll[]} rolls              Rolls to add to the message.
   * @param {object} messageData             The data object to use when creating the message
   * @param {options} [options]              Additional options which modify the created message.
   * @param {string} [options.rollMode]      The template roll mode to use for the message from CONFIG.Dice.rollModes
   * @param {boolean} [options.create=true]  Whether to automatically create the chat message, or only return the
   *                                         prepared chatData object.
   * @returns {Promise<ChatMessage|object>}  A promise which resolves to the created ChatMessage document if create is
   *                                         true, or the Object of prepared chatData otherwise.
   */
  static async toMessage(rolls, messageData={}, { rollMode, create=true }={}) {
    for ( const roll of rolls ) {
      if ( !roll._evaluated ) await roll.evaluate({ allowInteractive: rollMode !== CONST.DICE_ROLL_MODES.BLIND });
    }

    // Prepare chat data
    messageData = foundry.utils.mergeObject({ sound: CONFIG.sounds.dice }, messageData);
    messageData.rolls = rolls;

    // Process the chat data
    const cls = getDocumentClass("ChatMessage");
    const msg = new cls(messageData);

    // Either create or return the data
    if ( create ) return cls.create(msg.toObject(), { rollMode });
    else {
      if ( rollMode ) msg.applyRollMode(rollMode);
      return msg.toObject();
    }
  }

  /* -------------------------------------------- */
  /*  Evaluate Methods                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async evaluate(options={}) {
    this.preCalculateDiceTerms(options);
    return super.evaluate(options);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  evaluateSync(options={}) {
    this.preCalculateDiceTerms(options);
    return super.evaluateSync(options);
  }

  /* -------------------------------------------- */
  /*  Maximize/Minimize Methods                   */
  /* -------------------------------------------- */

  /**
   * Replaces all dice terms that have modifiers with their maximum/minimum value.
   *
   * @param {object} [options={}]            Extra optional arguments which describe or modify the BasicRoll.
   */
  preCalculateDiceTerms(options={}) {
    if ( this._evaluated || (!options.maximize && !options.minimize) ) return;
    this.terms = this.terms.map(term => {
      if ( (term instanceof DiceTerm) && term.modifiers.length ) {
        const minimize = !options.maximize;
        const number = this.constructor.preCalculateTerm(term, { minimize });
        if ( Number.isFinite(number) ) return new NumericTerm({ number, options: term.options });
      }
      return term;
    });
  }

  /* -------------------------------------------- */

  /**
   * Gets information from passed die and calculates the maximum or minimum value that could be rolled.
   *
   * @param {DiceTerm} die                            DiceTerm to get the maximum/minimum value.
   * @param {object} [preCalculateOptions={}]         Additional options to modify preCalculate functionality.
   * @param {boolean} [preCalculateOptions.minimize=false]  Calculate the minimum value instead of the maximum.
   * @returns {number|null}                                 Maximum/Minimum value that could be rolled as an integer, or
   *                                                        null if the modifiers could not be precalculated.
   */
  static preCalculateTerm(die, { minimize=false }={}) {
    let face = minimize ? 1 : die.faces;
    let number = die.number;
    const currentModifiers = foundry.utils.deepClone(die.modifiers);
    const keep = new Set(["k", "kh", "kl"]);
    const drop = new Set(["d", "dh", "dl"]);
    const validModifiers = new Set([...keep, ...drop, "max", "min"]);
    let matchedModifier = false;

    for ( const modifier of currentModifiers ) {
      const rgx = /(m[ai][xn]|[kd][hl]?)(\d+)?/i;
      const match = modifier.match(rgx);
      if ( !match ) continue;
      if ( match[0].length < match.input.length ) currentModifiers.push(match.input.slice(match[0].length));
      let [, command, value] = match;
      command = command.toLowerCase();
      if ( !validModifiers.has(command) ) continue;

      matchedModifier = true;
      const amount = parseInt(value) || (command === "max" || command === "min" ? -1 : 1);
      if ( amount > 0 ) {
        if ( (command === "max" && minimize) || (command === "min" && !minimize) ) continue;
        else if ( (command === "max" || command === "min") ) face = Math.min(die.faces, amount);
        else if ( keep.has(command) ) number = Math.min(number, amount);
        else if ( drop.has(command) ) number = Math.max(1, number - amount);
      }
    }

    return matchedModifier ? face * number : null;
  }

  /* -------------------------------------------- */
  /*  Simplification Methods                      */
  /* -------------------------------------------- */

  /**
   * Replace number and faces of dice terms with numeric values where possible.
   */
  simplify() {
    for ( const die of this.dice ) {
      const n = die._number;
      if ( (n instanceof BasicRoll) && n.isDeterministic ) die._number = n.evaluateSync().total;
      const f = die._faces;
      if ( (f instanceof BasicRoll) && f.isDeterministic ) die._faces = f.evaluateSync().total;

      // Preserve flavor.
      if ( f.terms?.[0]?.flavor ) die.options.flavor = f.terms[0].flavor;
    }

    this.resetFormula();
  }
}
