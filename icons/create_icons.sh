#!/bin/bash
# Simple script to create basic placeholder icons

# Create simple colored squares as placeholders
# These are base64 encoded PNG images

# icon16.png (16x16 purple square)
echo "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAF0lEQVQ4jWP4TyFgGAWjYBSMglEwAgAAKPgAGV7ztrcAAAAASUVORK5CYII=" | base64 -d > icon16.png

# icon48.png (48x48 purple square)
echo "iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAIklEQVRoge3QMQEAAAjDMMC/5+ECvwYJ7VQqVapUqVKlSh8GBZAA9d/4PQEAAAAASUVORK5CYII=" | base64 -d > icon48.png

# icon128.png (128x128 purple square)
echo "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAQUlEQVR4nO3BgQAAAADDoPtTH+NQAODEAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAGkAD8dAAE7BH/IAAAAAElFTkSuQmCC" | base64 -d > icon128.png

echo "Icons created successfully!"
