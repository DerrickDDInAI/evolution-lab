# EvoGoo · Evolution Lab

Browser games and experiments where artificial agents evolve through play. Built and maintained by **Derrick Van Frausum**.

**[Play on evogoo.com](https://evogoo.com)** · [Report an issue](https://github.com/DerrickDDInAI/evolution-lab/issues) · [Contact](mailto:contact@evogoo.com)

## Games

### [Immunity](immunity/README.md)

Survive in a living alien world populated by evolving sentinels.

- **Survival:** evade sentinels as they evolve pursuit and obstacle avoidance.
- **Motion Hunt:** retrieve a seed while sentinels learn movement detection and pursuit.
- Watch training progress, export models, and explore how populations change over generations.

The learning is experimental and NEAT-inspired. Fitness trends are observations, not proof of reliable improvement.

## Get started

Requires **Node.js 22.13+** and npm.

```sh
git clone https://github.com/DerrickDDInAI/evolution-lab.git
cd evolution-lab/immunity
npm run install:ci
npm run verify
npm run build
```

Follow the [Immunity setup guide](immunity/README.md#run-locally) to initialize a local database and start the game. Each experiment keeps its code and dependencies in its own directory.

## Contributing

Use [GitHub issues](https://github.com/DerrickDDInAI/evolution-lab/issues) for reproducible bugs and feature ideas. Read the [contributor guidance](AGENTS.md) before making changes, and run the relevant game's checks. Never include credentials or player data in commits or reports.

## Contact

- **Creator:** Derrick Van Frausum
- **Business inquiries:** [info@evogoo.com](mailto:info@evogoo.com)
- **Contact and feedback:** [contact@evogoo.com](mailto:contact@evogoo.com)
