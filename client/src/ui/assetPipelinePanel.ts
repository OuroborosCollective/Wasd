/**
 * Asset Pipeline Panel
 * Web-UI for the full Asset Brain + Tripo3D pipeline
 * Text → Spec → 3D Model → Game Registry
 */

interface PipelineJob {
  jobId: string;
  input: string;
  status: string;
  progress: number;
  specId?: string;
  tripoTaskId?: string;
  glbUrl?: string;
  glbLocalPath?: string;
  registryId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

let panel: HTMLDivElement | null = null;
let pollInterval: ReturnType<typeof setInterval> | null = null;
let activeJobId: string | null = null;
let threeViewer: any = null;

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  pending:          { label: 'Warte...',           color: '#888',   icon: '⏳' },
  generating_spec:  { label: 'Erstelle Bauplan...',color: '#4af',   icon: '🧠' },
  spec_ready:       { label: 'Bauplan fertig',      color: '#4f4',   icon: '📋' },
  generating_model: { label: 'Generiere 3D-Modell', color: '#fa4',   icon: '🎨' },
  downloading_glb:  { label: 'Lade GLB herunter',   color: '#a4f',   icon: '⬇️' },
  registering:      { label: 'Im Spiel registrieren',color: '#4ff',  icon: '🎮' },
  complete:         { label: 'Fertig!',              color: '#4f4',   icon: '✅' },
  failed:           { label: 'Fehler',               color: '#f44',   icon: '❌' },
};

export function toggleAssetPipelinePanel() {
  if (panel) {
    panel.remove();
    panel = null;
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    return;
  }
  createPanel();
}

