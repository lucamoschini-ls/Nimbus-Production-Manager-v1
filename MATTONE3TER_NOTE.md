# Mattone 3-ter — Playwright MCP per browser testing

## Versione Node
v25.6.1

## Pacchetto MCP
`@playwright/mcp@latest` (pacchetto ufficiale Microsoft)
Chromium installato in: `/Users/luca/Library/Caches/ms-playwright/chromium_headless_shell-1217`

## File di config
Path: `/Users/luca/Lavoro/Tech/Repos/production_tool/.mcp.json` (nuovo file, non esisteva)

Contenuto:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest", "--headless"]
    }
  }
}
```

## Istruzioni per Luca

1. Chiudi la sessione Claude Code corrente (Ctrl+C o chiudi il terminale)
2. Riapri Claude Code nella stessa cartella del progetto
3. Claude Code caricherà automaticamente il server MCP da `.mcp.json`
4. Potrebbe chiederti di approvare il server "playwright" al primo uso — rispondi sì

## Comando di verifica post-riavvio

Dopo il riavvio, lancia questo prompt a Claude Code:

"Usa il browser Playwright per navigare su https://nimbus-production-manager-v1.vercel.app e dimmi il titolo della pagina"

Se funziona, Claude Code navigherà sul sito e riporterà il titolo. Se non funziona, il server MCP non è stato caricato correttamente.
