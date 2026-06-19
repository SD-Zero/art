// Application State Engine
let canvas, ctx, uiCanvas, uiCtx;
let currentTool = 'brush'; // brush, eraser, transform, lasso
let currentBrushSize = 10;
let currentOpacity = 1.0;
let activeColor = '#000000';
let drawing = false;
let lastCoords = null;
let strokeHasPainted = false;

// Workspace Coordinates & Transforms
let scale = 1.0;
let panX = 0;
let panY = 0;
let rotation = 0;

// Layers Infrastructure
let layers = [];
let activeLayerId = null;
let nextLayerId = 1;

// Undo/Redo Timeline Stacks
let undoStack = [];
let redoStack = [];

// Advanced Alpha Layer Working Caches
let alphaScratchCanvas = document.createElement('canvas');
let alphaScratchCtx = alphaScratchCanvas.getContext('2d');
let alphaBackupCanvas = document.createElement('canvas');
let alphaBackupCtx = alphaBackupCanvas.getContext('2d');

// Speedpaint Recorder Buffers
let speedpaintFrames = [];

// NEW: Lasso & Selection Engines
let selectionPath = null; // Array of points {x, y}
let drawingLasso = false;

// NEW: Transformation States
let isTransforming = false;
let transformCanvas = document.createElement('canvas');
let transformCtx = transformCanvas.getContext('2d');
let transformState = { x: 0, y: 0, scaleX: 1, scaleY: 1, angle: 0 };
let transformDragMode = null; // translate, rotate, scale-tl, scale-tr, scale-bl, scale-br
let startTransformPointer = null;
let initialTransformState = null;

// Initial Default Color Palette
let colorPalette = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#888888', '#444444'];

// DOM Element Registry Updates
const startMenu = document.getElementById('startMenu');
const workspace = document.getElementById('workspace');
const paintCanvas = document.getElementById('paintCanvas');
const mainUiCanvas = document.getElementById('uiCanvas');
const transformContainer = document.getElementById('transformContainer');
const sizeSlider = document.getElementById('sizeSlider');
const sizeHandle = document.getElementById('sizeHandle');
const sizeTrackFill = document.getElementById('sizeTrackFill');
const sizeBubble = document.getElementById('sizeBubble');
const brushPreviewRing = document.getElementById('brushPreviewRing');
const opacSlider = document.getElementById('opacSlider');
const opacHandle = document.getElementById('opacHandle');
const opacTrackFill = document.getElementById('opacTrackFill');
const opacBubble = document.getElementById('opacBubble');
const layerSidebar = document.getElementById('layerSidebar');
const layersList = document.getElementById('layersList');
const colorPanel = document.getElementById('colorPanel');
const colorWheel = document.getElementById('colorWheel');
const hexInput = document.getElementById('hexInput');
const paletteGrid = document.getElementById('paletteGrid');

// Document Core Bootloader Initialize
window.addEventListener('DOMContentLoaded', () => {
    setupStartMenu();
    setupToolButtons();
    setupSliders();
    setupLayersPanel();
    setupColorPanel();
    setupDropdownMenu();
});

function setupStartMenu() {
    const confirmBtn = document.getElementById('confirmBtn');
    const widthInput = document.getElementById('canvasWidth');
    const heightInput = document.getElementById('canvasHeight');
    const fileInput = document.getElementById('fileInput');
    const previewBox = document.getElementById('previewBox');

    const updatePreview = () => {
        let w = parseInt(widthInput.value) || 800;
        let h = parseInt(heightInput.value) || 600;
        let max = 150;
        if (w >= h) {
            previewBox.style.width = max + 'px';
            previewBox.style.height = Math.round((h / w) * max) + 'px';
        } else {
            previewBox.style.height = max + 'px';
            previewBox.style.width = Math.round((w / h) * max) + 'px';
        }
    };
    widthInput.addEventListener('input', updatePreview);
    heightInput.addEventListener('input', updatePreview);
    updatePreview();

    confirmBtn.addEventListener('click', () => {
        initWorkspace(parseInt(widthInput.value) || 800, parseInt(heightInput.value) || 600);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    initWorkspace(img.width, img.height);
                    let baseLayer = layers.find(l => l.id === activeLayerId);
                    if (baseLayer) {
                        baseLayer.ctx.drawImage(img, 0, 0);
                        saveHistoryState();
                        compositeCanvasStack();
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });
}

function initWorkspace(width, height) {
    startMenu.classList.add('hidden');
    workspace.classList.remove('hidden');

    canvas = paintCanvas;
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext('2d');

    uiCanvas = mainUiCanvas;
    uiCanvas.width = width;
    uiCanvas.height = height;
    uiCtx = uiCanvas.getContext('2d');

    alphaScratchCanvas.width = width;
    alphaScratchCanvas.height = height;
    alphaBackupCanvas.width = width;
    alphaBackupCanvas.height = height;

    // Build Default Painting Base Layer
    addNewLayer("Layer 1");
    
    // Position Workspace Engine Centered Dynamically
    panX = (window.innerWidth - width) / 2;
    panY = (window.innerHeight - height) / 2;
    applyTransforms();
    saveHistoryState();
    compositeCanvasStack();
}

function applyTransforms() {
    transformContainer.style.transform = `translate(${panX}px, ${panY}px) scale(${scale}) rotate(${rotation}deg)`;
}

// Global Core Composure Framework Stack Rendering Pipeline
function compositeCanvasStack() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < layers.length; i++) {
        let layer = layers[i];
        if (!layer.visible) continue;

        ctx.save();
        ctx.globalAlpha = layer.opacity;
        ctx.globalCompositeOperation = layer.blendMode;

        if (layer.clipping && i > 0) {
            // Find base mask sequence geometry path
            let maskBaseIndex = i - 1;
            while (maskBaseIndex > 0 && layers[maskBaseIndex].clipping) {
                maskBaseIndex--;
            }
            let maskLayer = layers[maskBaseIndex];
            
            // Build temporary offscreen composite stack boundary map execution
            let clipBuffer = document.createElement('canvas');
            clipBuffer.width = canvas.width;
            clipBuffer.height = canvas.height;
            let clipCtx = clipBuffer.getContext('2d');
            
            clipCtx.drawImage(maskLayer.canvas, 0, 0);
            clipCtx.globalCompositeOperation = 'source-in';
            clipCtx.drawImage(layer.canvas, 0, 0);
            
            ctx.drawImage(clipBuffer, 0, 0);
        } else {
            // If this layer is currently active and being transformed, do not render its static data
            if (isTransforming && layer.id === activeLayerId) {
                // Skips rendering static downlayer to keep tracking fluid
            } else {
                ctx.drawImage(layer.canvas, 0, 0);
            }
        }
        ctx.restore();
    }

    // Render active dynamic transformations on top dynamically inside composition view loop
    if (isTransforming) {
        ctx.save();
        ctx.translate(transformState.x, transformState.y);
        ctx.rotate(transformState.angle * Math.PI / 180);
        ctx.scale(transformState.scaleX, transformState.scaleY);
        ctx.drawImage(transformCanvas, -transformCanvas.width / 2, -transformCanvas.height / 2);
        ctx.restore();
    }

    renderUIOverlay();
}

