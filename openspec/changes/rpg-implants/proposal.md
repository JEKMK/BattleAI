# Proposal: RPG Implants, Stims & Credits

## User value anchor
Your runner stops being a generic prompt writer and becomes YOUR build. Gorilla Arms for brawlers, Kiroshi Optics for snipers, Sandevistan for dodgers. Every implant changes how your AI fights — and you have to rewrite your prompt to take advantage of it. That's depth no other game has.

## User stories
- As a runner, I want to buy implants with credits so I can specialize my AI fighter
- As a runner, I want to see my implants affect the battle so my build choices feel meaningful
- As a runner, I want to use stims before a battle for a temporary edge
- As a runner, I want to browse a RipperDoc terminal to pick my upgrades
- As a runner, I want to see my active mods in the combat log so I know they're working

## Scope — NOW (contest)
- Credits as reward from gauntlet + PVP
- 4 permanent implants: Gorilla Arms, Kiroshi Optics, Subdermal Armor, Neural Processor
- 2 consumable stims: Black Lace, Bounce Back
- RipperDoc terminal (overlay modal, CRT aesthetic)
- Engine parameterized (config object instead of hardcoded numbers)
- System prompt injection for implant effects (AI sees its modified stats)
- Implant icons in header + combat log markers
- DB: credits column, runner_implants table, runner_stims table

## Scope — LATER (post-contest)
- Advanced implants: Sandevistan, ICE Breaker, Kerenzikov
- OS upgrades: Militech Paraline, Arasaka Daemon, NetWatch ICE
- Arena visual effects per implant
- Slot unlocks gated by Street Cred
- More stims with varied effects
- Implant drop system from gauntlet levels

## Status: proposed
