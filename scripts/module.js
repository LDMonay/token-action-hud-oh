const MODULE_ID = 'token-action-hud-oh';
const REQUIRED_CORE_MODULE_VERSION = '1.5';

Hooks.once('tokenActionHudCoreApiReady', async (coreModule) => {
    /* ACTIONS */

    const ActionHandler = class ActionHandler extends coreModule.api.ActionHandler {
        /** @override */
        async buildSystemActions (groupIds) {
            const actor = this.actor;
            if (!actor || actor.type !== 'unit') return;

            this._buildDefenses(actor);
            this._buildAttacks(actor);
            this._buildEquipment(actor);
            this._buildAbilities(actor);
            this._buildSkills(actor);
            this._buildBuffs(actor);
        }

        _buildDefenses (actor) {
            const defenseActions = [
                {
                    id: 'showDefenses',
                    name: 'Show Defenses',
                    encodedValue: ['showDefense', ''].join(this.delimiter)
                },
                {
                    id: 'profile',
                    name: 'Profile: ' + actor.system.profile.total,
                    encodedValue: ['', ''].join(this.delimiter)
                },
                {
                    id: 'defense',
                    name: 'Defense: ' + actor.system.defense.total,
                    encodedValue: ['', ''].join(this.delimiter)
                },
                {
                    id: 'save_grit',
                    name: 'Grit: ' + actor.system.saves.grit,
                    encodedValue: ['', ''].join(this.delimiter)
                },
                {
                    id: 'save_awareness',
                    name: 'Awareness: ' + actor.system.saves.awareness,
                    encodedValue: ['', ''].join(this.delimiter)
                },
                {
                    id: 'save_morale',
                    name: 'Morale: ' + actor.system.saves.morale,
                    encodedValue: ['', ''].join(this.delimiter)
                }
            ];

            const armorActions = actor.items
                .filter(item => item.type === 'armor')
                .map(item => ({
                    id: item.id,
                    name: item.name,
                    encodedValue: ['equipment', item.id].join(this.delimiter),
                    img: coreModule.api.Utils.getImage(item)
                }));

            this.addActions(defenseActions, { id: 'defenseStats', type: 'system' });
            this.addActions(armorActions, { id: 'defenseItems', type: 'system' });
        }

        _buildAttacks (actor) {
            const actions = actor.items
                .filter(item => item.type === 'weapon')
                .map(item => ({
                    id: item.id,
                    name: item.name,
                    encodedValue: ['attack', item.id].join(this.delimiter),
                    img: coreModule.api.Utils.getImage(item)
                }));
            this.addActions(actions, { id: 'attacks', type: 'system' });
        }

        _buildEquipment (actor) {
            const actions = actor.items
                .filter(item => item.type === 'equipment')
                .map(item => ({
                    id: item.id,
                    name: item.name,
                    encodedValue: ['equipment', item.id].join(this.delimiter),
                    img: coreModule.api.Utils.getImage(item)
                }));
            this.addActions(actions, { id: 'equipment', type: 'system' });
        }

        _buildAbilities (actor) {
            const actions = actor.items
                .filter(item => item.type === 'ability')
                .map(item => ({
                    id: item.id,
                    name: item.name,
                    encodedValue: ['ability', item.id].join(this.delimiter),
                    img: coreModule.api.Utils.getImage(item)
                }));
            this.addActions(actions, { id: 'abilities', type: 'system' });
        }

        _buildSkills (actor) {
            const actions = actor.items
                .filter(item => item.type === 'skill')
                .map(item => ({
                    id: item.id,
                    name: item.name,
                    encodedValue: ['skill', item.id].join(this.delimiter),
                    img: coreModule.api.Utils.getImage(item)
                }));
            this.addActions(actions, { id: 'skills', type: 'system' });
        }

        _buildBuffs (actor) {
            const actions = [...actor.effects].map(effect => {
                const effectName = effect.name ?? effect.label;
                return {
                    id: effect.id,
                    name: effect.disabled ? effectName : effectName + ' [ON]',
                    encodedValue: ['buff', effect.id].join(this.delimiter),
                    img: coreModule.api.Utils.getImage(effect),
                    cssClass: effect.disabled ? '' : 'active toggle'
                };
            });
            this.addActions(actions, { id: 'buffs', type: 'system' });
        }
    };

    /* ROLL HANDLER */

    const RollHandler = class RollHandler extends coreModule.api.RollHandler {
        /** @override */
        async handleActionClick (event, encodedValue) {
            const [actionType, actionId] = encodedValue.split(this.delimiter);
            const actor = this.actor;
            if (!actor) return;

            switch (actionType) {
                case 'attack': {
                    const item = actor.items.get(actionId);
                    item?.useWeapon(actor);
                    break;
                }
                case 'skill':
                case 'ability':
                case 'equipment': {
                    const item = actor.items.get(actionId);
                    item?.displayInChat();
                    break;
                }
                case 'showDefense':
                    actor._onDisplayDefenses();
                    break;
                case 'buff': {
                    const effect = actor.effects.get(actionId);
                    effect?.update({ disabled: !effect.disabled });
                    break;
                }
            }
        }
    };

    /* SYSTEM MANAGER */

    const SystemManager = class SystemManager extends coreModule.api.SystemManager {
        /** @override */
        getActionHandler () {
            return new ActionHandler();
        }

        /** @override */
        getAvailableRollHandlers () {
            return { core: 'Outer Heaven' };
        }

        /** @override */
        getRollHandler (rollHandlerId) {
            return new RollHandler();
        }

        /** @override */
        async registerDefaults () {
            return {
                layout: [
                    {
                        nestId: 'attacks',
                        id: 'attacks',
                        name: 'Attacks',
                        type: 'system',
                        groups: []
                    },
                    {
                        nestId: 'defenses',
                        id: 'defenses',
                        name: 'Defenses',
                        type: 'system',
                        groups: [
                            { nestId: 'defenses_stats', id: 'defenseStats', name: 'Defense Stats', type: 'system' },
                            { nestId: 'defenses_items', id: 'defenseItems', name: 'Armor', type: 'system' }
                        ]
                    },
                    {
                        nestId: 'equipment',
                        id: 'equipment',
                        name: 'Equipment',
                        type: 'system',
                        groups: []
                    },
                    {
                        nestId: 'abilities',
                        id: 'abilities',
                        name: 'Abilities',
                        type: 'system',
                        groups: []
                    },
                    {
                        nestId: 'skills',
                        id: 'skills',
                        name: 'Skills',
                        type: 'system',
                        groups: []
                    },
                    {
                        nestId: 'buffs',
                        id: 'buffs',
                        name: 'Buffs',
                        type: 'system',
                        groups: []
                    }
                ],
                groups: [
                    { id: 'attacks',      name: 'Attacks',       type: 'system' },
                    { id: 'defenseStats', name: 'Defense Stats',  type: 'system' },
                    { id: 'defenseItems', name: 'Armor',          type: 'system' },
                    { id: 'equipment',    name: 'Equipment',      type: 'system' },
                    { id: 'abilities',    name: 'Abilities',      type: 'system' },
                    { id: 'skills',       name: 'Skills',         type: 'system' },
                    { id: 'buffs',        name: 'Buffs',          type: 'system' }
                ]
            };
        }
    };

    /* STARTING POINT */

    const module = game.modules.get(MODULE_ID);
    module.api = {
        requiredCoreModuleVersion: REQUIRED_CORE_MODULE_VERSION,
        SystemManager
    };
    Hooks.call('tokenActionHudSystemReady', module);
});