// Dedicated UI Element System (Lasso Ant Lines and Transform Handles)
function renderUIOverlay() {
    if (!uiCtx) return;
    uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);

    // Render Lasso Path Outlines if active
    if (selectionPath && selectionPath.length > 1) {
        uiCtx.save();
        uiCtx.strokeStyle = '#007acc';
        uiCtx.lineWidth = 2 / scale;
        uiCtx.setLineDash([6 / scale, 4 / scale]);
        uiCtx.beginPath();
        uiCtx.moveTo(selectionPath[0].x, selectionPath[0].y);
        for (let i = 1; i < selectionPath.length; i++) {
            uiCtx.lineTo(selectionPath[i].x, selectionPath[i].y);
        }
        uiCtx.closePath();
        uiCtx.stroke();
        uiCtx.restore();
    }

    // Render Transformation UI Control Nodes
    if (isTransforming) {
        uiCtx.save();
        uiCtx.translate(transformState.x, transformState.y);
        uiCtx.rotate(transformState.angle * Math.PI / 180);

        const w = transformCanvas.width;
        const h = transformCanvas.height;

        // Bounding Box Frame
        uiCtx.strokeStyle = '#007acc';
        uiCtx.lineWidth = 2 / scale;
        uiCtx.strokeRect(-w / 2, -h / 2, w, h);

        // Resize Corners Node Elements
        uiCtx.fillStyle = '#ffffff';
        uiCtx.strokeStyle = '#007acc';
        const hSize = 10 / scale;

        const handles = [
            { x: -w / 2, y: -h / 2 }, // Top-Left
            { x: w / 2, y: -h / 2 },  // Top-Right
            { x: -w / 2, y: h / 2 },  // Bottom-Left
            { x: w / 2, y: h / 2 }   // Bottom-Right
        ];

        handles.forEach(pos => {
            uiCtx.fillRect(pos.x - hSize / 2, pos.y - hSize / 2, hSize, hSize);
            uiCtx.strokeRect(pos.x - hSize / 2, pos.y - hSize / 2, hSize, hSize);
        });

        // Rotation Node Circle Arm Element
        const rArm = 30 / scale;
        const rSize = 6 / scale;
        uiCtx.beginPath();
        uiCtx.moveTo(0, -h / 2);
        uiCtx.lineTo(0, -h / 2 - rArm);
        uiCtx.stroke();

        uiCtx.beginPath();
        uiCtx.arc(0, -h / 2 - rArm, rSize, 0, Math.PI * 2);
        uiCtx.fill();
        uiCtx.stroke();

        uiCtx.restore();
    }
}

// Setup Painting & Engineering Tool Controllers
function setupToolButtons() {
    const tools = [
        { id: 'brushBtn', name: 'brush' },
        { id: 'eraserBtn', name: 'eraser' },
        { id: 'transformBtn', name: 'transform' },
        { id: 'lassoBtn', name: 'lasso' }
    ];

    tools.forEach(t => {
        document.getElementById(t.id).addEventListener('click', () => {
            if (currentTool === 'transform' && t.name !== 'transform') {
                bakeTransformation();
            }
            
            tools.forEach(o => document.getElementById(o.id).classList.remove('active'));
            document.getElementById(t.id).classList.add('active');
            currentTool = t.name;

            if (currentTool === 'transform') {
                initiateTransformationMode();
            }
            compositeCanvasStack();
        });
    });

    document.getElementById('undoBtn').addEventListener('click', triggerUndo);
    document.getElementById('redoBtn').addEventListener('click', triggerRedo);

    // Interactive Core Drawing Coordinates Mapper Hooks
    canvas.addEventListener('pointerdown', startStrokeAction);
    canvas.addEventListener('pointermove', performStrokeAction);
    window.addEventListener('pointerup', stopDrawingStrokeAction);
}

function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    // Recompute accurately taking Matrix CSS Scale and Panning elements inside account parameters
    const matrix = new DOMMatrix(getComputedStyle(transformContainer).transform);
    
    // Invert point back into normal transformation container bounds coordinates spaces natively
    let pt = new DOMPoint(e.clientX, e.clientY);
    let invMatrix = matrix.inverse();
    let transformedPt = pt.matrixTransform(invMatrix);
    
    return { x: transformedPt.x, y: transformedPt.y };
}