function createPanel() {
  panel = document.createElement('div');
  Object.assign(panel.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '720px',
    maxWidth: '95vw',
    maxHeight: '90vh',
    backgroundColor: '#0a0a0f',
    color: '#e0e0ff',
    border: '1px solid #2a2a4a',
    borderRadius: '12px',
    padding: '0',
    overflowY: 'auto',
    zIndex: '9999',
    fontFamily: 'monospace',
    boxShadow: '0 0 40px rgba(80,120,255,0.3)',
  });

  panel.innerHTML = `
    <div style="background:linear-gradient(135deg,#1a1a3a,#0d0d1f);padding:16px 20px;border-radius:12px 12px 0 0;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-size:18px;font-weight:bold;color:#7af;">🧠 ASSET BRAIN PIPELINE</div>
        <div style="font-size:11px;color:#556;margin-top:2px;">Text → Spec → Tripo3D → GLB → Spiel</div>
      </div>
      <button id="btn-close-pipeline" aria-label="Close Asset Pipeline" style="background:none;border:1px solid #333;color:#aaa;padding:4px 10px;cursor:pointer;border-radius:6px;"><span aria-hidden="true">✕</span></button>
    </div>

    <!-- Generator -->
    <div style="padding:16px 20px;border-bottom:1px solid #1a1a2a;">
      <div style="font-size:12px;color:#7af;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Asset generieren</div>
      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <input id="inp-asset-name" type="text" placeholder='z.B. "knight", "dragon", "iron sword"'
          style="flex:1;background:#111;border:1px solid #333;color:#fff;padding:8px 12px;border-radius:6px;font-size:14px;" />
        <button id="btn-generate-full" style="background:#2a4aff;border:none;color:#fff;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:bold;">
          ⚡ Generieren
        </button>
        <button id="btn-spec-only" style="background:#1a3a1a;border:1px solid #2a4a2a;color:#4f4;padding:8px 12px;border-radius:6px;cursor:pointer;font-size:12px;">
          📋 Nur Spec
        </button>
      </div>
      <div style="display:flex;gap:12px;font-size:11px;color:#556;">
        <label><input type="checkbox" id="chk-auto-register" checked /> Auto-Register im Spiel</label>
        <label><input type="checkbox" id="chk-generate-model" checked /> 3D-Modell generieren</label>
      </div>
    </div>

    <!-- Progress -->
    <div id="pipeline-progress" style="padding:16px 20px;border-bottom:1px solid #1a1a2a;display:none;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span id="progress-label" style="font-size:13px;color:#7af;">⏳ Starte...</span>
        <span id="progress-pct" style="font-size:13px;color:#aaa;">0%</span>
      </div>
      <div style="background:#111;border-radius:4px;height:8px;overflow:hidden;">
        <div id="progress-bar" style="height:100%;background:linear-gradient(90deg,#2a4aff,#7af);width:0%;transition:width 0.5s;border-radius:4px;"></div>
      </div>
      <div id="progress-detail" style="font-size:11px;color:#556;margin-top:6px;"></div>
    </div>

    <!-- 3D Preview -->
    <div id="model-preview-section" style="padding:16px 20px;border-bottom:1px solid #1a1a2a;display:none;">
      <div style="font-size:12px;color:#7af;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">3D Vorschau</div>
      <div style="display:flex;gap:12px;">
        <canvas id="three-canvas" width="280" height="200" style="border:1px solid #333;border-radius:6px;background:#111;"></canvas>
        <div id="model-info" style="flex:1;font-size:11px;color:#aaa;"></div>
      </div>
      <div style="margin-top:8px;display:flex;gap:8px;">
        <button id="btn-add-to-game" style="background:#1a3a1a;border:1px solid #2a4a2a;color:#4f4;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px;">
          🎮 Ins Spiel eintragen
        </button>
        <button id="btn-download-glb" style="background:#1a1a3a;border:1px solid #2a2a4a;color:#7af;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px;">
          ⬇️ GLB herunterladen
        </button>
      </div>
    </div>

    <!-- Spec Viewer -->
    <div id="spec-section" style="padding:16px 20px;border-bottom:1px solid #1a1a2a;display:none;">
      <div style="font-size:12px;color:#7af;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Asset-Spezifikation</div>
      <pre id="spec-json" style="background:#050508;padding:12px;border-radius:6px;font-size:10px;color:#8af;overflow-x:auto;max-height:200px;border:1px solid #1a1a2a;"></pre>
    </div>

    <!-- Jobs History -->
    <div style="padding:16px 20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-size:12px;color:#7af;text-transform:uppercase;letter-spacing:1px;">Pipeline-Jobs</div>
        <button id="btn-refresh-jobs" style="background:none;border:1px solid #333;color:#aaa;padding:3px 8px;cursor:pointer;border-radius:4px;font-size:11px;">↻ Aktualisieren</button>
      </div>
      <div id="jobs-list" style="font-size:11px;color:#aaa;"></div>
    </div>

    <!-- API Tester -->
    <div style="padding:16px 20px;border-top:1px solid #1a1a2a;">
      <div style="font-size:12px;color:#fa4;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">🔧 API Endpunkte</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;">
        <button class="api-btn" data-method="GET" data-url="/api/pipeline/assets">GET /pipeline/assets</button>
        <button class="api-btn" data-method="GET" data-url="/api/pipeline/tripo/balance">GET /tripo/balance</button>
        <button class="api-btn" data-method="GET" data-url="/api/asset-brain/my-specs">GET /asset-brain/my-specs</button>
        <button class="api-btn" data-method="GET" data-url="/api/asset-brain/library">GET /asset-brain/library</button>
      </div>
      <div id="api-response" style="margin-top:8px;background:#050508;padding:10px;border-radius:6px;font-size:10px;color:#8af;max-height:120px;overflow-y:auto;display:none;border:1px solid #1a1a2a;"></div>
    </div>
  `;

  document.body.appendChild(panel);
  bindEvents();
  loadJobs();
}

function bindEvents() {
  if (!panel) return;

  panel.querySelector('#btn-close-pipeline')!.addEventListener('click', () => toggleAssetPipelinePanel());

  panel.querySelector('#btn-generate-full')!.addEventListener('click', () => {
    const input = (panel!.querySelector('#inp-asset-name') as HTMLInputElement).value.trim();
    if (!input) return;
    const autoRegister = (panel!.querySelector('#chk-auto-register') as HTMLInputElement).checked;
    const generateModel = (panel!.querySelector('#chk-generate-model') as HTMLInputElement).checked;
    startPipeline(input, generateModel, autoRegister);
  });

  panel.querySelector('#btn-spec-only')!.addEventListener('click', () => {
    const input = (panel!.querySelector('#inp-asset-name') as HTMLInputElement).value.trim();
    if (!input) return;
    startPipeline(input, false, false);
  });

  panel.querySelector('#btn-refresh-jobs')!.addEventListener('click', loadJobs);

  panel.querySelectorAll('.api-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const method = (btn as HTMLElement).dataset['method'] ?? 'GET';
      const url = (btn as HTMLElement).dataset['url'] ?? '';
      await callApiEndpoint(method, url);
    });
  });

  // Enter key in input
  (panel.querySelector('#inp-asset-name') as HTMLInputElement).addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      (panel!.querySelector('#btn-generate-full') as HTMLButtonElement).click();
    }
  });
}

