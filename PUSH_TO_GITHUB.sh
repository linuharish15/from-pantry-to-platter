#!/usr/bin/env bash
# Run this from the root of your local clone of linuharish15/from-pantry-to-platter,
# AFTER copying the contents of this folder over it. It commits and pushes normally (no force push).
set -e
git add -A
git commit -m "Redesign as IngreDine: new theme and logo, separate sections, tap-to-open recipes in 7Cs, people count, camera/voice, cuisines, history, login"
git push origin HEAD