// Core Brush and Custom Selection Operations Mapping Execution Logic Paths
function startStrokeAction(e) {
    if (activePointers.length >= 2) return;
    
    const coords = getCanvasCoordinates(e);

    if (currentTool === 'lasso') {
        drawingLasso = true;
        selectionPath = [coords];
        compositeCanvasStack();
        return;
    }

    if (currentTool === 'transform') {
        if (evaluateTransformHitTesting(coords)) {
            e.stopPropagation();
            return;
        }
    }

    if (currentTool === 'brush' || currentTool === 'eraser') {
        const activeLayer = layers.find(l => l.id === activeLayerId);
        if (!activeLayer || !activeLayer.visible) return;

        drawing = true;
        lastCoords = coords;
        strokeHasPainted = false;

        if (activeLayer.alphaLock) {
            alphaScratchCtx.clearRect(0, 0, canvas.width, canvas.height);
            alphaScratchCtx.drawImage(activeLayer.canvas, 0, 0);
            alphaBackupCanvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
            alphaBackupCanvas.getContext('2d').drawImage(activeLayer.canvas, 0, 0);
        }
        drawStroke(e);
    }
}

function performStrokeAction(e) {
    if (currentTool === 'lasso' && drawingLasso) {
        const coords = getCanvasCoordinates(e);
        selectionPath.push(coords);
        compositeCanvasStack();
        return;
    }

    if (currentTool === 'transform' && transformDragMode) {
        executeTransformationCalculations(getCanvasCoordinates(e));
        compositeCanvasStack();
        return;
    }

    if (drawing) {
        drawStroke(e);
    }
}

function stopDrawingStrokeAction(e) {
    if (currentTool === 'lasso' && drawingLasso) {
        drawingLasso = false;
        if (selectionPath && selectionPath.length < 3) {
            selectionPath = null;
        }
        compositeCanvasStack();
        return;
    }

    if (currentTool === 'transform' && transformDragMode) {
        transformDragMode = null;
        saveHistoryState();
        return;
    }

    if (drawing) {
        drawing = false;
        lastCoords = null;
        if (strokeHasPainted) {
            if (currentTool === 'brush') commitColorToPalette(activeColor);
            saveHistoryState();
        }
        updateLayersUI();
    }
}

function drawStroke(e) {
    if (!drawing || activePointers.length >= 2 || !lastCoords) return;
    
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer) return;

    strokeHasPainted = true;
    const coords = getCanvasCoordinates(e);
    
    if (activeLayer.alphaLock) {
        alphaScratchCtx.save();
        
        // Apply selection path boundary clip constraints if mapped inside vector selection space
        if (selectionPath && selectionPath.length >= 3) {
            alphaScratchCtx.beginPath();
            alphaScratchCtx.moveTo(selectionPath[0].x, selectionPath[0].y);
            for (let i = 1; i < selectionPath.length; i++) {
                alphaScratchCtx.lineTo(selectionPath[i].x, selectionPath[i].y);
            }
            alphaScratchCtx.closePath();
            alphaScratchCtx.clip();
        }

        alphaScratchCtx.lineWidth = currentBrushSize;
        alphaScratchCtx.lineCap = 'round';
        alphaScratchCtx.lineJoin = 'round';
        alphaScratchCtx.globalAlpha = currentOpacity;
        
        if (currentTool === 'eraser') {
            alphaScratchCtx.globalCompositeOperation = 'destination-out';
            alphaScratchCtx.strokeStyle = 'rgba(0,0,0,1.0)';
            alphaScratchCtx.beginPath();
            alphaScratchCtx.moveTo(lastCoords.x, lastCoords.y);
            alphaScratchCtx.lineTo(coords.x, coords.y);
            alphaScratchCtx.stroke();
            
            alphaScratchCtx.globalCompositeOperation = 'destination-over';
            alphaScratchCtx.drawImage(alphaBackupCanvas, 0, 0);
        } else {
            alphaScratchCtx.globalCompositeOperation = 'source-over';
            alphaScratchCtx.strokeStyle = activeColor;
            alphaScratchCtx.beginPath();
            alphaScratchCtx.moveTo(lastCoords.x, lastCoords.y);
            alphaScratchCtx.lineTo(coords.x, coords.y);
            alphaScratchCtx.stroke();
        }
        alphaScratchCtx.restore();

        activeLayer.ctx.clearRect(0, 0, canvas.width, canvas.height);
        activeLayer.ctx.drawImage(alphaScratchCanvas, 0, 0);

        activeLayer.ctx.save();
        activeLayer.ctx.globalCompositeOperation = 'destination-in';
        activeLayer.ctx.drawImage(alphaBackupCanvas, 0, 0);
        activeLayer.ctx.restore();
    } else {
        // Standard Drawing Logic Sequence Path Routing
        activeLayer.ctx.save();
        
        // Apply Lasso Selection Clip Boundaries Constraints Matrix Execution Maps
        if (selectionPath && selectionPath.length >= 3) {
            activeLayer.ctx.beginPath();
            activeLayer.ctx.moveTo(selectionPath[0].x, selectionPath[0].y);
            for (let i = 1; i < selectionPath.length; i++) {
                activeLayer.ctx.lineTo(selectionPath[i].x, selectionPath[i].y);
            }
            activeLayer.ctx.closePath();
            activeLayer.ctx.clip();
        }

        activeLayer.ctx.lineWidth = currentBrushSize;
        activeLayer.ctx.lineCap = 'round';
        activeLayer.ctx.lineJoin = 'round';
        activeLayer.ctx.globalAlpha = currentOpacity;

        if (currentTool === 'eraser') {
            activeLayer.ctx.globalCompositeOperation = 'destination-out';
            activeLayer.ctx.strokeStyle = 'rgba(0,0,0,1.0)';
        } else {
            activeLayer.ctx.globalCompositeOperation = 'source-over';
            activeLayer.ctx.strokeStyle = activeColor;
        }

        activeLayer.ctx.beginPath();
        activeLayer.ctx.moveTo(lastCoords.x, lastCoords.y);
        activeLayer.ctx.lineTo(coords.x, coords.y);
        activeLayer.ctx.stroke();
        activeLayer.ctx.restore();
    }
    
    lastCoords = coords;
    compositeCanvasStack();
}

