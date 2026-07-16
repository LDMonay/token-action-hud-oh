# Token Action HUD Escalation

Token Action HUD Escalation is a repositionable HUD of actions for the [Escalation: Locked & Loaded](https://github.com/LDMonay) system in Foundry VTT.

Built on [Token Action HUD Core](https://github.com/Larkinabout/fvtt-token-action-hud-core), it puts a unit's most-used actions a single click away from its token.

## Features

- **Attacks** — roll a weapon's attack directly (`item.use()`), with remaining ammo shown inline.
- **Reload** — one-click reload for weapons, equipment, and abilities that have spent capacity.
- **Defenses** — post a defense card, and read Profile, Defense, and the Grit / Awareness / Morale saves at a glance; equipped armor is listed for quick reference.
- **Resources** — Health, Shield, Heat, and Power pools (shown only when the unit uses them).
- **Combat stats** — Actions, Minor Actions, Aim, Speed, Melee, and Points.
- **Equipment, Abilities, Skills** — activate items or post their cards.
- **Stances** — select the unit's active stance (or clear it) from the HUD.
- **Buffs** — toggle standard and token active effects on and off.

## Requirements

| Dependency | Version |
| --- | --- |
| Foundry VTT | v14 |
| [Escalation](https://github.com/LDMonay) system | 0.89+ |
| [Token Action HUD Core](https://github.com/Larkinabout/fvtt-token-action-hud-core) | 2.1.0+ |

## Installation

1. Install and enable **Token Action HUD Core**.
2. Install this module and enable it.
3. Token Action HUD will automatically detect the Escalation system.
