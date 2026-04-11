# Multi-Style Parallel Image Editing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable multi-style selection in Edit Image and Imagineer I2I modals, generating all selected styles in parallel with progressive results display.

**Architecture:** Frontend-only changes. StyleGrid already supports `multiple` mode. Both modals change their style state from string to array, fire parallel cohesive prompt + generation calls per style, and display results progressively in a grid with click-to-expand lightbox. No backend changes.

**Tech Stack:** React 18, existing StyleGrid component, existing API endpoints (`/api/prompt/build-cohesive`, `/api/images/edit`, `/api/imagineer/edit`, polling endpoints)

**Spec:** `docs/superpowers/specs/2026-03-27-multi-style-parallel-edit-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/components/modals/EditImageModal.jsx` | Multi-select style state, parallel dispatch, results grid + lightbox, save guards |
| `src/components/modals/ImagineerModal.jsx` | Same changes for I2I flow |

No new files. No backend changes. `StyleGrid.jsx` already works with `multiple={true}`.

---

### Task 1: EditImageModal — Multi-select style state + parallel dispatch

**Files:**
- Modify: `src/components/modals/EditImageModal.jsx`

- [ ] **Step 1: Change style state from string to array**

In the state declarations (line 147), change:
```javascript
const [style, setStyle] = useState('');
```
to:
```javascript
const [style, setStyle] = useState([]);
```

Add new state for multi-results, lightbox, and mounted ref:
```javascript
const [multiResults, setMultiResults] = useState([]);
const [expandedImage, setExpandedImage] = useState(null);
const mountedRef = useRef(true);
```

In the `useEffect` reset block (line 176), change `setStyle('')` to `setStyle([])` and add `setMultiResults([]); setExpandedImage(null);`.

Add a mount/unmount effect:
```javascript
useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
```

- [ ] **Step 2: Update StyleGrid to use multiple mode**

On line 442, change:
```jsx
<StyleGrid value={style} onChange={setStyle} maxHeight="none" columns="grid-cols-3" />
```
to:
```jsx
<StyleGrid value={style} onChange={setStyle} maxHeight="none" columns="grid-cols-3" multiple />
```

- [ ] **Step 3: Update buildCohesivePrompt to accept a style parameter**

Modify `buildCohesivePrompt` (line 233) to accept an optional `styleOverride` parameter:

```javascript
const buildCohesivePrompt = async (styleOverride) => {
  const styleKey = styleOverride || '';
  const styleInfo = findStyleByValue(styleKey);
  const styleText = styleInfo?.promptText || styleKey || '';
  // ... rest unchanged
```

- [ ] **Step 4: Replace handleEdit with parallel dispatch**

Replace `handleEdit` (lines 258-298) with a new version that:
1. Validates inputs (same as before)
2. If `style.length === 0`, creates a single result slot with `styleKey: ''`
3. If `style.length >= 1`, creates N result slots from the style array
4. Initializes `multiResults` with all slots at `status: 'prompting'`
5. Fires all generations in parallel

```javascript
const handleEdit = async () => {
  if (images.length === 0) { toast.error('Add at least one image'); return; }
  if (!prompt.trim()) { toast.error('Add edit instructions'); return; }

  const stylesToGenerate = style.length > 0
    ? style.map(s => ({ key: s, label: findStyleByValue(s)?.label || s }))
    : [{ key: '', label: 'No Style' }];

  const initialResults = stylesToGenerate.map(s => ({
    styleKey: s.key, styleLabel: s.label,
    status: 'prompting', imageUrl: null, error: null, saved: false,
  }));
  setMultiResults(initialResults);
  setResultImage(null);
  setIsLoading(true);

  const updateSlot = (index, updates) => {
    if (!mountedRef.current) return;
    setMultiResults(prev => prev.map((r, i) => i === index ? { ...r, ...updates } : r));
  };

  const generateOne = async (styleKey, index) => {
    try {
      const cohesivePrompt = await buildCohesivePrompt(styleKey);
      if (!mountedRef.current) return;
      updateSlot(index, { status: 'generating' });

      const baseImage = images.find(img => img.isBase) || images[0];

      if (isWavespeed) {
        const response = await apiFetch('/api/images/edit', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: images.map(img => img.url), prompt: cohesivePrompt, model, outputSize }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Edit failed');
        if (data.imageUrl) {
          updateSlot(index, { status: 'completed', imageUrl: data.imageUrl });
        } else if (data.requestId) {
          updateSlot(index, { status: 'polling' });
          const url = await pollForResultAsync(data.requestId, 'wavespeed');
          updateSlot(index, { status: 'completed', imageUrl: url });
        }
      } else {
        const loraPayload = loras.filter(l => l.url).map(l => ({ url: l.url, scale: l.scale }));
        const response = await apiFetch('/api/imagineer/edit', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: baseImage.url, prompt: cohesivePrompt, model, strength, dimensions, loras: loraPayload }),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Edit failed');
        if (data.imageUrl) {
          updateSlot(index, { status: 'completed', imageUrl: data.imageUrl });
        } else if (data.requestId) {
          updateSlot(index, { status: 'polling' });
          const url = await pollForResultAsync(data.requestId, 'fal', data.model || model);
          updateSlot(index, { status: 'completed', imageUrl: url });
        }
      }
    } catch (error) {
      updateSlot(index, { status: 'failed', error: error.message });
    }
  };

  await Promise.allSettled(stylesToGenerate.map((s, i) => generateOne(s.key, i)));
  if (mountedRef.current) setIsLoading(false);
};
```