// NEW: Transform Processing Architecture Implementation
function initiateTransformationMode() {
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer) return;

    isTransforming = true;
    
    let minX = 0, minY = 0, maxX = canvas.width, maxY = canvas.height;

    // Evaluate extraction bounds based on whether a lasso selection area exists
    if (selectionPath && selectionPath.length >= 3) {
        minX = Infinity; minY = Infinity; maxX = -Infinity; maxY = -Infinity;
        selectionPath.forEach(pt => {
            if (pt.x < minX) minX = pt.x;
            if (pt.x > maxX) maxX = pt.x;
            if (pt.y < minY) minY = pt.y;
            if (pt.y > maxY) maxY = pt.y;
        });
        minX = Math.max(0, Math.floor(minX));
        maxX = Math.min(canvas.width, Math.ceil(maxX));
        minY = Math.max(0, Math.floor(minY));
        maxY = Math.min(canvas.height, Math.ceil(maxY));
    }

    const w = (maxX - minX) || 1;
    const h = (maxY - minY) || 1;

    transformCanvas.width = w;
    transformCanvas.height = h;
    transformCtx.clearRect(0, 0, w, h);

    // Extract textures into isolation transform canvas layers
    transformCtx.save();
    if (selectionPath && selectionPath.length >= 3) {
        transformCtx.beginPath();
        transformCtx.moveTo(selectionPath[0].x - minX, selectionPath[0].y - minY);
        for (let i = 1; i < selectionPath.length; i++) {
            transformCtx.lineTo(selectionPath[i].x - minX, selectionPath[i].y - minY);
        }
        transformCtx.closePath();
        transformCtx.clip();
    }
    transformCtx.drawImage(activeLayer.canvas, -minX, -minY);
    transformCtx.restore();

    // Clear extracted path contents out from underlying source layer canvas context bounds natively
    activeLayer.ctx.save();
    if (selectionPath && selectionPath.length >= 3) {
        activeLayer.ctx.beginPath();
        activeLayer.ctx.moveTo(selectionPath[0].x, selectionPath[0].y);
        for (let i = 1; i < selectionPath.length; i++) {
            activeLayer.ctx.lineTo(selectionPath[i].x, selectionPath[i].y);
        }
        activeLayer.ctx.closePath();
        activeLayer.ctx.globalCompositeOperation = 'destination-out';
        activeLayer.ctx.fill();
    } else {
        activeLayer.ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    activeLayer.ctx.restore();

    // Set initial transform spatial parameters centered over region coordinates bounds layout maps
    transformState.x = minX + w / 2;
    transformState.y = minY + h / 2;
    transformState.scaleX = 1.0;
    transformState.scaleY = 1.0;
    transformState.angle = 0;
}

function evaluateTransformHitTesting(coords) {
    if (!isTransforming) return false;

    const w = transformCanvas.width;
    const h = transformCanvas.height;

    // Convert coordinates point into transformed object internal local relative coordinates spaces natively
    const dx = coords.x - transformState.x;
    const dy = coords.y - transformState.y;
    const rad = -transformState.angle * Math.PI / 180;
    const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ly = dx * Math.sin(rad) + dy * Math.cos(rad);

    const hitRadius = 15 / scale;

    // Helper functions to find local hit points vectors
    const checkHit = (hx, hy) => Math.hypot(lx - hx, ly - hy) < hitRadius;

    // Check Rotation Handle Handle Circle Target Vector Node
    if (Math.hypot(lx - 0, ly - (-h / 2 - 30 / scale)) < hitRadius) {
        transformDragMode = 'rotate';
    }
    // Check Scaling Corner Node Bounds Mapping Targets Elements
    else if (checkHit(-w / 2, -h / 2)) transformDragMode = 'scale-tl';
    else if (checkHit(w / 2, -h / 2)) transformDragMode = 'scale-tr';
    else if (checkHit(-w / 2, h / 2)) transformDragMode = 'scale-bl';
    else if (checkHit(w / 2, h / 2)) transformDragMode = 'scale-br';
    // Check Translate Center Target Box Drag Vector Space
    else if (lx >= -w / 2 && lx <= w / 2 && ly >= -h / 2 && ly <= h / 2) {
        transformDragMode = 'translate';
    } else {
        transformDragMode = null;
        return false;
    }

    startTransformPointer = { ...coords };
    initialTransformState = { ...transformState };
    return true;
}

