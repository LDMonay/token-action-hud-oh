// FOR LIVE
import { ActionHandler, CategoryManager, RollHandler, SystemManager, Utils } from '../../token-action-hud-core/dist/token-action-hud-core.min.js'

// For DEBUGGING
/*
import { ActionHandler   } from '../../token-action-hud-core/scripts/action-handlers/action-handler.js'
import { CategoryManager } from '../../token-action-hud-core/scripts/category-manager.js'
import { RollHandler     } from '../../token-action-hud-core/scripts/roll-handlers/roll-handler.js'
import { SystemManager   } from '../../token-action-hud-core/scripts/system-manager.js'
import { Utils           } from '../../token-action-hud-core/scripts/utilities/utils.js'
*/

const ATTACKS_ID = "ATTACK";
const DEFENSES_ID = "DEFENSE";
const EQUIPMENT_ID = "EQUIPMENT";
const ABILITIES_ID = "ABILITY"
const SKILLS_ID = "SKILL";
const BUFFS_ID = "BUFF";

const ACTION_ATTACKS = "ATTACK";
const ACTION_EQUIPMENT = "EQUIPMENT";
const ACTION_ABILITIES = "ABILITY"
const ACTION_SKILLS = "SKILL";
const ACTION_BUFF = "BUFF";

/* ACTIONS */

class MyActionHandler extends ActionHandler {
    constructor(categoryManager) {
        super(categoryManager);
    }

    /** @override */
    async buildSystemActions(character, subcategoryIds) {
        const token = character?.token;
        if (!token) return;
        const tokenId = token.id;
        const actor = character?.actor;
        if (!actor) return;
        
        if (actor.type !== 'unit') {
          return;
        }

        this._getDefense  (actor, tokenId, { id: DEFENSES_ID,    type: 'system' });
        this._getAttacks  (actor, tokenId, { id: ATTACKS_ID,    type: 'system' });
        this._getEquipment(actor, tokenId, { id: EQUIPMENT_ID, type: 'system' });
        this._getAbilities(actor, tokenId, { id: ABILITIES_ID, type: 'system' });
        this._getSkills   (actor, tokenId, { id: SKILLS_ID,    type: 'system' });
        this._getBuffs    (actor, tokenId, { id: BUFFS_ID,    type: 'system' });

        /*

        this._getTags     (actor, tokenId, { id: TAGS_ID,      type: 'system' })
        */
        //if (settings.get("showHudTitle")) result.hudTitle = token.name;
    }

    _getDefense(actor, tokenId, parent) {
        let actions = [{
            id: "showDefenses",
            name: "Show Defenses",
            encodedValue: ["SHOW_DEFENSE", actor.id, tokenId, null].join(this.delimiter),
            },
            {
                id: "profile",
                name: "Profile : " + actor.system.profile.total,
                encodedValue: ["", actor.id, tokenId, null].join(this.delimiter),
            },
            {
                id: "defense",
                name: "Defense : " + actor.system.defense.total,
                encodedValue: ["", actor.id, tokenId, null].join(this.delimiter),
            },
            {
                id: "save_grit",
                name: "Grit : " + actor.system.saves.grit,
                encodedValue: ["", actor.id, tokenId, null].join(this.delimiter),
            },
            {
                id: "save_awareness",
                name: "Awareness : " + actor.system.saves.awareness,
                encodedValue: ["", actor.id, tokenId, null].join(this.delimiter),
            },
            {
                id: "save_morale",
                name: "Morale : " + actor.system.saves.morale,
                encodedValue: ["", actor.id, tokenId, null].join(this.delimiter),
            }
        ];

        let armorItems = (actor.items.filter(item => item.type === 'armor').map( item => { return {
            id: item.id,
            name: item.name,
            encodedValue: [ACTION_EQUIPMENT, actor.id, tokenId, item.id].join(this.delimiter),
            img: Utils.getImage(item)
            }}));
        
        this.addActionsToActionList(actions, parent);
        this.addActionsToActionList(armorItems, {id: parent.id + "items", type: parent.type});
    }