async function startPipeline(input: string, generateModel: boolean, autoRegister: boolean) {
  if (!panel) return;

  // Show progress
  const progressSection = panel.querySelector('#pipeline-progress') as HTMLElement;
  progressSection.style.display = 'block';
  updateProgress(0, 'pending', 'Starte Pipeline...');

  try {
    const res = await fetch('/api/pipeline/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, generateModel, autoRegister }),
    });
    const data = await res.json() as { jobId: string };
    activeJobId = data.jobId;

    // Start polling
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(() => pollJob(data.jobId), 2000);
  } catch (err) {
    updateProgress(0, 'failed', `Fehler: ${err}`);
  }
}

async function pollJob(jobId: string) {
  if (!panel) return;

  try {
    const res = await fetch(`/api/pipeline/job/${jobId}`);
    const job = await res.json() as PipelineJob;

    const statusInfo = STATUS_LABELS[job.status] ?? { label: job.status, color: '#aaa', icon: '?' };
    updateProgress(job.progress, job.status, `${statusInfo.icon} ${statusInfo.label}`);

    if (job.status === 'complete') {
      if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
      onJobComplete(job);
    } else if (job.status === 'failed') {
      if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
      updateProgress(0, 'failed', `❌ ${job.error ?? 'Unbekannter Fehler'}`);
    }
  } catch {
    // ignore poll errors
  }
}

function updateProgress(pct: number, status: string, label: string) {
  if (!panel) return;
  const bar = panel.querySelector('#progress-bar') as HTMLElement;
  const labelEl = panel.querySelector('#progress-label') as HTMLElement;
  const pctEl = panel.querySelector('#progress-pct') as HTMLElement;
  const statusInfo = STATUS_LABELS[status] ?? { color: '#aaa' };

  bar.style.width = `${pct}%`;
  bar.style.background = `linear-gradient(90deg, ${statusInfo.color}88, ${statusInfo.color})`;
  labelEl.textContent = label;
  labelEl.style.color = statusInfo.color;
  pctEl.textContent = `${pct}%`;
}

function onJobComplete(job: PipelineJob) {
  if (!panel) return;

  // Show spec
  if (job.specId) {
    loadSpec(job.specId);
  }

  // Show 3D preview if GLB available
  if (job.glbUrl || job.glbLocalPath) {
    const previewSection = panel.querySelector('#model-preview-section') as HTMLElement;
    previewSection.style.display = 'block';

    const glbPath = job.glbLocalPath ?? job.glbUrl ?? '';
    loadThreeJsPreview(glbPath);

    const modelInfo = panel.querySelector('#model-info') as HTMLElement;
    modelInfo.innerHTML = `
      <div style="color:#4f4;margin-bottom:8px;">✅ Modell generiert!</div>
      <div><b>Asset:</b> ${job.input}</div>
      <div><b>Job ID:</b> ${job.jobId.substring(0, 16)}...</div>
      ${job.tripoTaskId ? `<div><b>Tripo Task:</b> ${job.tripoTaskId.substring(0, 16)}...</div>` : ''}
      ${job.registryId ? `<div style="color:#4f4;margin-top:8px;">🎮 Im Spiel registriert!</div><div><b>Registry ID:</b> ${job.registryId}</div>` : ''}
      ${job.glbLocalPath ? `<div style="margin-top:8px;"><b>Pfad:</b> ${job.glbLocalPath}</div>` : ''}
    `;

    // Setup download button
    if (job.glbUrl) {
      const dlBtn = panel.querySelector('#btn-download-glb') as HTMLAnchorElement;
      dlBtn.addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = job.glbUrl!;
        a.download = `${job.input.replace(/\s+/g, '_')}.glb`;
        a.click();
      });
    }
  }

  loadJobs();
}