function executeTransformationCalculations(coords) {
    if (!transformDragMode) return;

    const rad = transformState.angle * Math.PI / 180;
    const w = transformCanvas.width;
    const h = transformCanvas.height;

    if (transformDragMode === 'translate') {
        const mx = coords.x - startTransformPointer.x;
        const my = coords.y - startTransformPointer.y;
        transformState.x = initialTransformState.x + mx;
        transformState.y = initialTransformState.y + my;
    } 
    else if (transformDragMode === 'rotate') {
        const baseAngle = Math.atan2(startTransformPointer.y - transformState.y, startTransformPointer.x - transformState.x);
        const currAngle = Math.atan2(coords.y - transformState.y, coords.x - transformState.x);
        transformState.angle = initialTransformState.angle + (currAngle - baseAngle) * 180 / Math.PI;
    } 
    else if (transformDragMode.startsWith('scale')) {
        // Map pointer vectors back into local scale offsets frameworks safely
        const cx = coords.x - transformState.x;
        const cy = coords.y - transformState.y;
        const unRotRad = -transformState.angle * Math.PI / 180;
        const lx = cx * Math.cos(unRotRad) - cy * Math.sin(unRotRad);
        const ly = cx * Math.sin(unRotRad) + cy * Math.cos(unRotRad);

        let factorX = 1;
        let factorY = 1;

        if (transformDragMode === 'scale-br') {
            factorX = lx / (w / 2);
            factorY = ly / (h / 2);
        } else if (transformDragMode === 'scale-bl') {
            factorX = lx / (-w / 2);
            factorY = ly / (h / 2);
        } else if (transformDragMode === 'scale-tr') {
            factorX = lx / (w / 2);
            factorY = ly / (-h / 2);
        } else if (transformDragMode === 'scale-tl') {
            factorX = lx / (-w / 2);
            factorY = ly / (-h / 2);
        }

        // Apply clamping scaling parameters elements maps
        transformState.scaleX = Math.max(0.05, initialTransformState.scaleX * factorX);
        transformState.scaleY = Math.max(0.05, initialTransformState.scaleY * factorY);
    }
}

function bakeTransformation() {
    if (!isTransforming) return;
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (activeLayer) {
        activeLayer.ctx.save();
        activeLayer.ctx.translate(transformState.x, transformState.y);
        activeLayer.ctx.rotate(transformState.angle * Math.PI / 180);
        activeLayer.ctx.scale(transformState.scaleX, transformState.scaleY);
        activeLayer.ctx.drawImage(transformCanvas, -transformCanvas.width / 2, -transformCanvas.height / 2);
        activeLayer.ctx.restore();
    }
    isTransforming = false;
    selectionPath = null; // Flush selection boundaries mask out upon committing transform execution natively
    updateLayersUI();
}

// Slider Control Mechanics Framework UI Logic Management Paths
function setupSliders() {
    // Custom Size Vertical Slider Hook Execution Handles
    const syncSizeSlider = (e) => {
        const rect = sizeSlider.getBoundingClientRect();
        let pct = (rect.bottom - e.clientY) / rect.height;
        pct = Math.max(0, Math.min(1, pct));
        
        currentBrushSize = Math.round(pct * 149) + 1; // 1px to 150px
        
        sizeHandle.style.bottom = (pct * 100) + '%';
        sizeTrackFill.style.height = (pct * 100) + '%';
        sizeBubble.textContent = currentBrushSize;

        // Render Ring Size Preview Ring Overlay Elements Coordinates Bounds
        brushPreviewRing.style.display = 'block';
        // Compute responsive width using viewport center coordinates spaces layout metrics
        const visualDiameter = currentBrushSize * scale;
        brushPreviewRing.style.width = visualDiameter + 'px';
        brushPreviewRing.style.height = visualDiameter + 'px';
    };

    sizeSlider.addEventListener('pointerdown', (e) => {
        sizeSlider.setPointerCapture(e.pointerId);
        syncSizeSlider(e);
        
        const moveHook = (ev) => syncSizeSlider(ev);
        const upHook = (ev) => {
            sizeSlider.releasePointerCapture(ev.pointerId);
            sizeSlider.removeEventListener('pointermove', moveHook);
            sizeSlider.removeEventListener('pointerup', upHook);
            brushPreviewRing.style.display = 'none'; // Fade out instantly when interaction ceases
        };
        sizeSlider.addEventListener('pointermove', moveHook);
        sizeSlider.addEventListener('pointerup', upHook);
    });

    // Custom Opacity Vertical Slider Hook Execution Handles
    const syncOpacSlider = (e) => {
        const rect = opacSlider.getBoundingClientRect();
        let pct = (rect.bottom - e.clientY) / rect.height;
        pct = Math.max(0, Math.min(1, pct));
        
        currentOpacity = pct;
        
        opacHandle.style.bottom = (pct * 100) + '%';
        opacTrackFill.style.height = (pct * 100) + '%';
        opacBubble.textContent = Math.round(pct * 100);
    };

    opacSlider.addEventListener('pointerdown', (e) => {
        opacSlider.setPointerCapture(e.pointerId);
        syncOpacSlider(e);
        
        const moveHook = (ev) => syncOpacSlider(ev);
        const upHook = (ev) => {
            opacSlider.releasePointerCapture(ev.pointerId);
            opacSlider.removeEventListener('pointermove', moveHook);
            opacSlider.removeEventListener('pointerup', upHook);
        };
        opacSlider.addEventListener('pointermove', moveHook);
        opacSlider.addEventListener('pointerup', upHook);
    });
}

// Layer Management System Core Controllers Pipeline Framework
function setupLayersPanel() {
    document.getElementById('layerPanelBtn').addEventListener('click', () => {
        layerSidebar.classList.toggle('show');
    });

    document.getElementById('addLayerBtn').addEventListener('click', () => {
        if (currentTool === 'transform') bakeTransformation();
        addNewLayer();
        saveHistoryState();
        compositeCanvasStack();
    });

    document.getElementById('clippingBtn').addEventListener('click', () => {
        let activeLayer = layers.find(l => l.id === activeLayerId);
        if (activeLayer) {
            activeLayer.clipping = !activeLayer.clipping;
            document.getElementById('clippingBtn').classList.toggle('active', activeLayer.clipping);
            updateLayersUI();
            compositeCanvasStack();
        }
    });

    document.getElementById('alphaLockBtn').addEventListener('click', () => {
        let activeLayer = layers.find(l => l.id === activeLayerId);
        if (activeLayer) {
            activeLayer.alphaLock = !activeLayer.alphaLock;
            document.getElementById('alphaLockBtn').classList.toggle('active', activeLayer.alphaLock);
            updateLayersUI();
        }
    });

    document.getElementById('blendModeSelect').addEventListener('change', (e) => {
        let activeLayer = layers.find(l => l.id === activeLayerId);
        if (activeLayer) {
            activeLayer.blendMode = e.target.value;
            compositeCanvasStack();
        }
    });

    document.getElementById('layerOpacityRange').addEventListener('input', (e) => {
        let activeLayer = layers.find(l => l.id === activeLayerId);
        if (activeLayer) {
            activeLayer.opacity = parseInt(e.target.value) / 100;
            compositeCanvasStack();
        }
    });
}

