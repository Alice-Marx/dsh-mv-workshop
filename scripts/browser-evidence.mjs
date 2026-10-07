// Maintainer browser attestations live outside packs/, so contributor PRs
// cannot replace them. Every pack byte is bound; any edit requires new QA.
export function verifyBrowserEvidence(evidence, { id, version, files }) {
  const errors = []
  if (evidence?.format !== 'dsh-mv-browser-evidence' || evidence.version !== 1 || evidence.status !== 'passed') return ['Missing passed maintainer browser evidence']
  if (evidence.packId !== id || evidence.packVersion !== version) errors.push('Evidence belongs to another pack/version')
  if (!evidence.browser || !evidence.gpu || !/^[a-f0-9]{64}$/.test(evidence.reportSha256 ?? '')) errors.push('Missing browser/GPU/report identity')
  if (evidence.externalRequests !== 0 || evidence.audioFiles !== 0 || evidence.errors !== 0 || evidence.limitsChecked !== true || evidence.cleanupChecked !== true) errors.push('Browser safety/runtime checks did not pass')
  for (const key of ['shots', 'transitions', 'pause', 'seek']) if (!Number.isInteger(evidence.coverage?.[key]) || evidence.coverage[key] < 1) errors.push(`Missing ${key} coverage`)
  const rows = evidence.files
  if (!Array.isArray(rows) || rows.length !== files.length) errors.push('Evidence file inventory differs')
  else {
    const expected = new Map(rows.map(row => [row.path, row]))
    if (expected.size !== rows.length) errors.push('Duplicate evidence paths')
    for (const file of files) {
      const row = expected.get(file.path)
      if (!row || row.size !== file.size || row.sha256 !== file.sha256) errors.push(`Evidence bytes differ: ${file.path}`)
    }
  }
  return errors
}