async function loadSpec(specId: string) {
  if (!panel) return;
  try {
    const res = await fetch(`/api/asset-brain/specs/${specId}`);
    const data = await res.json() as { spec?: unknown };
    const specSection = panel.querySelector('#spec-section') as HTMLElement;
    specSection.style.display = 'block';
    (panel.querySelector('#spec-json') as HTMLElement).textContent =
      JSON.stringify(data.spec ?? data, null, 2);
  } catch { /* ignore */ }
}

async function loadJobs() {
  if (!panel) return;
  try {
    const res = await fetch('/api/pipeline/jobs');
    const data = await res.json() as { jobs: PipelineJob[] };
    const list = panel.querySelector('#jobs-list') as HTMLElement;

    if (!data.jobs?.length) {
      list.innerHTML = '<div style="color:#444;font-style:italic;">Noch keine Jobs</div>';
      return;
    }

    list.innerHTML = data.jobs.slice(0, 10).map((job) => {
      const statusInfo = STATUS_LABELS[job.status] ?? { label: job.status, color: '#aaa', icon: '?' };
      const time = new Date(job.createdAt).toLocaleTimeString('de-DE');
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;margin-bottom:4px;background:#0d0d1a;border-radius:4px;border:1px solid #1a1a2a;cursor:pointer;"
             onclick="window.pipelineSelectJob('${job.jobId}')">
          <div>
            <span style="color:#fff;">${job.input}</span>
            <span style="color:#444;margin-left:8px;font-size:10px;">${time}</span>
          </div>
          <div style="color:${statusInfo.color};">${statusInfo.icon} ${statusInfo.label}</div>
        </div>
      `;
    }).join('');
  } catch { /* ignore */ }
}

async function callApiEndpoint(method: string, url: string) {
  if (!panel) return;
  const responseEl = panel.querySelector('#api-response') as HTMLElement;
  responseEl.style.display = 'block';
  responseEl.textContent = `${method} ${url} ...`;

  try {
    const res = await fetch(url, { method });
    const data = await res.json();
    responseEl.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    responseEl.textContent = `Fehler: ${err}`;
  }
}

function loadThreeJsPreview(glbPath: string) {
  if (!panel) return;
  const canvas = panel.querySelector('#three-canvas') as HTMLCanvasElement;

  // Dynamic import of Three.js
  import('three').then(async (THREE) => {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(280, 200);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a14);

    const camera = new THREE.PerspectiveCamera(45, 280 / 200, 0.1, 100);
    camera.position.set(0, 1.5, 3);

    // Lighting
    scene.add(new THREE.AmbientLight(0x404080, 2));
    const dirLight = new THREE.DirectionalLight(0x7af0ff, 3);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2;

    // Load GLB
    const loader = new GLTFLoader();
    loader.load(
      glbPath,
      (gltf) => {
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        gltf.scene.position.sub(center);
        camera.position.set(0, maxDim * 0.5, maxDim * 2);
        controls.target.set(0, 0, 0);
        scene.add(gltf.scene);
      },
      undefined,
      (err) => console.warn('GLB load error:', err)
    );

    // Render loop
    const animate = () => {
      if (!panel) return; // Stop if panel closed
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
  }).catch((err) => {
    console.warn('Three.js not available for preview:', err);
    const canvas = panel!.querySelector('#three-canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(0, 0, 280, 200);
      ctx.fillStyle = '#7af';
      ctx.font = '12px monospace';
      ctx.fillText('GLB generiert ✓', 80, 100);
      ctx.fillStyle = '#556';
      ctx.font = '10px monospace';
      ctx.fillText('Three.js Preview nicht verfügbar', 40, 120);
    }
  });
}

// Global callback for job selection
(window as any).pipelineSelectJob = async (jobId: string) => {
  if (!panel) return;
  activeJobId = jobId;
  const res = await fetch(`/api/pipeline/job/${jobId}`);
  const job = await res.json() as PipelineJob;
  if (job.status === 'complete') onJobComplete(job);
};