function addNewLayer(name = null) {
    let layerW = canvas ? canvas.width : 800;
    let layerH = canvas ? canvas.height : 600;

    let lCanvas = document.createElement('canvas');
    lCanvas.width = layerW;
    lCanvas.height = layerH;
    let lCtx = lCanvas.getContext('2d');

    let newLayer = {
        id: nextLayerId++,
        name: name || `Layer ${nextLayerId - 1}`,
        canvas: lCanvas,
        ctx: lCtx,
        visible: true,
        opacity: 1.0,
        blendMode: 'source-over',
        alphaLock: false,
        clipping: false
    };

    // Insert layers immediately at top sequence stack index
    if (activeLayerId === null) {
        layers.push(newLayer);
    } else {
        let idx = layers.findIndex(l => l.id === activeLayerId);
        layers.splice(idx + 1, 0, newLayer);
    }

    activeLayerId = newLayer.id;
    updateLayersUI();
}

function updateLayersUI() {
    layersList.innerHTML = '';
    
    // Render from top down to maintain layer list consistency
    for (let i = layers.length - 1; i >= 0; i--) {
        let layer = layers[i];
        let item = document.createElement('div');
        item.className = `layer-item ${layer.id === activeLayerId ? 'active' : ''} ${layer.clipping ? 'clipping' : ''}`;
        
        item.addEventListener('click', () => {
            if (currentTool === 'transform' && activeLayerId !== layer.id) bakeTransformation();
            activeLayerId = layer.id;
            document.getElementById('clippingBtn').classList.toggle('active', layer.clipping);
            document.getElementById('alphaLockBtn').classList.toggle('active', layer.alphaLock);
            document.getElementById('blendModeSelect').value = layer.blendMode;
            document.getElementById('layerOpacityRange').value = Math.round(layer.opacity * 100);
            updateLayersUI();
            compositeCanvasStack();
        });

        // Generate layer preview thumbnail elements dynamically
        let thumb = document.createElement('canvas');
        thumb.className = 'layer-thumbnail';
        thumb.width = 40;
        thumb.height = 30;
        let tCtx = thumb.getContext('2d');
        tCtx.drawImage(layer.canvas, 0, 0, 40, 30);

        let title = document.createElement('span');
        title.className = 'layer-title-text';
        title.textContent = layer.name;

        // Visibility Toggle Vector Elements Logic Controller
        let visBtn = document.createElement('button');
        visBtn.className = 'layer-item-btn';
        visBtn.innerHTML = layer.visible ? 
            `<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>` :
            `<svg viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.82l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.74-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 2.19 0 4.25-.56 6.05-1.53l.44.44L21.27 22 22.5 20.73 3.27 1.5 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.01-.16c0-1.66-1.34-3-3-3l-.16.01z"/></svg>`;
        
        visBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            layer.visible = !layer.visible;
            updateLayersUI();
            compositeCanvasStack();
        });

        // Layer Order Stack Re-arranging Controller Operations Elements
        let orderGroup = document.createElement('div');
        orderGroup.className = 'layer-order-controls';
        
        let upBtn = document.createElement('button');
        upBtn.className = 'layer-order-btn';
        upBtn.textContent = '▲';
        upBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            let idx = layers.findIndex(l => l.id === layer.id);
            if (idx < layers.length - 1) {
                layers.splice(idx, 1);
                layers.splice(idx + 1, 0, layer);
                updateLayersUI();
                compositeCanvasStack();
            }
        });

        let downBtn = document.createElement('button');
        downBtn.className = 'layer-order-btn';
        downBtn.textContent = '▼';
        downBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            let idx = layers.findIndex(l => l.id === layer.id);
            if (idx > 0) {
                layers.splice(idx, 1);
                layers.splice(idx - 1, 0, layer);
                updateLayersUI();
                compositeCanvasStack();
            }
        });

        orderGroup.appendChild(upBtn);
        orderGroup.appendChild(downBtn);

        item.appendChild(visBtn);
        item.appendChild(thumb);
        item.appendChild(title);
        item.appendChild(orderGroup);
        layersList.appendChild(item);
    }
}

// Color Panel Component Layout Initializers Logic Hooks
function setupColorPanel() {
    document.getElementById('colorBtn').addEventListener('click', () => {
        colorPanel.classList.toggle('show');
    });
    document.getElementById('closeColorBtn').addEventListener('click', () => {
        colorPanel.classList.remove('show');
    });

    drawColorWheelMesh();
    
    colorWheel.addEventListener('pointerdown', sampleColorWheelPoint);
    
    hexInput.addEventListener('change', (e) => {
        let val = e.target.value;
        if (!val.startsWith('#')) val = '#' + val;
        if (/^#[0-9A-F]{6}$/i.test(val)) {
            activeColor = val;
            hexInput.value = val;
        }
    });

    renderPaletteSwatches();
}

function drawColorWheelMesh() {
    const c = colorWheel;
    const wCtx = c.getContext('2d');
    const r = c.width / 2;
    wCtx.clearRect(0, 0, c.width, c.height);

    for (let x = -r; x < r; x++) {
        for (let y = -r; y < r; y++) {
            let dist = Math.hypot(x, y);
            if (dist > r) continue;

            let angle = Math.atan2(y, x) * 180 / Math.PI + 180; // 0 to 360
            let sat = dist / r;
            wCtx.fillStyle = `hsl(${angle}, ${sat * 100}%, 50%)`;
            wCtx.fillRect(x + r, y + r, 1, 1);
        }
    }
}