    _getAttacks(actor, tokenId, parent) {
        const actions = actor.items.filter(item => item.type === 'weapon').map( item => { return {
            id: item.id,
            name: item.name,
            encodedValue: [ACTION_ATTACKS, actor.id, tokenId, item.id].join(this.delimiter),
            img: Utils.getImage(item)
            }});
            this.addActionsToActionList(actions, parent);
    }

    _getEquipment(actor, tokenId, parent) {
        const actions = actor.items.filter(item => item.type === 'equipment').map( item => { return {
        id: item.id,
        name: item.name,
        encodedValue: [ACTION_EQUIPMENT, actor.id, tokenId, item.id].join(this.delimiter),
        img: Utils.getImage(item)
        }});
        this.addActionsToActionList(actions, parent);
    }

    _getAbilities(actor, tokenId, parent) {
        const actions = actor.items.filter(item => item.type === 'ability').map( item => { return {
        id: item.id,
        name: item.name,
        encodedValue: [ACTION_ABILITIES, actor.id, tokenId, item.id].join(this.delimiter),
        img: Utils.getImage(item)
        }});
        this.addActionsToActionList(actions, parent);
    }

    _getSkills(actor, tokenId, parent) {
        const actions = actor.items.filter(item => item.type === 'skill').map( item => { return {
        id: item.id,
        name: item.name,
        encodedValue: [ACTION_SKILLS, actor.id, tokenId, item.id].join(this.delimiter),
        img: Utils.getImage(item)
        }});
        this.addActionsToActionList(actions, parent);
    }

    _getBuffs(actor, tokenId, parent) {
        const actions = actor.effects.map( item => { return {
            id: item.id,
            name: item.disabled ? item.label : item.label + " [ON]",
            encodedValue: [ACTION_BUFF, actor.id, tokenId, item.id].join(this.delimiter),
            img: Utils.getImage(item)
            }});
            this.addActionsToActionList(actions, parent);
    }
}


/* ROLL HANDLER */

class MyRollHandler extends RollHandler {

    doHandleActionEvent(event, encodedValue) {
        let payload = encodedValue.split("|");
    
        if (payload.length != 4) {
          super.throwInvalidValueErr();
        }
    
        const macroType = payload[0];
        const actorId  = payload[1];
        const tokenId  = payload[2];
        const actionId = payload[3];

        const actor = Utils.getActor(actorId, tokenId);
        let item;
        if (actionId != null && macroType != ACTION_BUFF)
        {
            item  = Utils.getItem(actor,  actionId);
        }

        switch (macroType) {
          case ACTION_ATTACKS:
            item.useWeapon(actor);
            break;
          case ACTION_SKILLS:
          case ACTION_ABILITIES:
          case ACTION_EQUIPMENT:
            item.displayInChat();
            break;
          case "SHOW_DEFENSE":
            actor._onDisplayDefenses();
            break;
          case ACTION_BUFF:
            item = actor.effects.get(actionId);
            item.update({disabled: !item.disabled});
            break;
          default:
            break;
        }
    }
}

// Core Module Imports

export class MySystemManager extends SystemManager {
    /** @override */
    doGetCategoryManager () {
        return new CategoryManager()
    }

    /** @override */
    doGetActionHandler (categoryManager) {
        return new MyActionHandler(categoryManager)
    }

    /** @override */
    getAvailableRollHandlers () {
        const choices = { core: "Outer Heaven" };
        return choices
    }

    /** @override */
    doGetRollHandler (handlerId) {
        return new MyRollHandler()
    }

    /** @override */
    /*doRegisterSettings (updateFunc) {
        systemSettings.register(updateFunc)
    }*/

