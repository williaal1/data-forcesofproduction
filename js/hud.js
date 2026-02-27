// =============================================================================
// hud.js — Info panel population + legend
// =============================================================================

export function setupHUD(flowsData, selectByCodeFn) {
  const panel = document.getElementById('info-panel');
  const closeBtn = document.getElementById('info-close');

  closeBtn.addEventListener('click', () => {
    hidePanel();
    // Simulate Escape
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  });

  function showPanel(code, sector) {
    // Populate fields
    document.getElementById('info-name').textContent = sector.name || sector.short_name || code;
    document.getElementById('info-code').textContent = `IO Code: ${code}`;

    // Stats
    setStatValue('stat-gdp', sector.gdp_value ? `$${sector.gdp_value.toFixed(1)}B` : 'N/A');
    setStatValue('stat-gdp-share', sector.gdp_share ? `${(sector.gdp_share * 100).toFixed(2)}%` : 'N/A');
    setStatValue('stat-ip', sector.ip_yoy, true);
    setStatValue('stat-ppi', sector.ppi_yoy, true);
    setStatValue('stat-upstream', sector.upstreamness ? sector.upstreamness.toFixed(2) : 'N/A');
    setStatValue('stat-imports', sector.import_intensity ? sector.import_intensity.toFixed(4) : 'N/A');

    // Connections: top 5 suppliers (who sells to this sector)
    const suppliers = flowsData
      .filter(f => f.target === code)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const customers = flowsData
      .filter(f => f.source === code)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    populateConnections('conn-suppliers', suppliers, 'source', selectByCodeFn);
    populateConnections('conn-customers', customers, 'target', selectByCodeFn);

    // Show panel
    panel.classList.remove('hidden');
    panel.classList.add('visible');
  }

  function hidePanel() {
    panel.classList.remove('visible');
    panel.classList.add('hidden');
  }

  function setStatValue(elementId, value, isPercentage = false) {
    const el = document.getElementById(elementId);
    if (value === null || value === undefined || value === 'N/A') {
      el.textContent = 'N/A';
      el.className = 'stat-value';
      return;
    }

    if (isPercentage && typeof value === 'number') {
      el.textContent = `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
      el.className = `stat-value ${value >= 0 ? 'positive' : 'negative'}`;
    } else {
      el.textContent = value;
      el.className = 'stat-value';
    }
  }

  // All sectors keyed by code for name lookup
  let sectorLookup = {};

  function setSectorLookup(sectors) {
    sectorLookup = {};
    for (const s of sectors) {
      sectorLookup[s.code] = s;
    }
  }

  function populateConnections(containerId, connections, codeField, selectFn) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (connections.length === 0) {
      container.innerHTML = '<div class="conn-item"><span class="conn-name" style="opacity:0.5">None above threshold</span></div>';
      return;
    }

    for (const conn of connections) {
      const code = conn[codeField];
      const sector = sectorLookup[code];
      const name = sector ? (sector.short_name || sector.name || code) : code;

      const item = document.createElement('div');
      item.className = 'conn-item';
      const dotColor = containerId === 'conn-suppliers' ? 'var(--mint)' : 'var(--orange)';
      item.innerHTML = `<span class="conn-dot" style="background:${dotColor}"></span><span class="conn-name">${name}</span><span class="conn-value">${(conn.value * 100).toFixed(1)}%</span>`;
      item.addEventListener('click', () => {
        if (selectFn) selectFn(code);
      });
      container.appendChild(item);
    }
  }

  return { showPanel, hidePanel, setSectorLookup };
}
