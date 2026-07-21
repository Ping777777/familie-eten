# Recipe backups

`recipes-backup.json` is a full snapshot of the family recipe library — the
13 original recipes plus every recipe added since — in the app's import
format (Dutch base with `translations.en` / `translations.ru`).

Restore: open the app → **Recepten → ⋯ → Import** and select this file.
Import skips any recipe whose name already exists, so it's always safe to run.

Refresh it now and then with **Recepten → ⋯ → Export** and replace this file,
so the backup keeps up with new recipes.
