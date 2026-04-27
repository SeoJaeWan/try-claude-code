# Review Wiki Setup Commands

## Path Contract

- Actual vault path: environment-specific Obsidian vault path such as `<vault-path>`
- Stable Codex path: `~/.codex/reviewWiki`

## First-Time Vault Link

The stable Codex path must point at the real Obsidian vault:

```text
~/.codex/reviewWiki
```

Creating that first link may still require an environment-specific command because the real vault path is machine-specific. After the link exists, use the platform-neutral Node staging command below for the workspace planning root.

### Windows PowerShell

Create the link:

```powershell
New-Item -ItemType Junction -Path "$HOME\\.codex\\reviewWiki" -Target "<vault-path>"
```

If an existing wrong link is present:

```powershell
Remove-Item -LiteralPath "$HOME\\.codex\\reviewWiki"
New-Item -ItemType Junction -Path "$HOME\\.codex\\reviewWiki" -Target "<vault-path>"
```

### macOS / Linux

Create the link:

```bash
ln -s "/actual/vault/path" "$HOME/.codex/reviewWiki"
```

Replace a wrong link:

```bash
rm "$HOME/.codex/reviewWiki"
ln -s "/actual/vault/path" "$HOME/.codex/reviewWiki"
```

## Workspace Planning Root

Prepare or repair the workspace planning root as a live link:

```text
node .codex/tools/stage-review-wiki.mjs
```

The Node command is the canonical staging path on Windows, macOS, and Linux. It uses a Windows junction by default on Windows and a directory symbolic link on macOS / Linux. It writes `./.codex/review-wiki/sync/current.manifest.json` next to the planning root.

## Verification

After creating the link:

- confirm `~/.codex/reviewWiki` resolves to the intended vault
- confirm `raw/` and `wiki/` are visible through the link
- confirm later skills can use the linked path without direct knowledge of the underlying vault path
- confirm `./.codex/review-wiki/sync/current` resolves to the external `wiki/` root rather than a copied fallback
