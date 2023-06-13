Content that may have been modifying the old `CONFIG.DND5E.classFeatures` object in order to add feature progression for custom classes should instead configure advancements directly on those class items using the new system. Since this data is stored on the class item itself, it can be placed directly inside a compendium and requires no additional script support to plug-into the system.

### Features
To add features to a class, go to the class' 'Advancement' tab, click the '+' sign to add a new advancement, and select the 'Item Grant' advancement.

![Item Grant Advancement](https://github.com/foundryvtt/dnd5e/assets/86370342/ae9bba77-f58e-4808-a795-40233cf6cca6)

Select the level at which these features are gained, then drag-and-drop the feature items to the bottom section of the sheet.

![Adding features](https://github.com/foundryvtt/dnd5e/assets/86370342/f35c6ca1-fe4b-499d-984d-89ed56be1127)

**Note:** These items are referenced by UUID so do not use world-level items if you intend this class to be portable between worlds. If you wish to store the class in a compendium to be transferred between worlds, you should also store the features in a compendium (it can be the same one as the class item) and make sure to drag-and-drop from that compendium onto the Item Grant Advancement configuration.

Repeat this process for each level that features are gained in this class.

### Subclasses
Classes and subclasses are linked together by their identifiers. In order to create a subclass for a given class, first locate the class identifier.

![Class Identifier](https://github.com/foundryvtt/dnd5e/assets/86370342/c82fd84c-6c20-4dc3-b3e8-58396bea67f5)

Then create the new subclass item and input the parent class' identifier.

![Subclass Identifier](https://github.com/foundryvtt/dnd5e/assets/86370342/eaf86dcd-a1b4-467b-b0b1-cbdd05a412ac)