function sampleColorWheelPoint(e) {
    const rect = colorWheel.getBoundingClientRect();
    const x = e.clientX - rect.left - colorWheel.width / 2;
    const y = e.clientY - rect.top - colorWheel.height / 2;
    const dist = Math.hypot(x, y);
    const r = colorWheel.width / 2;

    if (dist <= r) {
        colorWheel.setPointerCapture(e.pointerId);
        const process = (ev) => {
            const lx = ev.clientX - rect.left - r;
            const ly = ev.clientY - rect.top - r;
            let d = Math.hypot(lx, ly);
            let angle = Math.atan2(ly, lx) * 180 / Math.PI + 180;
            let sat = Math.min(1.0, d / r);
            
            // Convert HSL back to clean standard hex values string format mapping
            let rgb = hslToRgb(angle / 360, sat, 0.5);
            activeColor = rgbToHex(rgb[0], rgb[1], rgb[2]);
            hexInput.value = activeColor;
        };
        process(e);

        const wheelMove = (ev) => process(ev);
        const wheelUp = (ev) => {
            colorWheel.releasePointerCapture(ev.pointerId);
            colorWheel.removeEventListener('pointermove', wheelMove);
            colorWheel.removeEventListener('pointerup', wheelUp);
        };
        colorWheel.addEventListener('pointermove', wheelMove);
        colorWheel.addEventListener('pointerup', wheelUp);
    }
}

function renderPaletteSwatches() {
    paletteGrid.innerHTML = '';
    colorPalette.forEach(color => {
        let swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        swatch.addEventListener('click', () => {
            activeColor = color;
            hexInput.value = color;
        });
        paletteGrid.appendChild(swatch);
    });
}

function commitColorToPalette(color) {
    if (colorPalette.includes(color)) return;
    colorPalette.unshift(color);
    if (colorPalette.length > 15) colorPalette.pop();
    renderPaletteSwatches();
}

// Global Workspace Gesture Operations (Zooming, Panning, and Transform Interactions)
let activePointers = [];
let startPanX = 0, startPanY = 0;
let initialTouchDist = 0;
let initialTouchAngle = 0;
let initialScale = 1;
let initialRotation = 0;
let isPanning = false;

function getDistance(p1, p2) {
    return Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
}

function getAngle(p1, p2) {
    return Math.atan2(p2.clientY - p1.clientY, p2.clientX - p1.clientX) * 180 / Math.PI;
}

const handlePointerDownGlobal = (e) => {
    if (e.target.closest('.top-bar') || e.target.closest('.left-controls') || e.target.closest('.color-panel') || e.target.closest('.layer-sidebar')) return;

    if (activePointers.some(p => p.pointerId === e.pointerId)) return;
    activePointers.push(e);
    
    if (activePointers.length === 1) {
        if (currentTool !== 'brush' && currentTool !== 'eraser' && currentTool !== 'lasso' && !transformDragMode) {
            isPanning = true;
            startPanX = e.clientX - panX;
            startPanY = e.clientY - panY;
        }
    } else if (activePointers.length === 2) {
        if (drawing) drawing = false; 
        isPanning = false;
        
        initialTouchDist = getDistance(activePointers[0], activePointers[1]);
        initialTouchAngle = getAngle(activePointers[0], activePointers[1]);
        
        if (currentTool === 'transform' && isTransforming) {
            initialTransformState = { ...transformState };
        } else {
            initialScale = scale;
            initialRotation = rotation;
            startPanX = ((activePointers[0].clientX + activePointers[1].clientX) / 2) - panX;
            startPanY = ((activePointers[0].clientY + activePointers[1].clientY) / 2) - panY;
        }
    }
};

const handlePointerMoveGlobal = (e) => {
    const index = activePointers.findIndex(p => p.pointerId === e.pointerId);
    if (index !== -1) activePointers[index] = e;

    if (isPanning && activePointers.length === 1) {
        panX = e.clientX - startPanX;
        panY = e.clientY - startPanY;
        applyTransforms();
    } else if (activePointers.length === 2) {
        const currentDist = getDistance(activePointers[0], activePointers[1]);
        const currentAngle = getAngle(activePointers[0], activePointers[1]);

        if (currentTool === 'transform' && isTransforming) {
            // Map 2-finger multi-touch movements directly to the active transformed element
            if (initialTouchDist > 0) {
                let targetScaleFactor = currentDist / initialTouchDist;
                transformState.scaleX = initialTransformState.scaleX * targetScaleFactor;
                transformState.scaleY = initialTransformState.scaleY * targetScaleFactor;
                transformState.angle = initialTransformState.angle + (currentAngle - initialTouchAngle);
                compositeCanvasStack();
            }
        } else {
            // Apply workspace canvas scaling/rotation transforms globally
            let targetScale = initialScale * (currentDist / initialTouchDist);
            scale = Math.max(0.1, Math.min(targetScale, 10));
            rotation = initialRotation + (currentAngle - initialTouchAngle);

            const currentMidX = (activePointers[0].clientX + activePointers[1].clientX) / 2;
            const currentMidY = (activePointers[0].clientY + activePointers[1].clientY) / 2;
            
            panX = currentMidX - startPanX;
            panY = currentMidY - startPanY;

            applyTransforms();
        }
    }
};

window.addEventListener('pointerdown', handlePointerDownGlobal);
window.addEventListener('pointermove', handlePointerMoveGlobal);

