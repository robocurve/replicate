#!/usr/bin/env bash
# Regenerate the completion counts from the frozen inputs in data/ and render a preview of the heatmap.
# Needs python3 and pdflatex with TikZ (pdftoppm for the PNG).
set -euo pipefail
cd "$(dirname "$0")"
TRIALS=${1:-data/counted-trials.csv}
MAJORITY=${2:-data/completion-majority-20261112-mix-spill-30deg.jsonl}
python3 -I make_completion_counts.py "$TRIALS" "$MAJORITY" paper-figures/completion_counts.tex
mkdir -p build
pdflatex -interaction=nonstopmode -halt-on-error -output-directory=build preview.tex > build/preview.out
cp build/preview.pdf paper-figures/perceptual-generalization-completion-preview.pdf
pdftoppm -r 250 -png -singlefile build/preview.pdf paper-figures/completion