- [ ] **Step 5: Add promise-based polling function**

Add `pollForResultAsync` that returns a URL (instead of setting state directly). This replaces the old `pollForResult`:

```javascript
const pollForResultAsync = (requestId, backend, falModel) => {
  return new Promise((resolve, reject) => {
    const endpoint = backend === 'fal' ? '/api/imagineer/result' : '/api/jumpstart/result';
    let attempts = 0;
    const poll = async () => {
      if (!mountedRef.current) { reject(new Error('Unmounted')); return; }
      try {
        const body = backend === 'fal' ? { requestId, model: falModel } : { requestId };
        const response = await apiFetch(endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await response.json();
        if (data.status === 'completed' && (data.imageUrl || data.videoUrl)) {
          resolve(data.imageUrl || data.videoUrl);
        } else if (data.status === 'failed') {
          reject(new Error(data.error || 'Edit failed'));
        } else if (++attempts >= 120) {
          reject(new Error('Polling timeout'));
        } else {
          setTimeout(poll, 3000);
        }
      } catch (error) { reject(error); }
    };
    poll();
  });
};
```

Remove the old `pollForResult` function (lines 300-321).

- [ ] **Step 6: Update summary on Step 3 to show style count**

In the summary section (line 612), change the style display from:
```jsx
{style && <div><span className="text-slate-400">Style:</span> <span className="font-medium">{style}</span></div>}
```
to:
```jsx
{style.length > 0 && <div><span className="text-slate-400">Styles:</span> <span className="font-medium">{style.length} selected</span></div>}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/modals/EditImageModal.jsx
git commit -m "feat(edit-image): multi-style parallel dispatch with promise-based polling"
```

---

### Task 2: EditImageModal — Progressive results grid + lightbox

**Files:**
- Modify: `src/components/modals/EditImageModal.jsx`

- [ ] **Step 1: Replace the single-result view with multi-results grid**

Replace the result view block (lines 331-356, the `{resultImage && (...)}` block) with a new block that shows when `multiResults.length > 0`:

