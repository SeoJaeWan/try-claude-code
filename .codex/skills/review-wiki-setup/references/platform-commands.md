# Review Wiki Setup Commands

## Path Contract

- Actual vault path: environment-specific Obsidian vault path such as `<vault-path>`
- Stable Codex path: `~/.codex/reviewWiki`

## Windows PowerShell

Create the link:

```powershell
New-Item -ItemType Junction -Path "$HOME\\.codex\\reviewWiki" -Target "<vault-path>"
```

If an existing wrong link is present:

```powershell
Remove-Item -LiteralPath "$HOME\\.codex\\reviewWiki"
New-Item -ItemType Junction -Path "$HOME\\.codex\\reviewWiki" -Target "<vault-path>"
```

Prepare or repair the workspace planning root as a live junction:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./.codex/skills/review-wiki-setup/scripts/stage-review-wiki.ps1
```

Optional: request a true symbolic link instead of the default directory junction:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./.codex/skills/review-wiki-setup/scripts/stage-review-wiki.ps1 -LinkType SymbolicLink
```

## macOS / Linux

Create the link:

```bash
ln -s "/actual/vault/path" "$HOME/.codex/reviewWiki"
```

Replace a wrong link:

```bash
rm "$HOME/.codex/reviewWiki"
ln -s "/actual/vault/path" "$HOME/.codex/reviewWiki"
```

Prepare or repair the workspace planning root as a live symbolic link:

```bash
sh ./.codex/skills/review-wiki-setup/scripts/stage-review-wiki.sh
```

## Verification

After creating the link:

- confirm `~/.codex/reviewWiki` resolves to the intended vault
- confirm `raw/` and `wiki/` are visible through the link
- confirm later skills can use the linked path without direct knowledge of the underlying vault path
- confirm `./.codex/review-wiki/sync/current` resolves to the external `wiki/` root rather than a copied fallback
