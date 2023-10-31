/**
 * Field for storing creature type data.
 */
export default class CreatureTypeField extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    fields = {
      value: new foundry.data.fields.StringField({blank: true, label: "DND5E.CreatureType"}),
      subtype: new foundry.data.fields.StringField({label: "DND5E.CreatureTypeSelectorSubtype"}),
      swarm: new foundry.data.fields.StringField({blank: true, label: "DND5E.CreatureSwarmSize"}),
      custom: new foundry.data.fields.StringField({label: "DND5E.CreatureTypeSelectorCustom"}),
      ...fields
    };
    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, { label: "DND5E.CreatureType", ...options });
  }
}
