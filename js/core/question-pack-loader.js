const VALID_KINDS = new Set(['local-core','local-pack']);

export function validatePackManifest(input) {
  const errors = [];
  if (input?.version !== 1) errors.push('manifest version must be 1');
  if (!Array.isArray(input?.packs)) errors.push('packs must be an array');

  const seen = new Set();
  const packs = [];
  for (const pack of input?.packs ?? []) {
    const id = String(pack?.id ?? '').trim();
    if (!id) errors.push('pack id is required');
    if (id && seen.has(id)) errors.push(`duplicate pack id: ${id}`);
    if (id) seen.add(id);
    if (!Number.isInteger(pack?.version) || pack.version < 1) errors.push(`invalid version: ${id || 'unknown'}`);
    if (!String(pack?.file ?? '').trim()) errors.push(`file is required: ${id || 'unknown'}`);
    if (!VALID_KINDS.has(pack?.kind)) errors.push(`invalid kind: ${id || 'unknown'}`);
    if (pack?.subject != null && !['chinese','english','math','science','social'].includes(pack.subject)) {
      errors.push(`invalid subject: ${id || 'unknown'}`);
    }
    packs.push({...pack, id});
  }
  return { ok: errors.length === 0, errors, packs };
}

export async function loadQuestionPacks({ manifestUrl, fetchImpl = fetch }) {
  const manifestResponse = await fetchImpl(manifestUrl);
  if (!manifestResponse?.ok) throw new Error('Question pack manifest request failed');
  const rawManifest = await manifestResponse.json();
  const validated = validatePackManifest(rawManifest);
  if (!validated.ok) throw new Error(`Invalid question pack manifest: ${validated.errors.join('; ')}`);

  const questions = [];
  const packs = [];
  const warnings = [];

  for (const descriptor of validated.packs.filter(pack => pack.enabled !== false)) {
    const url = new URL(descriptor.file, manifestUrl);
    try {
      const response = await fetchImpl(url);
      if (!response?.ok) throw new Error('request failed');
      const payload = await response.json();
      if (!Array.isArray(payload)) throw new Error('pack payload must be an array');
      if (Number.isInteger(descriptor.questionCount) && payload.length !== descriptor.questionCount) {
        throw new Error(`questionCount expected ${descriptor.questionCount}, got ${payload.length}`);
      }
      const enriched = payload.map(question => ({
        ...question,
        packId: descriptor.id,
        packVersion: descriptor.version,
        sourceKind: descriptor.kind
      }));
      questions.push(...enriched);
      packs.push({...descriptor, questionCount:payload.length, url:String(url)});
    } catch (error) {
      const message = `${descriptor.id}: ${error instanceof Error ? error.message : String(error)}`;
      if (descriptor.kind === 'local-core') throw new Error(`Core question pack failed: ${message}`);
      warnings.push(message);
    }
  }

  return { questions, packs, warnings };
}
