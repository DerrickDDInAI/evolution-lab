# Evolution Lab

Experiments in evolving game behavior.

## Games

- [Immunity](immunity/README.md): a multiplayer survival game with evolving sentinels, Survival and Motion Hunt modes.

## Develop Immunity

Requires Node.js 22.13 or later. From this repository root:

```sh
cd immunity
npm run install:ci
npm run verify
npm run build
```

See the [game README](immunity/README.md) for database setup and local preview instructions, and [contributor guidance](AGENTS.md) before editing.

The repository retains its existing Git history. Each game's application files, dependencies, local runtime data and hosting configuration live in its own folder.
