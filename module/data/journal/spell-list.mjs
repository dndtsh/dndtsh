import { IdentifierField } from "../fields.mjs";

export default class SpellListJournalPageData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      type: new foundry.data.fields.StringField({
        initial: "class", choices: CONFIG.DND5E.spellListTypes, label: "JOURNALENTRYPAGE.DND5E.SpellList.Type"
      }),
      identifier: new IdentifierField({label: "DND5E.Identifier"}),
      grouping: new foundry.data.fields.StringField({
        initial: "level", label: "JOURNALETNRYPAGE.DND5E.SpellList.GroupingLabel",
        hint: "JOURNALETNRYPAGE.DND5E.SpellList.GroupingHint"
      }),
      description: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.HTMLField({label: "DND5E.Description"})
      }),
      spells: new foundry.data.fields.SetField(new foundry.data.fields.SchemaField({
        uuid: new foundry.data.fields.StringField()
      }), {label: "DND5E.ItemTypeSpellPl"})
    };
  }
}
