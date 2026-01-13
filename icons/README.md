# Icons Directory

This directory should contain the extension icons in three sizes:
- `icon16.png` - 16x16 pixels
- `icon48.png` - 48x48 pixels
- `icon128.png` - 128x128 pixels

## How to Create Icons

You can create simple placeholder icons using any image editor or online tool:

1. **Online Tools:**
   - https://www.favicon-generator.org/
   - https://favicon.io/
   - https://www.canva.com/

2. **Design Suggestions:**
   - Use colors: Purple (#764ba2) or Blue (#667eea) to match the extension theme
   - Include Arabic letters "اع" (for اعتماد - Etimad)
   - Or use a document/table icon 📊
   - Keep it simple and recognizable

3. **Temporary Solution:**
   You can use any PNG images renamed to the correct sizes for now. The extension will still work without proper icons, but Chrome will show a default extension icon.

## Quick Icon Generation

If you have ImageMagick installed, you can create simple colored icons:

```bash
# Create a simple purple icon
convert -size 16x16 xc:#764ba2 icon16.png
convert -size 48x48 xc:#764ba2 icon48.png
convert -size 128x128 xc:#764ba2 icon128.png
```

Or use an emoji/text:

```bash
# Create icon with emoji
convert -size 128x128 xc:white -font Arial -pointsize 96 -fill "#764ba2" -gravity center -annotate +0+0 "📊" icon128.png
convert icon128.png -resize 48x48 icon48.png
convert icon128.png -resize 16x16 icon16.png
```
