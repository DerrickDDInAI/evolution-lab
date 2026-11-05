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

Initialize the local database once using the [local setup instructions](immunity/README.md#initialize-the-local-database), then choose a workflow:

| Task | Command from `immunity/` |
| --- | --- |
| Develop with live rebuilds | `npm run dev -- --port 5173 --hostname 127.0.0.1` |
| Build and preview locally | `npm run build`, then `npm start -- --port 5173` |
| Build for Cloudflare without publishing | `npm run cloudflare:build` |
| Deploy to Cloudflare | `npx wrangler login`, then `npm run cloudflare:deploy` |

Development and preview open at [http://127.0.0.1:5173](http://127.0.0.1:5173). Read the [complete installation and running guide](immunity/README.md#install) and [Cloudflare deployment instructions](immunity/README.md#deploy-to-cloudflare) for database setup, account configuration and secrets. Each experiment keeps its code and dependencies in its own directory.

## Contributing

Use [GitHub issues](https://github.com/DerrickDDInAI/evolution-lab/issues) for reproducible bugs and feature ideas. Read the [contributor guidance](AGENTS.md) before making changes, and run the relevant game's checks. Never include credentials or player data in commits or reports.

## Contact

- **Creator:** Derrick Van Frausum
- **Business inquiries:** [info@evogoo.com](mailto:info@evogoo.com)
- **Contact and feedback:** [contact@evogoo.com](mailto:contact@evogoo.com)