    async doRegisterDefaultFlags () {
        const ATTACKS_NAME = "Attacks";
        const DEFENSES_NAME = "Defenses";
        const EQUIPMENT_NAME = "Equipment";
        const ABILITIES_NAME = "Abilities"
        const SKILLS_NAME = "Skills";
        const BUFFS_NAME = "Buffs";

        
        const DEFAULTS = {
            categories: [
                {
                    nestId: ATTACKS_ID,
                    id:     ATTACKS_ID,
                    name:   ATTACKS_NAME,
                    type:   'system',
                    subcategories: [
                        {
                            nestId: 'attacks_attacks',
                            id:     ATTACKS_ID,
                            name:   ATTACKS_NAME,
                            type:   'system'
                        }
                    ]
                },
                {
                    nestId: DEFENSES_ID,
                    id:     DEFENSES_ID,
                    name:   DEFENSES_NAME,
                    type:   'system',
                    subcategories: [
                        {
                            nestId: 'defenses_defenses',
                            id:     DEFENSES_ID,
                            name:   DEFENSES_NAME,
                            type:   'system'
                        },
                        {
                            nestId: 'defenses_items',
                            id:     DEFENSES_ID + "items",
                            name:   "Items",
                            type:   'system'
                        }
                    ]
                },
                {
                    nestId: EQUIPMENT_ID,
                    id:     EQUIPMENT_ID,
                    name:   EQUIPMENT_NAME,
                    type:   'system',
                    subcategories: [
                        {
                            nestId: 'equipment_equipment',
                            id:     EQUIPMENT_ID,
                            name:   EQUIPMENT_NAME,
                            type:   'system'
                        }
                    ]
                },
                {
                    nestId: ABILITIES_ID,
                    id:     ABILITIES_ID,
                    name:   ABILITIES_NAME,
                    type:   'system',
                    subcategories: [
                        {
                            nestId: 'abilities_abilities',
                            id:     ABILITIES_ID,
                            name:   ABILITIES_NAME,
                            type:   'system'
                        }
                    ]
                },
                {
                    nestId: SKILLS_ID,
                    id:     SKILLS_ID,
                    name:   SKILLS_NAME,
                    type:   'system',
                    subcategories: [
                        {
                            nestId: 'skills_skills',
                            id:     SKILLS_ID,
                            name:   SKILLS_NAME,
                            type:   'system'
                        }
                    ]
                },
                {
                    nestId: BUFFS_ID,
                    id:     BUFFS_ID,
                    name:   BUFFS_NAME,
                    type:   'system',
                    subcategories: [
                        {
                            nestId: 'buffs_buffs',
                            id:     BUFFS_ID,
                            name:   BUFFS_NAME,
                            type:   'system'
                        }
                    ]
                },
            ],
            subcategories: [
                { id: ATTACKS_ID, name: ATTACKS_NAME, type: 'system', hasDerivedSubcategories: false  },
                { id: DEFENSES_ID, name: DEFENSES_NAME, type: 'system', hasDerivedSubcategories: true  },
                { id: EQUIPMENT_ID,    name: EQUIPMENT_NAME,    type: 'system', hasDerivedSubcategories: false },
                { id: ABILITIES_ID,     name: ABILITIES_NAME,     type: 'system', hasDerivedSubcategories: false },
                { id: SKILLS_ID,    name: SKILLS_NAME,    type: 'system', hasDerivedSubcategories: false  },
                { id: BUFFS_ID,      name: BUFFS_NAME,      type: 'system', hasDerivedSubcategories: false  }
            ]
        }

        // HUD CORE v1.2 wants us to return the DEFAULTS
        return DEFAULTS;
    }
}

/* STARTING POINT */

Hooks.once('ready', async () => {
    const module = game.modules.get('token-action-hud-oh');
    module.api = {
        requiredCoreModuleVersion: '1.4',
        SystemManager: MySystemManager
    }    
    Hooks.call('tokenActionHudSystemReady', module)
});