const MODULE_ID = 'token-action-hud-escalation';
const REQUIRED_CORE_MODULE_VERSION = '2.1';

// Local delimiter used to encode/decode an action's type + target into its button value.
// Kept independent of any core internal so the encoding round-trips regardless of core changes.
const DELIMITER = '|';

Hooks.once('tokenActionHudCoreApiReady', async (coreModule) => {
    const getImage = (doc) => coreModule.api.Utils.getImage(doc);

    /**
     * Format a resource pool ("value/max", or just "value" when the pool is uncapped) for display.
     * @param {{value: number, max: number|null}} pool
     * @returns {string}
     */
    const formatPool = (pool) => {
        if (pool?.max === null || pool?.max === undefined) return `${pool?.value ?? 0}`;
        return `${pool?.value ?? 0}/${pool.max}`;
    };

    /* ACTIONS */

    const ActionHandler = class ActionHandler extends coreModule.api.ActionHandler {
        /** @override */
        async buildSystemActions (groupIds) {
            const actor = this.actor;
            if (!actor || actor.type !== 'unit') return;

            this._buildVitals(actor);
            this._buildStats(actor);
            this._buildResources(actor);
            this._buildAttacks(actor);
            this._buildDefenses(actor);
            this._buildEquipment(actor);
            this._buildAbilities(actor);
            this._buildSkills(actor);
            this._buildStances(actor);
            this._buildBuffs(actor);
        }

        /**
         * Health and Power are the unit's key vitals, surfaced as always-visible info badges on the
         * Stats category button itself (rather than buried in a list). Power is only shown when used.
         */
        _buildVitals (actor) {
            const system = actor.system;
            const info = {};
            if (system.health) {
                info.info1 = { text: `HP ${formatPool(system.health)}`, title: 'Health' };
            }
            const power = system.power;
            if (power && (power.isUsed || power.max > 0 || power.value > 0)) {
                info.info2 = { text: `PWR ${formatPool(power)}`, title: 'Power' };
            }
            if (info.info1 || info.info2) this.addGroupInfo({ id: 'stats', type: 'system', info });
        }

        /** Combat stats (read-only info entries). */
        _buildStats (actor) {
            const system = actor.system;
            const info = (id, name) => ({ id, name, encodedValue: ['', ''].join(DELIMITER) });
            const actions = [
                info('actions', `Actions: ${system.actions}`),
                info('minorActions', `Minor Actions: ${system.minorActions}`),
                info('aim', `Aim: ${system.aim}`),
                info('speed', `Speed: ${system.speed}`),
                info('melee', `Melee: ${system.melee}`),
                info('points', `Points: ${system.totalPoints}/${system.maxPoints}`)
            ];
            this.addActions(actions, { id: 'combatStats', type: 'system' });
        }

        /**
         * Secondary resource pools (Shield / Heat), shown only when the unit uses them. Health and Power
         * live on the Stats tab as badges (see _buildVitals) so they aren't duplicated here.
         */
        _buildResources (actor) {
            const system = actor.system;
            const pools = [
                { id: 'shield', name: 'Shield', pool: system.shield },
                { id: 'heat', name: 'Heat', pool: system.heat }
            ];
            const actions = pools
                .filter(({ pool }) => pool && (pool.isUsed || pool.max > 0 || pool.value > 0))
                .map(({ id, name, pool }) => ({
                    id,
                    name: `${name}: ${formatPool(pool)}`,
                    encodedValue: ['', ''].join(DELIMITER)
                }));
            this.addActions(actions, { id: 'resources', type: 'system' });
        }

        _buildDefenses (actor) {
            const defenseActions = [
                {
                    id: 'showDefenses',
                    name: 'Show Defenses',
                    encodedValue: ['showDefense', ''].join(DELIMITER)
                },
                {
                    id: 'profile',
                    name: 'Profile: ' + actor.system.profile.total,
                    encodedValue: ['', ''].join(DELIMITER)
                },
                {
                    id: 'defense',
                    name: 'Defense: ' + actor.system.defense.total,
                    encodedValue: ['', ''].join(DELIMITER)
                },
                {
                    id: 'save_grit',
                    name: 'Grit: ' + actor.system.saves.grit,
                    encodedValue: ['', ''].join(DELIMITER)
                },
                {
                    id: 'save_awareness',
                    name: 'Awareness: ' + actor.system.saves.awareness,
                    encodedValue: ['', ''].join(DELIMITER)
                },
                {
                    id: 'save_morale',
                    name: 'Morale: ' + actor.system.saves.morale,
                    encodedValue: ['', ''].join(DELIMITER)
                }
            ];

            const armorActions = actor.items
                .filter(item => item.type === 'armor')
                .map(item => ({
                    id: item.id,
                    name: item.name,
                    encodedValue: ['display', item.id].join(DELIMITER),
                    img: getImage(item)
                }));

            this.addActions(defenseActions, { id: 'defenseStats', type: 'system' });
            this.addActions(armorActions, { id: 'defenseItems', type: 'system' });
        }

        _buildAttacks (actor) {
            this._buildItemRows(actor, 'weapon', 'weapons');
        }

        _buildEquipment (actor) {
            this._buildItemRows(actor, 'equipment', 'equipmentList');
        }

        _buildAbilities (actor) {
            this._buildItemRows(actor, 'ability', 'abilityList');
        }

        /**
         * Give each item its own subgroup (row) under `parentId`, holding its use/reload/wield buttons.
         * A subgroup is a separate flex container, so the extra buttons never wrap into the next item.
         */
        _buildItemRows (actor, itemType, parentId) {
            for (const item of actor.items.filter(i => i.type === itemType)) {
                const rowId = `${item.id}-row`;
                this.addGroup(
                    { id: rowId, type: 'system', settings: { showTitle: false } },
                    { id: parentId, type: 'system' }
                );
                this.addActions(this._itemActions(item), { id: rowId, type: 'system' });
            }
        }

        _buildSkills (actor) {
            const actions = actor.items
                .filter(item => item.type === 'skill')
                .map(item => ({
                    id: item.id,
                    name: item.name,
                    encodedValue: ['display', item.id].join(DELIMITER),
                    img: getImage(item)
                }));
            this.addActions(actions, { id: 'skillList', type: 'system' });
        }

        /** Stance active-effects — click to select as the unit's active stance, click again to clear. */
        _buildStances (actor) {
            const active = actor.system.stance;
            const actions = [...actor.allApplicableEffects()]
                .filter(effect => effect.type === 'stance' && !effect.disabled)
                .map(effect => {
                    const isActive = active?.id === effect.id;
                    return {
                        id: effect.id,
                        name: isActive ? effect.name + ' [ON]' : effect.name,
                        encodedValue: ['stance', effect.id].join(DELIMITER),
                        img: getImage(effect),
                        cssClass: isActive ? 'active toggle' : 'toggle'
                    };
                });
            this.addActions(actions, { id: 'stanceList', type: 'system' });
        }

        /**
         * Standard and token active-effects. The name button toggles enabled/disabled and shows the effect
         * level as a badge. Stackable token effects also get a `-1 / amount / +1` row that adjusts the
         * effect's Amount (stored in duration.value); dropping to 0 deletes the effect.
         */
        _buildBuffs (actor) {
            for (const effect of actor.effects) {
                if (effect.type !== 'standard' && effect.type !== 'token') continue;

                // One subgroup (row) per buff so its stepper stays on the buff's own line.
                const rowId = `${effect.id}-row`;
                this.addGroup(
                    { id: rowId, type: 'system', settings: { showTitle: false } },
                    { id: 'buffList', type: 'system' }
                );

                const effectName = effect.name ?? effect.label;
                // Active state is shown by the outline (.active), so no "[ON]" text is needed.
                // Level and (for token effects) the amount both live on the name badge.
                const nameAction = {
                    id: effect.id,
                    name: effectName,
                    encodedValue: ['buff', effect.id].join(DELIMITER),
                    img: getImage(effect),
                    cssClass: effect.disabled ? '' : 'active toggle',
                    info1: { text: `Lv ${effect.system.level}`, title: 'Level' }
                };
                if (effect.type === 'token') {
                    nameAction.info2 = { text: `×${effect.system.amount}`, title: 'Amount' };
                }
                const actions = [nameAction];

                if (effect.type === 'token') {
                    actions.push(
                        {
                            id: `${effect.id}-dec`,
                            name: '−1',
                            encodedValue: ['buffDec', effect.id].join(DELIMITER),
                            cssClass: 'toggle'
                        },
                        {
                            id: `${effect.id}-inc`,
                            name: '+1',
                            encodedValue: ['buffInc', effect.id].join(DELIMITER),
                            cssClass: 'toggle'
                        }
                    );
                }

                this.addActions(actions, { id: rowId, type: 'system' });
            }
        }

        /**
         * Build the row of buttons for a weapon/equipment/ability: the item itself (attack/use), an inline
         * Reload button when it has spent capacity, and a Wield/Unwield toggle for its readied state. Reload
         * and wield sit next to the item rather than in a separate section.
         * @param {Item} item
         * @param {string} useType - The encoded action type for the item's primary button (roll-handler key).
         * @returns {object[]}
         */
        _itemActions (item, useType = 'use') {
            const actions = [this._itemAction(item, useType)];

            // Show a Reload button whenever the item has capacity at all, so it doesn't pop in/out as ammo
            // is spent. It's greyed (disabled) while the item is full and can't currently reload.
            if (item.system.capacity?.max > 0) {
                actions.push({
                    id: `${item.id}-reload`,
                    name: 'Reload',
                    encodedValue: ['reload', item.id].join(DELIMITER),
                    icon1: '<i class="fa-solid fa-arrows-rotate"></i>',
                    cssClass: item.canReload ? '' : 'disabled'
                });
            }

            // weapon/equipment/ability carry a `ready` field; skills do not. Icon-only toggle, lit when wielded.
            if (item.system.ready !== undefined) {
                actions.push({
                    id: `${item.id}-wield`,
                    name: 'Wield',
                    encodedValue: ['wield', item.id].join(DELIMITER),
                    icon1: '<i class="fa-solid fa-hand-fist"></i>',
                    cssClass: item.system.ready ? 'active toggle' : 'toggle'
                });
            }

            return actions;
        }

        /**
         * Build an "activate" action for a weapon/equipment/ability. Reads out remaining ammo when the
         * item has a capacity pool.
         * @param {Item} item
         * @param {string} type - The encoded action type (roll-handler switch key).
         * @returns {object}
         */
        _itemAction (item, type) {
            const action = {
                id: item.id,
                name: item.name,
                encodedValue: [type, item.id].join(DELIMITER),
                img: getImage(item)
            };
            if (item.system.capacity?.max > 0) {
                action.info1 = { text: `${item.system.capacity.value}/${item.system.capacity.max}`, title: 'Ammo' };
            }
            return action;
        }
    };

    /* ROLL HANDLER */

    const RollHandler = class RollHandler extends coreModule.api.RollHandler {
        /** @override */
        async handleActionClick (event, encodedValue) {
            const [actionType, actionId] = encodedValue.split(DELIMITER);
            const actor = this.actor;
            if (!actor) return;

            switch (actionType) {
                case 'use': {
                    // Weapons roll their attack; abilities/equipment run their item-use action.
                    const item = actor.items.get(actionId);
                    await item?.use();
                    break;
                }
                case 'display': {
                    const item = actor.items.get(actionId);
                    await item?.displayInChat();
                    break;
                }
                case 'reload': {
                    const item = actor.items.get(actionId);
                    if (item?.canReload) await item.reload();
                    break;
                }
                case 'wield': {
                    // Toggle the item's readied (wielded) state.
                    const item = actor.items.get(actionId);
                    if (item) await item.update({ 'system.ready': !item.system.ready });
                    break;
                }
                case 'showDefense':
                    await actor.displayDefenseCard();
                    break;
                case 'stance': {
                    const effect = [...actor.allApplicableEffects()].find(e => e.id === actionId);
                    if (!effect) break;
                    const isActive = actor.system.stance?.id === effect.id;
                    const value = isActive ? '' : effect.getRelativeUUID(null, { toActor: true });
                    await actor.update({ 'system.stance': value });
                    break;
                }
                case 'buff': {
                    const effect = actor.effects.get(actionId);
                    await effect?.update({ disabled: !effect.disabled });
                    this._refreshHud();
                    break;
                }
                case 'buffInc': {
                    // Amount is stored in the effect's duration.value.
                    const effect = actor.effects.get(actionId);
                    if (effect) {
                        await effect.update({ 'duration.value': effect.system.amount + 1, 'duration.units': 'rounds' });
                        this._refreshHud();
                    }
                    break;
                }
                case 'buffDec': {
                    const effect = actor.effects.get(actionId);
                    if (effect) {
                        const next = effect.system.amount - 1;
                        if (next <= 0) {
                            await effect.delete(); // deleteActiveEffect is auto-tracked, no manual refresh needed
                        } else {
                            await effect.update({ 'duration.value': next, 'duration.units': 'rounds' });
                            this._refreshHud();
                        }
                    }
                    break;
                }
            }
        }

        /**
         * Force the HUD to rebuild. Needed after ActiveEffect *updates* (e.g. changing an effect's amount or
         * disabled state) because Token Action HUD Core only auto-refreshes on effect create/delete, not
         * update — so without this the buttons keep showing stale values.
         */
        _refreshHud () {
            Hooks.callAll('forceUpdateTokenActionHud');
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
            return { core: 'Escalation' };
        }

        /** @override */
        getRollHandler (rollHandlerId) {
            return new RollHandler();
        }

        /** @override */
        async registerDefaults () {
            // TAH Core v2 layout rules that this structure relies on:
            //  - A top-level entry is a *category* (level 1). It renders only its child subgroups, never
            //    its own actions, so every section's actions live in a nested subgroup that the
            //    ActionHandler targets by id.
            //  - When a subgroup is attached to its parent, Core matches the category's `id` against the
            //    first segment of the child's `nestId` (getGroupByNestId). So a category's `id` MUST equal
            //    its own `nestId`, and each child `nestId` MUST be `${categoryId}_${suffix}`. Subgroup ids
            //    are kept distinct from their category id to avoid collisions in getGroups({ id }).
            //  - Single-section categories hide their subgroup title (showTitle: false) so the tab reads as
            //    one flat section; multi-subgroup categories (Stats, Defenses) keep their labels.
            const hidden = { showTitle: false };
            // A category holding a single, title-less subgroup (the tab name is the only label shown).
            const solo = (id, name, subId) => ({
                nestId: id,
                id,
                name,
                type: 'system',
                groups: [
                    { nestId: `${id}_list`, id: subId, name, type: 'system', settings: hidden }
                ]
            });

            return {
                layout: [
                    {
                        // Stats also surfaces HP / Power as info badges on the tab button (see _buildVitals).
                        nestId: 'stats',
                        id: 'stats',
                        name: 'Stats',
                        type: 'system',
                        groups: [
                            { nestId: 'stats_combat', id: 'combatStats', name: 'Combat', type: 'system' },
                            { nestId: 'stats_resources', id: 'resources', name: 'Resources', type: 'system' }
                        ]
                    },
                    solo('attacks', 'Attacks', 'weapons'),
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
                    solo('equipment', 'Equipment', 'equipmentList'),
                    solo('abilities', 'Abilities', 'abilityList'),
                    solo('skills', 'Skills', 'skillList'),
                    solo('stances', 'Stances', 'stanceList'),
                    solo('buffs', 'Buffs', 'buffList')
                ],
                groups: [
                    { id: 'combatStats',   name: 'Combat',        type: 'system' },
                    { id: 'resources',     name: 'Resources',     type: 'system' },
                    { id: 'weapons',       name: 'Attacks',       type: 'system' },
                    { id: 'defenseStats',  name: 'Defense Stats', type: 'system' },
                    { id: 'defenseItems',  name: 'Armor',         type: 'system' },
                    { id: 'equipmentList', name: 'Equipment',     type: 'system' },
                    { id: 'abilityList',   name: 'Abilities',     type: 'system' },
                    { id: 'skillList',     name: 'Skills',        type: 'system' },
                    { id: 'stanceList',    name: 'Stances',       type: 'system' },
                    { id: 'buffList',      name: 'Buffs',         type: 'system' }
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
