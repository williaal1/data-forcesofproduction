// =============================================================================
// data-loader.js — Fetch JSON data files
// =============================================================================

export async function loadData(onProgress) {
  const files = ['sectors', 'flows', 'trade'];
  const data = {};

  for (let i = 0; i < files.length; i++) {
    const name = files[i];
    const resp = await fetch(`data/${name}.json`);
    if (!resp.ok) throw new Error(`Failed to load ${name}.json: ${resp.status}`);
    data[name] = await resp.json();
    if (onProgress) onProgress((i + 1) / files.length);
  }

  return data;
}