function handlePointerUp(e) {
    activePointers = activePointers.filter(p => p.pointerId !== e.pointerId);
    if (activePointers.length === 1) {
        if (currentTool !== 'brush' && currentTool !== 'eraser' && currentTool !== 'lasso') {
            isPanning = true;
            startPanX = activePointers[0].clientX - panX;
            startPanY = activePointers[0].clientY - panY;
        }
    } else {
        isPanning = false;
    }
}

window.addEventListener('pointerup', handlePointerUp);
window.addEventListener('pointercancel', handlePointerUp);

workspace.addEventListener('wheel', (e) => {
    if (e.target.closest('.top-bar') || e.target.closest('.left-controls') || e.target.closest('.color-panel') || e.target.closest('.layer-sidebar')) return;
    e.preventDefault();
    const zoomFactor = 1.1;
    let targetScale = scale;
    
    if (e.deltaY < 0) {
        targetScale *= zoomFactor;
    } else {
        targetScale /= zoomFactor;
    }
    
    scale = Math.max(0.1, Math.min(targetScale, 10));
    applyTransforms();
}, { passive: false });

// Undo / Redo Global Historic Timeline State Capture Management Engines
function saveHistoryState() {
    let stateSnapshot = layers.map(layer => {
        let copyCanvas = document.createElement('canvas');
        copyCanvas.width = canvas.width;
        copyCanvas.height = canvas.height;
        copyCanvas.getContext('2d').drawImage(layer.canvas, 0, 0);
        return {
            id: layer.id,
            name: layer.name,
            canvas: copyCanvas,
            visible: layer.visible,
            opacity: layer.opacity,
            blendMode: layer.blendMode,
            alphaLock: layer.alphaLock,
            clipping: layer.clipping
        };
    });

    undoStack.push({
        layers: stateSnapshot,
        activeLayerId: activeLayerId
    });
    redoStack = []; // Break timeline link forward upon new action branch
    updateUndoRedoButtonsState();
}

function triggerUndo() {
    if (undoStack.length <= 1) return; // Retain origin initial starting position mapping safely
    if (currentTool === 'transform') bakeTransformation();

    letcurrentState = undoStack.pop();
    redoStack.push(currentState);

    let previousState = undoStack[undoStack.length - 1];
    restoreHistoryState(previousState);
}

function triggerRedo() {
    if (redoStack.length === 0) return;
    if (currentTool === 'transform') bakeTransformation();

    let nextState = redoStack.pop();
    undoStack.push(nextState);
    restoreHistoryState(nextState);
}

function restoreHistoryState(state) {
    activeLayerId = state.activeLayerId;
    layers = state.layers.map(snap => {
        let lCanvas = document.createElement('canvas');
        lCanvas.width = canvas.width;
        lCanvas.height = canvas.height;
        let lCtx = lCanvas.getContext('2d');
        lCtx.drawImage(snap.canvas, 0, 0);
        return {
            id: snap.id,
            name: snap.name,
            canvas: lCanvas,
            ctx: lCtx,
            visible: snap.visible,
            opacity: snap.opacity,
            blendMode: snap.blendMode,
            alphaLock: snap.alphaLock,
            clipping: snap.clipping
        };
    });

    updateUndoRedoButtonsState();
    updateLayersUI();
    compositeCanvasStack();
}

function updateUndoRedoButtonsState() {
    document.getElementById('undoBtn').disabled = (undoStack.length <= 1);
    document.getElementById('redoBtn').disabled = (redoStack.length === 0);
}

// UI Dropdown File Action Handlers Configuration
function setupDropdownMenu() {
    const menuBtn = document.getElementById('menuBtn');
    const menuDropdown = document.getElementById('menuDropdown');

    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        menuDropdown.classList.toggle('show');
    });

    window.addEventListener('click', () => {
        menuDropdown.classList.remove('show');
    });

    document.getElementById('newFileBtn').addEventListener('click', () => {
        if (confirm("Discard project and start fresh?")) {
            location.reload();
        }
    });

    document.getElementById('savePngBtn').addEventListener('click', () => exportImage('png'));
    document.getElementById('saveJpegBtn').addEventListener('click', () => exportImage('jpeg'));
    document.getElementById('saveSvgBtn').addEventListener('click', exportSvgFormat);
}

function exportImage(format) {
    if (currentTool === 'transform') bakeTransformation();
    
    // Create flattening canvas to process transparent underlying stacking masks securely
    let exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    let eCtx = exportCanvas.getContext('2d');

    if (format === 'jpeg') {
        eCtx.fillStyle = '#ffffff';
        eCtx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Blend flattening sequence
    for (let i = 0; i < layers.length; i++) {
        let layer = layers[i];
        if (!layer.visible) continue;
        eCtx.save();
        eCtx.globalAlpha = layer.opacity;
        eCtx.globalCompositeOperation = layer.blendMode;
        eCtx.drawImage(layer.canvas, 0, 0);
        eCtx.restore();
    }

    let link = document.createElement('a');
    link.download = `artwork.${format}`;
    link.href = exportCanvas.toDataURL(`image/${format}`, 0.9);
    link.click();
}

function exportSvgFormat() {
    if (currentTool === 'transform') bakeTransformation();
    let svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">`;
    
    for (let i = 0; i < layers.length; i++) {
        let layer = layers[i];
        if (!layer.visible) continue;
        let dataUrl = layer.canvas.toDataURL('image/png');
        svgString += `<image href="${dataUrl}" width="${canvas.width}" height="${canvas.height}" opacity="${layer.opacity}" style="mix-blend-mode:${layer.blendMode}"/>`;
    }
    
    svgString += `</svg>`;
    let blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    let link = document.createElement('a');
    link.download = 'artwork.svg';
    link.href = URL.createObjectURL(blob);
    link.click();
}

// Primary Mathematics Conversion Utilities
function hslToRgb(h, s, l) {
    let r, g, b;
    if (s == 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        let p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