```jsx
{multiResults.length > 0 && (
  <div className="p-5 space-y-4">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="text-sm font-medium text-slate-700">
        {(() => {
          const completed = multiResults.filter(r => r.status === 'completed').length;
          const total = multiResults.length;
          return completed === total
            ? <span className="text-green-600">All {total} images complete</span>
            : <span>Generating... {completed}/{total} complete</span>;
        })()}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => { setMultiResults([]); setIsLoading(false); }}>
          <ChevronLeft className="w-3 h-3 mr-1" /> Back to Editor
        </Button>
        {multiResults.some(r => r.status === 'completed' && !r.saved) && (
          <Button size="sm" className="bg-[#2C666E] hover:bg-[#07393C] text-white" onClick={handleSaveAll}>
            <FolderOpen className="w-3 h-3 mr-1" /> Save All
          </Button>
        )}
      </div>
    </div>

    {/* Results Grid */}
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {multiResults.map((result, index) => (
        <div key={result.styleKey || index} className="rounded-xl border border-slate-200 overflow-hidden bg-white">
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100">
            <span className="text-xs font-medium text-slate-600">{result.styleLabel}</span>
          </div>
          <div className="aspect-square relative">
            {(result.status === 'prompting' || result.status === 'generating' || result.status === 'polling') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <span className="text-xs capitalize">{result.status}...</span>
              </div>
            )}
            {result.status === 'completed' && result.imageUrl && (
              <img src={result.imageUrl} alt={result.styleLabel}
                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setExpandedImage(result)} />
            )}
            {result.status === 'failed' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-500 p-4">
                <AlertCircle className="w-6 h-6 mb-2" />
                <span className="text-xs text-center mb-2">{result.error || 'Failed'}</span>
                <Button size="sm" variant="outline" onClick={() => handleRetry(index)}>Retry</Button>
              </div>
            )}
          </div>
          {result.status === 'completed' && (
            <div className="flex gap-1.5 p-2 border-t border-slate-100">
              <Button size="sm" variant="outline" className="flex-1 text-xs h-7"
                disabled={result.saved}
                onClick={() => handleSaveOne(index)}>
                {result.saved ? <><CheckCircle2 className="w-3 h-3 mr-1" /> Saved</> : <><FolderOpen className="w-3 h-3 mr-1" /> Save</>}
              </Button>
              <Button size="sm" className="flex-1 text-xs h-7 bg-[#2C666E] hover:bg-[#07393C] text-white"
                onClick={() => { if (onImageEdited) onImageEdited(result.imageUrl); onClose(); }}>
                Use
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 2: Add save handlers**

Add `handleSaveOne`, `handleSaveAll`, and `handleRetry`:

```javascript
const handleSaveOne = async (index) => {
  const result = multiResults[index];
  if (!result || result.saved || !result.imageUrl) return;
  setMultiResults(prev => prev.map((r, i) => i === index ? { ...r, saved: true } : r));
  try {
    await apiFetch('/api/library/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: result.imageUrl, type: 'image', title: `Edited Image — ${result.styleLabel}`, source: 'editimage' }),
    });
  } catch {
    setMultiResults(prev => prev.map((r, i) => i === index ? { ...r, saved: false } : r));
  }
};

const handleSaveAll = async () => {
  const unsaved = multiResults
    .map((r, i) => ({ ...r, index: i }))
    .filter(r => r.status === 'completed' && !r.saved && r.imageUrl);
  // Mark all as saved optimistically
  setMultiResults(prev => prev.map(r =>
    r.status === 'completed' && !r.saved && r.imageUrl ? { ...r, saved: true } : r
  ));
  for (const item of unsaved) {
    try {
      await apiFetch('/api/library/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.imageUrl, type: 'image', title: `Edited Image — ${item.styleLabel}`, source: 'editimage' }),
      });
    } catch {
      setMultiResults(prev => prev.map((r, i) => i === item.index ? { ...r, saved: false } : r));
    }
  }
};

