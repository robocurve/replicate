#!/usr/bin/env bash
# Regenerate the refusal counts from the frozen inputs in data/ and render a preview of the heatmap.
# Needs python3 and pdflatex with TikZ (pdftoppm for the PNG). To refresh the inputs, see README.md.
set -euo pipefail
cd "$(dirname "$0")"
ROWS=${1:-data/rows-20261027T0909.json}
LINES=${2:-data/cohort-log-lines-20261027T0909.txt}
JUDGES=${3:-data/judge-fable51-20261027.jsonl,data/judge-manual-20261027.jsonl}
python3 -I make_counts.py "$ROWS" "$LINES" paper-figures/refusal_counts.tex data/counted-trials.csv "$JUDGES"
mkdir -p build
pdflatex -interaction=nonstopmode -halt-on-error -output-directory=build preview.tex > build/preview.out
cp build/preview.pdf paper-figures/glass-darkly-refusals-preview.pdf
pdftoppm -r 250 -png -singlefile build/preview.pdf paper-figures/glass-darkly-refusals-preview
