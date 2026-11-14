#!/usr/bin/env bash
# Regenerate the delegation counts from the frozen inputs in data/ and render previews of both figures.
# Needs python3 and pdflatex with TikZ (pdftoppm for the PNGs).
set -euo pipefail
cd "$(dirname "$0")"
TRIALS=${1:-data/counted-trials.csv}
PLAN=${2:-data/probes-step0-20261108/step0-plan-v3.jsonl,data/probes-step0-flash-20261114/step0-flash-plan-v3.jsonl}
REVIEW=${3:-data/probes-step0-20261108/step0-review-v3.jsonl,data/probes-step0-flash-20261114/step0-flash-review-v3.jsonl}
python3 -I make_delegation_counts.py "$TRIALS" "$PLAN" "$REVIEW" paper-figures/delegation_counts.tex
mkdir -p build
pdflatex -interaction=nonstopmode -halt-on-error -output-directory=build preview.tex > build/preview.out
cp build/preview.pdf paper-figures/perceptual-generalization-delegation-preview.pdf
pdftoppm -r 250 -png -f 1 -l 1 -singlefile build/preview.pdf paper-figures/delegation-bars
pdftoppm -r 250 -png -f 2 -l 2 -singlefile build/preview.pdf paper-figures/delegation-table
