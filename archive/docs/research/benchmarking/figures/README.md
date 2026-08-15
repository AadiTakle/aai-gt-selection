# Figure drop zone

The companion synthetic-data analysis writes six PDFs here:

```
cluster-projection.pdf     incremental-validity.pdf
officer-agreement.pdf      ppv-base-rate.pdf
decision-accuracy-roc.pdf  range-restriction.pdf
```

`\figslot` in `preamble.tex` includes each one if present and shows a labelled
placeholder otherwise, so the document builds either way. No argument in the
text depends on a figure's values.
