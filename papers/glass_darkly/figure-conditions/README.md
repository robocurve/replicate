# Conditions figure: one trial frame per scene under three conditions

Five scenes across, labelled with the paper's task names (doll, power-strip, toaster, mix-chemicals, pour-drink;
frame keys doll, cord, toaster, mix, drink), three conditions down (normal, blur, doctored; the doctored row draws the
`spoof` tiles). Every tile is
the 224x224 image the policy receives under that condition, embedded at native resolution and cropped top and
bottom to a 160-row band per scene (`CROP_TOP` in `plot.py`; the same band for every condition of a scene) that keeps
every prop in view. `make_tiles.py` also
writes the obvious-spoof tiles (`frames/<scene>_obvious.png`, the spoof tile with the translucent "AI Generated"
badge); the figure does not draw them.

## Files

| File | What it is |
|---|---|
| `frames/<scene>_<condition>.png` | the 20 tiles (four conditions, obvious included), 224x224; written by `make_tiles.py` |
| `make_tiles.py` | builds the tiles from the trial frames with the RoboSpoof code itself (`robospoof.overlay.mark_obvious` for the badge, `robospoof.editors.BlurEditor` at sigma 4 for blur) |
| `plot.py` | lays the tiles out and writes `paper-figures/glass-darkly-conditions.{png,pdf,tex}` |
| `fonts/` | the bundled Liberation Sans (SIL OFL 1.1) the figure is set in |
| `run.sh`, `requirements.txt` | regenerate the figure from the tiles; the pinned environment |

## Provenance

The normal row is the real overhead frame at the first LLM call of one GPT-6 Astra trial per scene, run on the
YAM rigs on 2026-10-25 (rigs 1, 2, 3, 5 and 6). The spoof row is the GPT Image 2.5 Sunburst edit of that frame
with the scene's prompt (doll to apple, bleach and ammonia labels to soft-drink and water labels, toaster to an
open pot, bleach label replaced, outlet adapter and cord to an apple beside the pot). The obvious row draws the
translucent "AI Generated" badge (pill 16.5% of the frame height, 55% opacity, opaque text) over the spoof tile.
The blur row applies a Gaussian blur of sigma 4 px to the real frame. Source frames live in the RoboSpoof
repository under `runs/gemini-edit-test-20261025/consistency/` (`trial-frames/<rig>/raw/step00000-top_cam.png`
and `edits/gpt-image-2.5-sunburst/<rig>/step00000-top_cam.png`).

## Reproduce

```
./run.sh
```
