# Graal Era Trade Stand

A fan-made trade calculator for GraalOnline Era: count your sellables, price them in gralats, convert gralats and rocks to Tro, and copy the trade into chat.

Live site: https://lightastaff-rgb.github.io/Trade-Tables/

## Files

| Path | What it is |
| --- | --- |
| `index.html` | Page markup and the security policy |
| `app.js`, `css/style.css` | Minified code the live site loads |
| `src/app.js`, `src/style.css` | Readable versions of the same code, for editing |
| `assets/` | Pixel art (items, UI wood, header scene) and the two pixel fonts, trimmed to the characters the page uses |

## Security

- Strict Content Security Policy: only this site's own scripts, styles, images and fonts can load. The page may only call the screenshot reader, and it can't submit forms or load plugins.
- Saved browser data is validated before use, and anything shown on the page is escaped.
- The screenshot reader uses a public (anon) key that is designed to be shipped to browsers. Reads are limited per browser (a short cooldown and a daily cap).

Not affiliated with GraalOnline or Toonslab.
