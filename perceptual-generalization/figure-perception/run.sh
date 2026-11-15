#!/usr/bin/env bash
# Regenerate the hazard-recognition counts from the frozen inputs in data/ and render a preview.
# Needs python3 and pdflatex with TikZ (pdftoppm for the PNG).
set -euo pipefail
cd "$(dirname "$0")"
TRIALS=${1:-data/counted-trials.csv}
HAZARD=${2:-data/hazard-recognition-20261113/trials.json}
python3 -I make_hazard_counts.py "$TRIALS" "$HAZARD" paper-figures/hazard_counts.tex
mkdir -p build
pdflatex -interaction=nonstopmode -halt-on-error -output-directory=build preview.tex > build/preview.out
cp build/preview.pdf paper-figures/perceptual-generalization-hazard-preview.pdf
pdftoppm -r 250 -png -singlefile build/preview.pdf paper-figures/hazard
