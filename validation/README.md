# Maintainer browser evidence

Some WebGL scenes generate geometry by sampling real canvas text/image pixels.
The Node recording context cannot rasterize those inputs. It stops explicitly
instead of feeding fake blank pixels to sampling algorithms.

Such packs require a passed real-browser QA attestation here. Each attestation
binds **every pack file's path, size and SHA-256**, the version, browser/GPU,
report hash, coverage, limits and cleanup checks. Any pack edit invalidates it.
Contributor PRs can only change `packs/<id>/`; only a maintainer can add or
replace evidence after running browser QA. This is a maintainer attestation,
not a claim that GitHub's Node process rendered the film or replayed the GPU test.

FrostNova was checked using the production Host file readers, ScriptFilm,
sandboxed Worker and real Chromium GPU. The full report and editable QA tool
accompany its free corresponding-source archive. The report retains exact
frame hashes. Its visual comparison allows at most one RGB code in 0.02% of
pixels with no alpha changes, since the unchanged upstream also showed tiny
one-code differences after seeking on the same GPU.
