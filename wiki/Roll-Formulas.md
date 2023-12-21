![Up to date as of 2.3](https://img.shields.io/static/v1?label=dnd5e&message=2.3&color=informational)
> <details><summary>To explore the data model within Foundry to find the properties detailed below, here are a few approaches:</summary>
>
> • Select a token, then open up the dev tools (F12 on Win; ⌥⌘I on Mac), and paste this into the Console (or save it as a Script macro in your hotbar):
`console.log(canvas.tokens.controlled[0].actor.getRollData());`
>
> • Or: Install the "Autocomplete Inline Properties" module, to be able to just start typing in a supported field and have the available properties pop up (not all systems supported yet).
>
> • Or: Right-click an actor in the sidebar and choose Export Data, which will get you a JSON file you can browse through. (This won’t contain any values that are derived at roll-time.)
></details>

## Actor Properties

### Abilities

`@abilities.str` - Strength

`@abilities.dex` - Dexterity

`@abilities.con` - Constitution

`@abilities.int` - Intelligence

`@abilities.wis` - Wisdom

`@abilities.cha` - Charisma

***Note:** Replace the `*` in the following formulas with the three-letter code from above.*

`@abilities.*.value` - Ability score

`@abilities.*.mod` - Base ability modifier

`@abilities.*.dc` - Feature DC based on this ability, equals `8 + modifier`

`@abilities.*.bonuses.check` - Formula for ability-specific check bonuses (applies to generic ability checks and saves that use this ability)

`@abilities.*.checkBonus` - Flat ability check bonus, combining ability-specific bonuses with global check bonuses

`@abilities.*.checkProf` - Ability check [proficiency](Roll-Formulas#proficiency) details

`@abilities.*.save` - Flat ability save modifier (without any dice bonuses)

`@abilities.*.bonuses.save` - Formula for ability-specific saving throw bonuses

`@abilities.*.saveBonus` - Flat ability save bonus, combining ability-specific bonuses with global save bonuses

`@abilities.*.saveProf` - Ability save [proficiency](Roll-Formulas#proficiency) details


### Attributes

#### Armor Class

`@attributes.ac.calc` - Calculation mode that its used for determining `attributes.ac.base`

`@attributes.ac.formula` - Custom formula that will be used to determine `attributes.ac.base` if `calc` is set to `custom`

`@attributes.ac.flat` - Value that will be used as final `value` if `flat` calculation is set, or as `base` with `natural` calculation

`@attributes.ac.armor` - Base value of equipped armor or `10` if no armor is worn

`@attributes.ac.dex` - Actor's dexterity modifier capped by any max dexterity allowed by equipped armor

`@attributes.ac.base` - Base AC, result of the selected AC formula

`@attributes.ac.shield` - AC bonus provided by an equipped shield

`@attributes.ac.bonus` - Additional bonuses to AC provided by spells or magic items

`@attributes.ac.cover` - Any cover effects for the actor, must be set by active effects or modules

`@attributes.ac.value` - Final AC value, result of adding `ac.base + ac.shield + ac.bonus + ac.cover`


#### Attunement

`@attributes.attunement.value` - Number of currently attuned items

`@attributes.attunement.max` - Maximum number of attunement slots

#### Death Saves

`@attributes.death.success` & `.failure` - Death save successes & failures

#### Encumbrance


#### Hit Points

`@attributes.hp.min` & `.max` - Minimum & maximum hit points (not including any changes from temporary max)

`@attributes.hp.value` - Current hit points (not including temp)

`@attributes.hp.temp` - Temporary hit points

`@attributes.hp.tempmax` - Temporary changes to max hit points

#### Initiative

`@attributes.init.mod` - Actor's base initiative modifier

`@attributes.init.prof` - Initiative [proficiency](Roll-Formulas#proficiency) details

`@attributes.init.bonus` - Any extra arbitrary bonus (active effects or the initiative config window)

`@attributes.init.total` - Final initiative modifier

#### Movement

`@attributes.movement.burrow` - 

`@attributes.movement.climb` - 

`@attributes.movement.fly` - 

`@attributes.movement.swim` - 

`@attributes.movement.walk` - 

`@attributes.movement.units` - 

`@attributes.movement.hover` - 


#### Senses

`@attributes.senses.blindsight` - 

`@attributes.senses.darkvision` - 

`@attributes.senses.tremorsense` - 

`@attributes.senses.truesight` - 

`@attributes.senses.units` - 

`@attributes.senses.special` - 


#### Other Attributes

`@attributes.exhaustion` - Current exhaustion level

`@attributes.hd` - Currently available hit dice

`@attributes.inspiration` - Whether the actor has inspiration

`@attributes.prof` - Base, numerical proficiency value (does not reflect options like Proficiency Dice)

`@attributes.spellcasting` - Spellcasting ability (three-letter code, not the modifier)

`@attributes.spelldc` - Spell save DC based on the selected spellcasting ability

`@attributes.spellmod` - Base ability modifier for the actor's selected spellcasting ability

### Bonuses

#### Ability

`@bonuses.abilities.check` - Global ability check bonuses (added to base ability checks and skills checks)

`@bonuses.abilities.save` - Global ability save bonuses

`@bonuses.abilities.skill` - Global skill check bonuses

#### Attacks

`@bonuses.msak` - Melee spell attack

`@bonuses.mwak` - Melee weapon attack

`@bonuses.rsak` - Ranged spell attack

`@bonuses.rwak` - Ranged weapon attack

***Note:** Replace the `*` in the following formulas with the four-letter code from above.*

`@bonuses.*.attack` - Global bonus to attack rolls

`@bonuses.*.damage` - Global bonus to damage rolls

#### Spell

`@bonuses.spell.dc` - Global bonus to spell save DC


### Classes

***Note:** Replace the `*` in the following formulas with `identifier` specified on the class item.*

`@classes.*.levels` - 

`@classes.*.hitDice` - 

`@classes.*.hitDiceUsed` - 

`@classes.*.isOriginalClass` - 

`@classes.*.spellcasting.progression` - 

`@classes.*.spellcasting.ability` - 


### Currency

`@currency.pp`, `.gp`, `.sp`, `.ep`, `.cp` - Amount of each type of current held by actor


### Details

`@details.level` - Overall character level

`@details.xp.value` - Actor's total XP earned

`@details.xp.min` & `.max` - XP range for the actor's current level

`@details.xp.pct` - Progress towards the next level


### Proficiency

`@prof` - Actor proficiency

`@prof.term` - Either flat proficiency value or dice, depending on whether `"Proficiency Dice"` settings is set in system settings

`@prof.flat` - Flat proficiency value, regardless of settings

`@prof.dice` - Dice-based proficiency value, regardless of settings


### Resources

`@resources.primary`, `.secondary`, `.tertiary` - Three resource slots

***Note:** Replace the `*` in the following formulas with one of the slots above.*

`@resources.*.value` - 

`@resources.*.max` - 

`@resources.*.sr` - 

`@resources.*.lr` - 

`@resources.*.label` - 


### Scale

> <details>
> <summary> Scale Value Identifiers</summary>
> 
> [Scale Value Advancements](Advancement-Type-Scale-Value.md) can be added to Class, Subclass, Race, and Background item types, which will define how the identifiers used are generated.  
> The identifiers used will follow this general format: `@scale.parent-item-identifier.scale-value-identifier` where the `parent-item-identifier` is defined in the item the advancement is added to, and the `scale-value-identifier` is defined within the Advancement itself.  
>> Examples from the SRD:  
>> Race item - Dragonborn's Breath Weapon: `@scale.dragonborn.breath-weapon`  
>> Class item - Rogue's Sneak Attack: `@scale.rogue.sneak-attack`  
>> Subclass item - Life Domain's Divine Strike: `@scale.life-domain.divine-strike`  
> 
> Scale Values that are a Scale Type of Dice have additional formulas that can be used to reference specific parts of the die expression, as detailed below.  
>
> </details>

***Note:** Replace the `*` in the following formulas with the identifier of the Parent Item the advancement was created on.*

***Note:** Replace the `**` in the following formulas with the identifier defined within the Advancement itself.*

`@scale.*.**` - The value of the Scale Value referenced

`@scale.*.**.number` - *Scale Value Type: Dice Only* - The number of Dice defined in the Scale Value (e.g. `3` of `3d8`)

`@scale.*.**.die` - *Scale Value Type: Dice Only* - The Die defined in the Scale Value (e.g. `d8` of `3d8`)

`@scale.*.**.faces` - *Scale Value Type: Dice Only* - The number of faces on the Die defined in the Scale Value (e.g. `8` of `3d8`)


### Skills

`@skills.acr` - Acrobatics

`@skills.ani` - Animal Handling

`@skills.arc` - Arcana

`@skills.ath` - Athletics

`@skills.dec` - Deception

`@skills.his` - History

`@skills.ins` - Insight

`@skills.itm` - Intimidation

`@skills.inv` - Investigation

`@skills.med` - Medicine

`@skills.nat` - Nature

`@skills.prc` - Perception

`@skills.prf` - Performance

`@skills.per` - Persuasion

`@skills.rel` - Religion

`@skills.stl` - Slight of Hand

`@skills.ste` - Stealth

`@skills.sur` - Survival

***Note:** Replace the `*` in the following formulas with the three-letter code from above.*

`@skills.*.ability` - Three letter code for the ability associated with this skill by default

`@skills.*.mod` - Ability modifier from the default ability

`@skills.*.prof` - Skill [proficiency](Roll-Formulas#proficiency) details

`@skills.*.bonuses.check` - Bonus formula for this skill's modifier

`@skills.*.bonus` - Flat skill check bonus, combining skill-specific bonus, ability check bonus, and global skill bonus

`@skills.*.total` - Total skill check modifier (without any dice bonuses)

`@skills.*.bonuses.passive` - Bonus formula for this skill's passive score (cannot contain dice)

`@skills.*.passive` - Passive skill value equalling `10 + total + bonuses.passive`


### Spells

`@spells.spell1`, `.spell2`, `.spell3`, etc. - Normal spell slot levels

`@spells.pact` - Pact slots

***Note:** Replace the `*` in the following formulas with one of the spell slots above.*

`@spells.*.value` - The currently available slots at this level

`@spells.*.max` - Maximum number of slots at this level

`@spells.*.override` - This value overrides the calculated `max` slots

`@spells.*.level` - Spell slot level (for pact slots only)


### Traits

`@traits.size` - Actor size