const handleRetry = async (index) => {
  const result = multiResults[index];
  if (!result) return;
  setMultiResults(prev => prev.map((r, i) => i === index
    ? { ...r, status: 'prompting', imageUrl: null, error: null } : r));

  const updateSlot = (updates) => {
    if (!mountedRef.current) return;
    setMultiResults(prev => prev.map((r, i) => i === index ? { ...r, ...updates } : r));
  };

  try {
    const cohesivePrompt = await buildCohesivePrompt(result.styleKey);
    if (!mountedRef.current) return;
    updateSlot({ status: 'generating' });
    const baseImage = images.find(img => img.isBase) || images[0];

    if (isWavespeed) {
      const response = await apiFetch('/api/images/edit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: images.map(img => img.url), prompt: cohesivePrompt, model, outputSize }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Edit failed');
      if (data.imageUrl) { updateSlot({ status: 'completed', imageUrl: data.imageUrl }); }
      else if (data.requestId) {
        updateSlot({ status: 'polling' });
        const url = await pollForResultAsync(data.requestId, 'wavespeed');
        updateSlot({ status: 'completed', imageUrl: url });
      }
    } else {
      const loraPayload = loras.filter(l => l.url).map(l => ({ url: l.url, scale: l.scale }));
      const response = await apiFetch('/api/imagineer/edit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: baseImage.url, prompt: cohesivePrompt, model, strength, dimensions, loras: loraPayload }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Edit failed');
      if (data.imageUrl) { updateSlot({ status: 'completed', imageUrl: data.imageUrl }); }
      else if (data.requestId) {
        updateSlot({ status: 'polling' });
        const url = await pollForResultAsync(data.requestId, 'fal', data.model || model);
        updateSlot({ status: 'completed', imageUrl: url });
      }
    }
  } catch (error) {
    updateSlot({ status: 'failed', error: error.message });
  }
};
```

- [ ] **Step 3: Add lightbox overlay**

Add the lightbox component before the closing `</div>` of the content block (before line 664):

```jsx
{/* Lightbox */}
{expandedImage && (
  <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-8"
    onClick={() => setExpandedImage(null)}
    onKeyDown={(e) => e.key === 'Escape' && setExpandedImage(null)}>
    <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setExpandedImage(null)}
        className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-slate-100">
        <X className="w-4 h-4" />
      </button>
      <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
        <div className="px-4 py-2 bg-slate-50 border-b">
          <span className="text-sm font-medium text-slate-700">{expandedImage.styleLabel}</span>
        </div>
        <img src={expandedImage.imageUrl} alt={expandedImage.styleLabel}
          className="max-w-[85vw] max-h-[80vh] object-contain" />
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: Update footer visibility**

The footer currently shows when `!resultImage` (line 633). Change to also hide when multiResults are showing:

```jsx
{!resultImage && multiResults.length === 0 && (
```

- [ ] **Step 5: Update step visibility guards**

Each step currently checks `!resultImage`. Add `&& multiResults.length === 0` to each:

- Line 359 (Step 0): `{step === 0 && !resultImage && multiResults.length === 0 && (`
- Line 417 (Step 1): `{step === 1 && !resultImage && multiResults.length === 0 && (`
- Line 449 (Step 2): `{step === 2 && !resultImage && multiResults.length === 0 && (`
- Line 511 (Step 3): `{step === 3 && !resultImage && multiResults.length === 0 && (`

- [ ] **Step 6: Commit**

```bash
git add src/components/modals/EditImageModal.jsx
git commit -m "feat(edit-image): progressive results grid with lightbox and save guards"
```

---

### Task 3: ImagineerModal — Multi-select style state + parallel dispatch

**Files:**
- Modify: `src/components/modals/ImagineerModal.jsx`

- [ ] **Step 1: Change I2I style state from string to array**

At line 259, change:
```javascript
const [i2iStyle, setI2iStyle] = useState("");
```
to:
```javascript
const [i2iStyle, setI2iStyle] = useState([]);
```

Add new state:
```javascript
const [i2iMultiResults, setI2iMultiResults] = useState([]);
const [i2iExpandedImage, setI2iExpandedImage] = useState(null);
```

Add a mounted ref (if not already present):
```javascript
const mountedRef = useRef(true);
```
And a mount/unmount effect:
```javascript
useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
```

In the reset `useEffect` (line 298), change `setI2iStyle("")` to `setI2iStyle([])` and add `setI2iMultiResults([]); setI2iExpandedImage(null);`.

- [ ] **Step 2: Update StyleGrid to use multiple mode**

At the I2I Step 1 StyleGrid (around line 877), change:
```jsx
<StyleGrid value={i2iStyle} onChange={setI2iStyle} maxHeight="none" columns="grid-cols-3" />
```
to:
```jsx
<StyleGrid value={i2iStyle} onChange={setI2iStyle} maxHeight="none" columns="grid-cols-3" multiple />
```

- [ ] **Step 3: Add promise-based polling functions**

Add `pollForResultAsync` versions that return URLs instead of setting `i2iResultUrl`:

```javascript
const pollJumpstartResultAsync = async (requestId) => {
  for (let i = 0; i < 120; i++) {
    if (!mountedRef.current) throw new Error('Unmounted');
    await new Promise(r => setTimeout(r, 3000));
    const res = await apiFetch('/api/jumpstart/result', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId }),
    });
    const data = await res.json();
    if (data.status === 'completed' && (data.imageUrl || data.videoUrl)) return data.imageUrl || data.videoUrl;
    if (data.status === 'failed') throw new Error(data.error || 'Edit failed');
  }
  throw new Error('Polling timeout');
};

const pollImagineerResultAsync = async (requestId, model) => {
  for (let i = 0; i < 120; i++) {
    if (!mountedRef.current) throw new Error('Unmounted');
    await new Promise(r => setTimeout(r, 3000));
    const res = await apiFetch('/api/imagineer/result', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, model }),
    });
    const data = await res.json();
    if (data.imageUrl) return data.imageUrl;
    if (data.status === 'failed' || data.error) throw new Error(data.error || 'Edit failed');
  }
  throw new Error('Polling timeout');
};
```

- [ ] **Step 4: Replace handleImageEdit with parallel dispatch**

Replace `handleImageEdit` (lines 454-491) with:

```javascript
const handleImageEdit = async () => {
  if (i2iImages.length === 0) { toast.error('Add at least one image'); return; }
  if (!i2iPrompt.trim()) { toast.error('Add edit instructions'); return; }

  const stylesToGenerate = i2iStyle.length > 0
    ? i2iStyle.map(s => ({ key: s, label: findStyleByValue(s)?.label || s }))
    : [{ key: '', label: 'No Style' }];

  const initialResults = stylesToGenerate.map(s => ({
    styleKey: s.key, styleLabel: s.label,
    status: 'prompting', imageUrl: null, error: null, saved: false,
  }));
  setI2iMultiResults(initialResults);
  setI2iResultUrl('');
  setI2iEditing(true);

  const updateSlot = (index, updates) => {
    if (!mountedRef.current) return;
    setI2iMultiResults(prev => prev.map((r, i) => i === index ? { ...r, ...updates } : r));
  };

  const generateOne = async (styleKey, index) => {
    try {
      const cohesivePrompt = await buildCohesivePrompt('edit', {
        description: i2iPrompt.trim(), style: styleKey,
        props: i2iProps, negPills: i2iNegPills, negFreetext: i2iNegFreetext,
        brand: i2iBrand, editStrength: i2iStrength,
      });
      if (!mountedRef.current) return;
      updateSlot(index, { status: 'generating' });

      const baseImage = i2iImages.find(img => img.isBase) || i2iImages[0];
      const isWavespeedModel = i2iModel.startsWith('wavespeed-');

      if (isWavespeedModel) {
        const res = await apiFetch('/api/images/edit', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: i2iImages.map(img => img.url), prompt: cohesivePrompt, model: i2iModel, outputSize: i2iOutputSize }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Edit failed');
        if (data.imageUrl) { updateSlot(index, { status: 'completed', imageUrl: data.imageUrl }); }
        else if (data.requestId) {
          updateSlot(index, { status: 'polling' });
          const url = await pollJumpstartResultAsync(data.requestId);
          updateSlot(index, { status: 'completed', imageUrl: url });
        }
      } else {
        const loraPayload = i2iLoras.filter(l => l.url).map(l => ({ url: l.url, scale: l.scale }));
        const allUrls = i2iImages.map(img => img.url);
        const isMultiImage = I2I_MODELS.find(m => m.value === i2iModel)?.multiImage;
        const res = await apiFetch('/api/imagineer/edit', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: baseImage.url,
            image_urls: isMultiImage ? allUrls : undefined,
            prompt: cohesivePrompt, model: i2iModel,
            strength: i2iStrength, dimensions: i2iDimensions, loras: loraPayload,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Edit failed');
        if (data.imageUrl) { updateSlot(index, { status: 'completed', imageUrl: data.imageUrl }); }
        else if (data.requestId) {
          updateSlot(index, { status: 'polling' });
          const url = await pollImagineerResultAsync(data.requestId, data.model || i2iModel);
          updateSlot(index, { status: 'completed', imageUrl: url });
        }
      }
    } catch (error) {
      updateSlot(index, { status: 'failed', error: error.message });
    }
  };

  await Promise.allSettled(stylesToGenerate.map((s, i) => generateOne(s.key, i)));
  if (mountedRef.current) setI2iEditing(false);
};
```

- [ ] **Step 5: Update summary on Step 3 to show style count**

At line 977, change:
```jsx
{i2iStyle && <div><span className="text-slate-400">Style:</span> <span className="font-medium">{i2iStyle}</span></div>}
```
to:
```jsx
{i2iStyle.length > 0 && <div><span className="text-slate-400">Styles:</span> <span className="font-medium">{i2iStyle.length} selected</span></div>}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/modals/ImagineerModal.jsx
git commit -m "feat(imagineer): multi-style parallel dispatch for I2I editing"
```

---

### Task 4: ImagineerModal — Progressive results grid + lightbox

**Files:**
- Modify: `src/components/modals/ImagineerModal.jsx`

- [ ] **Step 1: Add save handlers**

Add `handleI2iSaveOne`, `handleI2iSaveAll`, and `handleI2iRetry` — same pattern as EditImageModal but using `i2iMultiResults`/`setI2iMultiResults` and `source: 'imagineer-i2i'`.

```javascript
const handleI2iSaveOne = async (index) => {
  const result = i2iMultiResults[index];
  if (!result || result.saved || !result.imageUrl) return;
  setI2iMultiResults(prev => prev.map((r, i) => i === index ? { ...r, saved: true } : r));
  try {
    await apiFetch('/api/library/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: result.imageUrl, type: 'image', title: `[Imagineer] ${result.styleLabel}`, source: 'imagineer-i2i' }),
    });
  } catch {
    setI2iMultiResults(prev => prev.map((r, i) => i === index ? { ...r, saved: false } : r));
  }
};

const handleI2iSaveAll = async () => {
  const unsaved = i2iMultiResults
    .map((r, i) => ({ ...r, index: i }))
    .filter(r => r.status === 'completed' && !r.saved && r.imageUrl);
  setI2iMultiResults(prev => prev.map(r =>
    r.status === 'completed' && !r.saved && r.imageUrl ? { ...r, saved: true } : r
  ));
  for (const item of unsaved) {
    try {
      await apiFetch('/api/library/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.imageUrl, type: 'image', title: `[Imagineer] ${item.styleLabel}`, source: 'imagineer-i2i' }),
      });
    } catch {
      setI2iMultiResults(prev => prev.map((r, i) => i === item.index ? { ...r, saved: false } : r));
    }
  }
};
```

`handleI2iRetry` follows the same pattern as `handleRetry` in EditImageModal but uses the Imagineer-specific state and API routing.

- [ ] **Step 2: Replace I2I result view with multi-results grid**

Replace the I2I result view block (lines 780-793, the `{mode === "i2i" && i2iResultUrl && (...)}` block) with:

```jsx
{mode === "i2i" && i2iMultiResults.length > 0 && (
  <div className="p-5 space-y-4">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="text-sm font-medium text-slate-700">
        {(() => {
          const completed = i2iMultiResults.filter(r => r.status === 'completed').length;
          const total = i2iMultiResults.length;
          return completed === total
            ? <span className="text-green-600">All {total} images complete</span>
            : <span>Generating... {completed}/{total} complete</span>;
        })()}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => { setI2iMultiResults([]); setI2iEditing(false); }}>
          <ChevronLeft className="w-3 h-3 mr-1" /> Back to Editor
        </Button>
        {i2iMultiResults.some(r => r.status === 'completed' && !r.saved) && (
          <Button size="sm" className="bg-[#2C666E] hover:bg-[#07393C] text-white" onClick={handleI2iSaveAll}>
            <FolderOpen className="w-3 h-3 mr-1" /> Save All
          </Button>
        )}
      </div>
    </div>

    {/* Results Grid — same structure as EditImageModal */}
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {i2iMultiResults.map((result, index) => (
        <div key={result.styleKey || index} className="rounded-xl border border-slate-200 overflow-hidden bg-white">
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100">
            <span className="text-xs font-medium text-slate-600">{result.styleLabel}</span>
          </div>
          <div className="aspect-square relative">
            {['prompting', 'generating', 'polling'].includes(result.status) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <span className="text-xs capitalize">{result.status}...</span>
              </div>
            )}
            {result.status === 'completed' && result.imageUrl && (
              <img src={result.imageUrl} alt={result.styleLabel}
                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setI2iExpandedImage(result)} />
            )}
            {result.status === 'failed' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-500 p-4">
                <AlertCircle className="w-6 h-6 mb-2" />
                <span className="text-xs text-center mb-2">{result.error || 'Failed'}</span>
                <Button size="sm" variant="outline" onClick={() => handleI2iRetry(index)}>Retry</Button>
              </div>
            )}
          </div>
          {result.status === 'completed' && (
            <div className="flex gap-1.5 p-2 border-t border-slate-100">
              <Button size="sm" variant="outline" className="flex-1 text-xs h-7"
                disabled={result.saved}
                onClick={() => handleI2iSaveOne(index)}>
                {result.saved ? <><CheckCircle2 className="w-3 h-3 mr-1" /> Saved</> : <><FolderOpen className="w-3 h-3 mr-1" /> Save</>}
              </Button>
              <Button size="sm" className="flex-1 text-xs h-7 bg-[#2C666E] hover:bg-[#07393C] text-white"
                onClick={() => { setI2iResultUrl(result.imageUrl); setI2iMultiResults([]); }}>
                Use
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
)}
```

Note: The **Use** button sets `i2iResultUrl` and clears multiResults, which triggers the existing single-result `ResultActions` view with its Inpaint/Turnaround/Storyboard action buttons.

- [ ] **Step 3: Add lightbox overlay**

Add the same lightbox pattern, using `i2iExpandedImage` state. Place it inside the modal's JSX, near the end of the I2I content area:

```jsx
{i2iExpandedImage && (
  <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-8"
    onClick={() => setI2iExpandedImage(null)}
    onKeyDown={(e) => e.key === 'Escape' && setI2iExpandedImage(null)}>
    <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setI2iExpandedImage(null)}
        className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-slate-100">
        <X className="w-4 h-4" />
      </button>
      <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
        <div className="px-4 py-2 bg-slate-50 border-b">
          <span className="text-sm font-medium text-slate-700">{i2iExpandedImage.styleLabel}</span>
        </div>
        <img src={i2iExpandedImage.imageUrl} alt={i2iExpandedImage.styleLabel}
          className="max-w-[85vw] max-h-[80vh] object-contain" />
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: Update step visibility guards**

Add `&& i2iMultiResults.length === 0` to each I2I step's visibility condition so steps hide when results are showing. The conditions are:

- I2I Step 0: `mode === "i2i" && step === 0 && !i2iResultUrl && i2iMultiResults.length === 0`
- I2I Step 1: `mode === "i2i" && step === 1 && !i2iResultUrl && i2iMultiResults.length === 0`
- I2I Step 2: `mode === "i2i" && step === 2 && !i2iResultUrl && i2iMultiResults.length === 0`
- I2I Step 3: `mode === "i2i" && step === 3 && !i2iResultUrl && i2iMultiResults.length === 0`

Also update the I2I footer to hide when results are showing.

- [ ] **Step 5: Commit**

```bash
git add src/components/modals/ImagineerModal.jsx
git commit -m "feat(imagineer): progressive results grid with lightbox for I2I multi-style"
```

---

### Task 5: Verify both modals work end-to-end

**Files:** None — verification only

- [ ] **Step 1: Start dev server**

```bash
npm run start
```

- [ ] **Step 2: Test Edit Image modal**

1. Open Stitch Studio at `localhost:4390/studio`
2. Click "Edit Image" in the sidebar
3. Add an image
4. On Step 1, verify StyleGrid shows multi-select (teal borders, checkmarks, count badge)
5. Select 2-3 styles
6. Add edit instructions
7. Skip through to Step 3, verify summary shows "X styles selected"
8. Click "Edit Image" — verify results grid appears with loading spinners
9. As results complete, verify images appear progressively
10. Click an image — verify lightbox opens with full-size view
11. Click Save on one image — verify button changes to "Saved" and is disabled
12. Click "Save All" — verify remaining unsaved images get saved
13. Click "Use" — verify callback fires and modal closes
14. Reopen modal — verify all state is reset

- [ ] **Step 3: Test Imagineer I2I modal**

Same flow but via Imagineer → Image to Image tab:
1. Add image, select multiple styles, add instructions
2. Generate and verify progressive results
3. Click "Use" — verify it shows the single-result `ResultActions` view
4. Test lightbox, Save, Save All, Retry (force a failure by disconnecting network briefly)

- [ ] **Step 4: Test edge cases**

1. No styles selected → generates one image (same as before)
2. Single style selected → generates one image in grid view
3. Close modal during generation → reopen → verify clean state
4. "Back to Editor" → verify inputs preserved, results cleared

- [ ] **Step 5: Commit any fixes**

```bash
git add -A && git commit -m "fix: address issues found during multi-style verification"
```
