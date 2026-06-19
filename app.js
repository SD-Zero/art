// UI Elements
const startMenu = document.getElementById('startMenu');
const canvasWidthInput = document.getElementById('canvasWidth');
const canvasHeightInput = document.getElementById('canvasHeight');
const previewBox = document.getElementById('previewBox');
const confirmBtn = document.getElementById('confirmBtn');
const fileInput = document.getElementById('fileInput');

const workspace = document.getElementById('workspace');
const transformContainer = document.getElementById('transformContainer');
const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d');

const menuBtn = document.getElementById('menuBtn');
const menuDropdown = document.getElementById('menuDropdown');
const colorBtn = document.getElementById('colorBtn');
const colorPanel = document.getElementById('colorPanel');
const closeColorBtn = document.getElementById('closeColorBtn');
const hexInput = document.getElementById('hexInput');
const paletteGrid = document.getElementById('paletteGrid');
const colorWheel = document.getElementById('colorWheel');
const wheelCtx = colorWheel.getContext('2d');

const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const brushBtn = document.getElementById('brushBtn');
const eraserBtn = document.getElementById('eraserBtn');

const newFileBtn = document.getElementById('newFileBtn');
const savePngBtn = document.getElementById('savePngBtn');
const saveJpegBtn = document.getElementById('saveJpegBtn');
const saveSvgBtn = document.getElementById('saveSvgBtn');
const saveSpeedpaintBtn = document.getElementById('saveSpeedpaintBtn');

const sizeSlider = document.getElementById('sizeSlider');
const sizeTrackFill = document.getElementById('sizeTrackFill');
const sizeHandle = document.getElementById('sizeHandle');
const sizeBubble = document.getElementById('sizeBubble');

const opacSlider = document.getElementById('opacSlider');
const opacTrackFill = document.getElementById('opacTrackFill');
const opacHandle = document.getElementById('opacHandle');
const opacBubble = document.getElementById('opacBubble');

// Layers Elements
const layerPanelBtn = document.getElementById('layerPanelBtn');
const layerSidebar = document.getElementById('layerSidebar');
const addLayerBtn = document.getElementById('addLayerBtn');
const layersList = document.getElementById('layersList');
const clippingBtn = document.getElementById('clippingBtn');
const alphaLockBtn = document.getElementById('alphaLockBtn');
const blendModeSelect = document.getElementById('blendModeSelect');
const layerOpacityRange = document.getElementById('layerOpacityRange');

// State Tracking
let scale = 1;
let panX = 0;
let panY = 0;
let rotation = 0; 

let drawing = false;
let currentBrushSize = 10;
let currentOpacity = 1.0;
let activeColor = '#000000';
let currentTool = 'brush'; // 'brush', 'eraser', 'lasso', 'transform'
let strokeHasPainted = false; 

let recentColors = Array(20).fill('#ffffff');
let undoStack = [];
let redoStack = [];
const MAX_HISTORY = 20;

let speedpaintFrames = [];
let recordingInterval = null;

// Multi-Layer Storage Architecture
let layers = [];
let activeLayerId = null;
let layerIdCounter = 0;

// Dedicated Offscreen Buffers for Realtime Operations
let alphaScratchCanvas = document.createElement('canvas');
let alphaScratchCtx = alphaScratchCanvas.getContext('2d');
let alphaBackupCanvas = document.createElement('canvas');
let alphaBackupCtx = alphaBackupCanvas.getContext('2d');

// Lasso Selection Buffer Data Structures
let lassoPoints = [];
let selectionMaskCanvas = document.createElement('canvas');
let selectionMaskCtx = selectionMaskCanvas.getContext('2d');
let hasActiveSelection = false;

// Active Transform Manipulation States
let transformTargetData = null; // Stores sub-image or layer snapshot during manipulation
let layerOffsetX = 0;
let layerOffsetY = 0;
let initialTransformScale = 1;

// Color Picker State Engine
let currentHue = 0;
let currentSat = 0;
let currentLight = 0;

// Dynamic Creation of Selection/Transform toolbar options
const controlsContainer = document.querySelector('.left-controls');

let lassoBtn = document.getElementById('lassoBtn');
if (!lassoBtn) {
    lassoBtn = document.createElement('button');
    lassoBtn.id = 'lassoBtn';
    lassoBtn.className = 'tool-btn';
    lassoBtn.innerHTML = 'LASSO';
    lassoBtn.style.fontSize = '10px';
    controlsContainer.insertBefore(lassoBtn, brushBtn);
}

let transformBtn = document.getElementById('transformBtn');
if (!transformBtn) {
    transformBtn = document.createElement('button');
    transformBtn.id = 'transformBtn';
    transformBtn.className = 'tool-btn';
    transformBtn.innerHTML = 'MOVE';
    transformBtn.style.fontSize = '10px';
    controlsContainer.insertBefore(transformBtn, brushBtn);
}

// iOS Double-Tap System Zoom Prevention Engine
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault(); 
    }
    lastTouchEnd = now;
}, { passive: false });

// Dynamically create or update brush size preview element
let sizePreviewContainer = document.getElementById('sizePreviewContainer');
if (!sizePreviewContainer) {
    sizePreviewContainer = document.createElement('div');
    sizePreviewContainer.id = 'sizePreviewContainer';
    sizePreviewContainer.style.position = 'absolute';
    sizePreviewContainer.style.left = '70px';
    sizePreviewContainer.style.bottom = '180px';
    sizePreviewContainer.style.width = '100px';
    sizePreviewContainer.style.height = '100px';
    sizePreviewContainer.style.display = 'none'; 
    sizePreviewContainer.style.alignItems = 'center';
    sizePreviewContainer.style.justifyContent = 'center';
    sizePreviewContainer.style.borderRadius = '8px';
    sizePreviewContainer.style.pointerEvents = 'none';
    sizePreviewContainer.style.zIndex = '100';
    controlsContainer.appendChild(sizePreviewContainer);
}

function updateBrushSizePreview() {
    sizePreviewContainer.innerHTML = '';
    const circle = document.createElement('div');
    circle.style.width = currentBrushSize + 'px';
    circle.style.height = currentBrushSize + 'px';
    circle.style.maxWidth = '90px';
    circle.style.maxHeight = '90px';
    circle.style.borderRadius = '50%';
    circle.style.border = '2px solid #fff';
    circle.style.boxShadow = '0 0 4px rgba(0,0,0,0.5)';
    sizePreviewContainer.appendChild(circle);
}

// Dynamically build the menu's "Import Image" button if it doesn't exist
let importImgBtn = document.getElementById('importImgBtn');
if (!importImgBtn) {
    importImgBtn = document.createElement('button');
    importImgBtn.id = 'importImgBtn';
    importImgBtn.className = 'menu-item';
    importImgBtn.textContent = 'Import Image';
    if (newFileBtn && newFileBtn.parentNode) {
        newFileBtn.parentNode.insertBefore(importImgBtn, newFileBtn.nextSibling);
    }
}

const hiddenLayerAssetPicker = document.createElement('input');
hiddenLayerAssetPicker.type = 'file';
hiddenLayerAssetPicker.accept = 'image/*';
hiddenLayerAssetPicker.style.display = 'none';
document.body.appendChild(hiddenLayerAssetPicker);

importImgBtn.addEventListener('click', () => {
    menuDropdown.classList.remove('show');
    hiddenLayerAssetPicker.click();
});

hiddenLayerAssetPicker.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            saveHistoryState();
            
            const layerCanvas = document.createElement('canvas');
            layerCanvas.width = canvas.width;
            layerCanvas.height = canvas.height;
            const layerCtx = layerCanvas.getContext('2d');
            
            const scaleFactor = Math.min(canvas.width / img.width, canvas.height / img.height, 1);
            const targetWidth = img.width * scaleFactor;
            const targetHeight = img.height * scaleFactor;
            const offsetX = (canvas.width - targetWidth) / 2;
            const offsetY = (canvas.height - targetHeight) / 2;
            
            layerCtx.drawImage(img, offsetX, offsetY, targetWidth, targetHeight);

            const layerObj = {
                id: layerIdCounter++,
                name: `Imported Image`,
                canvas: layerCanvas,
                ctx: layerCtx,
                visible: true,
                opacity: 1.0,
                blendMode: 'source-over',
                clipping: false,
                alphaLock: false
            };

            layers.unshift(layerObj); 
            activeLayerId = layerObj.id;
            
            updateLayersUI();
            updateGlobalLayerControlsUI();
            compositeCanvasStack();

            // Auto-trigger Move/Transform mode immediately upon asset ingestion
            setToolMode('transform');
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(file);
    hiddenLayerAssetPicker.value = ''; 
});

// Update DOM Label text from OPAC to OPACITY safely
const opacLabel = document.querySelector('label[for="opacSlider"]') || Array.from(document.querySelectorAll('span, label')).find(el => el.textContent.includes('OPAC'));
if (opacLabel) {
    opacLabel.textContent = 'OPACITY';
}

// Custom Sliders Engine
function setupCustomSlider(container, fill, handle, bubble, min, max, initialValue, onChange) {
    let isDragging = false;

    function updateSliderFromCoords(clientY) {
        const rect = container.getBoundingClientRect();
        let percentage = (rect.bottom - clientY) / rect.height;
        percentage = Math.max(0, Math.min(1, percentage));

        fill.style.height = (percentage * 100) + '%';
        handle.style.bottom = (percentage * 100) + '%';

        const calculatedValue = min + percentage * (max - min);
        bubble.textContent = Math.round(calculatedValue);
        
        onChange(calculatedValue);
    }

    const initialPercentage = (initialValue - min) / (max - min);
    fill.style.height = (initialPercentage * 100) + '%';
    handle.style.bottom = (initialPercentage * 100) + '%';
    bubble.textContent = Math.round(initialValue);

    container.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        container.setPointerCapture(e.pointerId);
        isDragging = true;
        
        if(container === sizeSlider) {
            sizePreviewContainer.style.display = 'flex';
        }
        updateSliderFromCoords(e.clientY);
    });

    container.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        e.stopPropagation();
        updateSliderFromCoords(e.clientY);
    });

    const stopDrag = (e) => {
        if (isDragging) {
            container.releasePointerCapture(e.pointerId);
            isDragging = false;
            if(container === sizeSlider) {
                sizePreviewContainer.style.display = 'none';
            }
        }
    };

    container.addEventListener('pointerup', stopDrag);
    container.addEventListener('pointercancel', stopDrag);
}

setupCustomSlider(sizeSlider, sizeTrackFill, sizeHandle, sizeBubble, 1, 100, 10, (val) => {
    currentBrushSize = Math.round(val);
    updateBrushSizePreview();
});

setupCustomSlider(opacSlider, opacTrackFill, opacHandle, opacBubble, 0, 100, 100, (val) => {
    currentOpacity = val / 100;
});

// Master Tool Switching Logic State Engine
function setToolMode(mode) {
    currentTool = mode;
    brushBtn.classList.toggle('active', mode === 'brush');
    eraserBtn.classList.toggle('active', mode === 'eraser');
    lassoBtn.classList.toggle('active', mode === 'lasso');
    transformBtn.classList.toggle('active', mode === 'transform');
    
    // Clear operational selections when flipping back away from Selection configurations
    if (mode !== 'lasso' && mode !== 'transform' && mode !== 'brush' && mode !== 'eraser') {
        hasActiveSelection = false;
        lassoPoints = [];
    }
    
    if (mode === 'transform') {
        setupTransformOperationData();
    } else {
        transformTargetData = null;
    }
    updateBrushSizePreview();
}

brushBtn.addEventListener('click', () => setToolMode('brush'));
eraserBtn.addEventListener('click', () => setToolMode('eraser'));
lassoBtn.addEventListener('click', () => setToolMode('lasso'));
transformBtn.addEventListener('click', () => setToolMode('transform'));

// Workspace / Layer Isolation Transform Engine Setup
function setupTransformOperationData() {
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer) return;

    transformTargetData = document.createElement('canvas');
    transformTargetData.width = canvas.width;
    transformTargetData.height = canvas.height;
    const tCtx = transformTargetData.getContext('2d');

    if (hasActiveSelection) {
        // Cut exclusively inside lasso coordinates bounds
        tCtx.save();
        tCtx.drawImage(selectionMaskCanvas, 0, 0);
        tCtx.globalCompositeOperation = 'source-in';
        tCtx.drawImage(activeLayer.canvas, 0, 0);
        tCtx.restore();

        // Strip localized data spaces out of baseline interactive canvas element immediately
        saveHistoryState();
        activeLayer.ctx.save();
        activeLayer.ctx.drawImage(selectionMaskCanvas, 0, 0);
        activeLayer.ctx.globalCompositeOperation = 'destination-out';
        activeLayer.ctx.drawImage(activeLayer.canvas, 0, 0);
        activeLayer.ctx.restore();
    } else {
        // Manipulate complete sheet surface area layers globally
        saveHistoryState();
        tCtx.drawImage(activeLayer.canvas, 0, 0);
        activeLayer.ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    layerOffsetX = 0;
    layerOffsetY = 0;
    initialTransformScale = 1;
}

// Sidebar & Dropdown Trigger Logic
menuBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    colorPanel.classList.remove('show');
    menuDropdown.classList.toggle('show');
});

colorBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    menuDropdown.classList.remove('show');
    colorPanel.classList.toggle('show');
    if (colorPanel.classList.contains('show')) drawColorWheel();
});

layerPanelBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    menuDropdown.classList.remove('show');
    colorPanel.classList.remove('show');
    layerSidebar.classList.toggle('show');
});

closeColorBtn.addEventListener('click', () => {
    colorPanel.classList.remove('show');
});

// Global Tap Listener (Persistent Sidebar Exception Enabled)
window.addEventListener('pointerdown', (e) => {
    if (layerSidebar.contains(e.target) || layerPanelBtn.contains(e.target)) {
        return; 
    }
    if (!menuDropdown.contains(e.target) && e.target !== menuBtn) {
        menuDropdown.classList.remove('show');
    }
    if (!colorPanel.contains(e.target) && !colorBtn.contains(e.target)) {
        colorPanel.classList.remove('show');
    }
});

// Canvas Preview Settings
function updatePreview() {
    const w = parseInt(canvasWidthInput.value) || 1;
    const h = parseInt(canvasHeightInput.value) || 1;
    const maxDisplaySize = 150;

    if (w >= h) {
        previewBox.style.width = maxDisplaySize + 'px';
        previewBox.style.height = (h / w) * maxDisplaySize + 'px';
    } else {
        previewBox.style.height = maxDisplaySize + 'px';
        previewBox.style.width = (w / h) * maxDisplaySize + 'px';
    }
}
canvasWidthInput.addEventListener('input', updatePreview);
canvasHeightInput.addEventListener('input', updatePreview);
updatePreview();

function applyTransforms() {
    transformContainer.style.transform = `translate(${panX}px, ${panY}px) scale(${scale}) rotate(${rotation}deg)`;
}

function centerCanvas() {
    panX = (window.innerWidth - canvas.width) / 2;
    if (window.innerWidth > 900) panX -= 100; 
    panY = (window.innerHeight - canvas.height) / 2;
    scale = 1;
    rotation = 0;
    applyTransforms();
}

// Layer Reordering Engine
function moveLayerUp(index) {
    if (index === 0) return; 
    saveHistoryState();
    const temp = layers[index];
    layers[index] = layers[index - 1];
    layers[index - 1] = temp;
    updateLayersUI();
    compositeCanvasStack();
}

function moveLayerDown(index) {
    if (index === layers.length - 1) return; 
    saveHistoryState();
    const temp = layers[index];
    layers[index] = layers[index + 1];
    layers[index + 1] = temp;
    updateLayersUI();
    compositeCanvasStack();
}

// Layer Allocation State Management
function createLayerElement(name = `Layer ${layers.length + 1}`) {
    const layerCanvas = document.createElement('canvas');
    layerCanvas.width = canvas.width;
    layerCanvas.height = canvas.height;
    
    const layerCtx = layerCanvas.getContext('2d');

    const layerObj = {
        id: layerIdCounter++,
        name: name,
        canvas: layerCanvas,
        ctx: layerCtx,
        visible: true,
        opacity: 1.0,
        blendMode: 'source-over',
        clipping: false,
        alphaLock: false
    };

    layers.unshift(layerObj); 
    activeLayerId = layerObj.id;
    
    updateLayersUI();
    compositeCanvasStack();
}

function updateLayersUI() {
    layersList.innerHTML = '';
    
    layers.forEach((layer, index) => {
        const item = document.createElement('div');
        item.className = `layer-item ${layer.id === activeLayerId ? 'active' : ''} ${layer.clipping ? 'clipping' : ''}`;
        
        // Double Tap Interaction Listener for Layer Name Alterations
        let lastTap = 0;
        item.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('select') || e.target.closest('input')) return;
            
            const now = Date.now();
            if (now - lastTap < 300) {
                // Double tap detected
                const newName = prompt(`Enter new title for ${layer.name}:`, layer.name);
                if (newName && newName.trim() !== "") {
                    layer.name = newName.trim();
                    updateLayersUI();
                }
            } else {
                // Standard Selection Action
                activeLayerId = layer.id;
                updateLayersUI();
                updateGlobalLayerControlsUI();
            }
            lastTap = now;
        });

        const thumb = document.createElement('img');
        thumb.className = 'layer-thumbnail';
        thumb.src = layer.canvas.toDataURL();

        const title = document.createElement('span');
        title.className = 'layer-title-text';
        title.textContent = layer.name;

        const orderControls = document.createElement('div');
        orderControls.className = 'layer-order-controls';
        
        const upBtn = document.createElement('button');
        upBtn.className = 'layer-order-btn';
        upBtn.innerHTML = '&#9650;'; 
        upBtn.title = 'Move Layer Up';
        upBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            moveLayerUp(index);
        });

        const downBtn = document.createElement('button');
        downBtn.className = 'layer-order-btn';
        downBtn.innerHTML = '&#9660;'; 
        downBtn.title = 'Move Layer Down';
        downBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            moveLayerDown(index);
        });

        orderControls.appendChild(upBtn);
        orderControls.appendChild(downBtn);

        const visBtn = document.createElement('button');
        visBtn.className = 'layer-item-btn';
        visBtn.innerHTML = layer.visible ? 
            `<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>` :
            `<svg viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.82l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.74-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 2.2 0 4.27-.6 6.04-1.63l.43.43L20.73 22l1.27-1.27L3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>`;
        
        visBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            layer.visible = !layer.visible;
            updateLayersUI();
            compositeCanvasStack();
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'layer-item-btn';
        delBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (layers.length <= 1) {
                alert("You need to keep at least one layer!");
                return;
            }
            saveHistoryState();
            layers = layers.filter(l => l.id !== layer.id);
            if (activeLayerId === layer.id) activeLayerId = layers[0].id;
            updateLayersUI();
            updateGlobalLayerControlsUI();
            compositeCanvasStack();
        });

        item.appendChild(thumb);
        item.appendChild(title);
        item.appendChild(orderControls);
        item.appendChild(visBtn);
        item.appendChild(delBtn);
        layersList.appendChild(item);
    });
}

function updateGlobalLayerControlsUI() {
    const layer = layers.find(l => l.id === activeLayerId);
    if (!layer) return;

    clippingBtn.classList.toggle('active', layer.clipping);
    alphaLockBtn.classList.toggle('active', layer.alphaLock);
    blendModeSelect.value = layer.blendMode;
    layerOpacityRange.value = layer.opacity * 100;
}

addLayerBtn.addEventListener('click', () => {
    saveHistoryState();
    createLayerElement();
});

clippingBtn.addEventListener('click', () => {
    const layer = layers.find(l => l.id === activeLayerId);
    if (layer) {
        saveHistoryState();
        layer.clipping = !layer.clipping;
        updateLayersUI();
        updateGlobalLayerControlsUI();
        compositeCanvasStack();
    }
});

alphaLockBtn.addEventListener('click', () => {
    const layer = layers.find(l => l.id === activeLayerId);
    if (layer) {
        layer.alphaLock = !layer.alphaLock;
        updateGlobalLayerControlsUI();
    }
});

blendModeSelect.addEventListener('change', (e) => {
    const layer = layers.find(l => l.id === activeLayerId);
    if (layer) {
        saveHistoryState();
        layer.blendMode = e.target.value;
        compositeCanvasStack();
    }
});

layerOpacityRange.addEventListener('input', (e) => {
    const layer = layers.find(l => l.id === activeLayerId);
    if (layer) {
        layer.opacity = e.target.value / 100;
        compositeCanvasStack();
    }
});

// Structural Composite Core Painter
function compositeCanvasStack() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        if (!layer.visible) continue;

        ctx.save();
        ctx.globalAlpha = layer.opacity;
        ctx.globalCompositeOperation = layer.blendMode;

        if (layer.clipping && i < layers.length - 1) {
            const baseLayer = layers[i + 1];
            
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = canvas.width;
            maskCanvas.height = canvas.height;
            const maskCtx = maskCanvas.getContext('2d');
            
            maskCtx.drawImage(baseLayer.canvas, 0, 0);
            maskCtx.globalCompositeOperation = 'source-in';
            maskCtx.drawImage(layer.canvas, 0, 0);
            
            ctx.drawImage(maskCanvas, 0, 0);
        } else {
            ctx.drawImage(layer.canvas, 0, 0);
        }

        // Live overlay renderer for transformations actively in-flight
        if (layer.id === activeLayerId && transformTargetData && currentTool === 'transform') {
            ctx.save();
            ctx.translate(canvas.width / 2 + layerOffsetX, canvas.height / 2 + layerOffsetY);
            ctx.scale(initialTransformScale, initialTransformScale);
            ctx.drawImage(transformTargetData, -canvas.width / 2, -canvas.height / 2);
            ctx.restore();
        }
        ctx.restore();
    }

    // Live Render Path visualization for Lasso points
    if (currentTool === 'lasso' && lassoPoints.length > 1) {
        ctx.save();
        ctx.strokeStyle = '#007aff';
        ctx.lineWidth = 2 / scale;
        ctx.setLineDash([4 / scale, 4 / scale]);
        ctx.beginPath();
        ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
        for(let i=1; i<lassoPoints.length; i++) {
            ctx.lineTo(lassoPoints[i].x, lassoPoints[i].y);
        }
        ctx.stroke();
        ctx.restore();
    }
}

// History Handling
function saveHistoryState() {
    const stateSnapshot = layers.map(l => ({
        id: l.id,
        name: l.name,
        visible: l.visible,
        opacity: l.opacity,
        blendMode: l.blendMode,
        clipping: l.clipping,
        alphaLock: l.alphaLock,
        data: l.canvas.toDataURL()
    }));

    undoStack.push(JSON.stringify(stateSnapshot));
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = []; 
    updateHistoryButtons();
}

function updateHistoryButtons() {
    undoBtn.disabled = undoStack.length === 0;
    redoBtn.disabled = redoStack.length === 0;
}

function applyHistoryState(targetStack, destinationStack) {
    if (targetStack.length === 0) return;
    
    const currentStateSnapshot = layers.map(l => ({
        id: l.id,
        name: l.name,
        visible: l.visible,
        opacity: l.opacity,
        blendMode: l.blendMode,
        clipping: l.clipping,
        alphaLock: l.alphaLock,
        data: l.canvas.toDataURL()
    }));
    destinationStack.push(JSON.stringify(currentStateSnapshot));

    const stateData = JSON.parse(targetStack.pop());
    
    let loadedCount = 0;
    layers = stateData.map(storedLayer => {
        const layerCanvas = document.createElement('canvas');
        layerCanvas.width = canvas.width;
        layerCanvas.height = canvas.height;
        const layerCtx = layerCanvas.getContext('2d');

        const img = new Image();
        img.onload = () => {
            layerCtx.drawImage(img, 0, 0);
            loadedCount++;
            if (loadedCount === stateData.length) {
                updateLayersUI();
                updateGlobalLayerControlsUI();
                compositeCanvasStack();
            }
        };
        img.src = storedLayer.data;

        return {
            id: storedLayer.id,
            name: storedLayer.name,
            canvas: layerCanvas,
            ctx: layerCtx,
            visible: storedLayer.visible,
            opacity: storedLayer.opacity,
            blendMode: storedLayer.blendMode,
            clipping: storedLayer.clipping,
            alphaLock: storedLayer.alphaLock
        };
    });

    if (!layers.some(l => l.id === activeLayerId)) {
        activeLayerId = layers[0].id;
    }
    updateHistoryButtons();
}

undoBtn.addEventListener('click', () => applyHistoryState(undoStack, redoStack));
redoBtn.addEventListener('click', () => applyHistoryState(redoStack, undoStack));

newFileBtn.addEventListener('click', () => {
    if (recordingInterval) clearInterval(recordingInterval);
    speedpaintFrames = [];
    workspace.classList.add('hidden');
    startMenu.classList.remove('hidden');
    menuDropdown.classList.remove('show');
    layerSidebar.classList.remove('show');
});

savePngBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'artwork.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    menuDropdown.classList.remove('show');
});

saveJpegBtn.addEventListener('click', () => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d');
    
    exportCtx.fillStyle = '#ffffff';
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    exportCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = 'artwork.jpg';
    link.href = exportCanvas.toDataURL('image/jpeg', 0.9);
    link.click();
    menuDropdown.classList.remove('show');
});

saveSvgBtn.addEventListener('click', () => {
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
        <image width="${canvas.width}" height="${canvas.height}" href="${canvas.toDataURL('image/png')}"/>
    </svg>`;
    
    const blob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
    const link = document.createElement('a');
    link.download = 'artwork.svg';
    link.href = URL.createObjectURL(blob);
    link.click();
    menuDropdown.classList.remove('show');
});

saveSpeedpaintBtn.addEventListener('click', () => {
    menuDropdown.classList.remove('show');
    if (speedpaintFrames.length === 0) {
        alert("Draw something first to generate recording data!");
        return;
    }

    const blobs = [];
    for (let i = 0; i < speedpaintFrames.length; i++) {
        const byteString = atob(speedpaintFrames[i].split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let j = 0; j < byteString.length; j++) {
            ia[j] = byteString.charCodeAt(j);
        }
        blobs.push(new Blob([ab], {type: 'image/jpeg'}));
    }

    const videoBlob = new Blob(blobs, { type: 'video/mp4' });
    const url = URL.createObjectURL(videoBlob);
    const link = document.createElement('a');
    link.download = 'speedpaint.mp4';
    link.href = url;
    link.click();
});

function startSpeedpaintRecording() {
    if (recordingInterval) clearInterval(recordingInterval);
    speedpaintFrames = [];
    speedpaintFrames.push(canvas.toDataURL('image/jpeg', 0.6));

    recordingInterval = setInterval(() => {
        if (drawing && speedpaintFrames.length < 2000) { 
            speedpaintFrames.push(canvas.toDataURL('image/jpeg', 0.6));
        }
    }, 100); 
}

function initCanvas(width, height) {
    canvas.width = width;
    canvas.height = height;
    
    alphaScratchCanvas.width = width;
    alphaScratchCanvas.height = height;
    alphaBackupCanvas.width = width;
    alphaBackupCanvas.height = height;
    selectionMaskCanvas.width = width;
    selectionMaskCanvas.height = height;

    startMenu.classList.add('hidden');
    workspace.classList.remove('hidden');
    
    transformContainer.style.width = canvas.width + 'px';
    transformContainer.style.height = canvas.height + 'px';
    
    layers = [];
    layerIdCounter = 0;
    
    createLayerElement("Layer 1");
    
    centerCanvas();
    attachDrawingListeners();
    updateBrushSizePreview();
    
    undoStack = [];
    redoStack = [];
    updateHistoryButtons();
    updateGlobalLayerControlsUI();

    startSpeedpaintRecording();
}

confirmBtn.addEventListener('click', () => {
    const w = parseInt(canvasWidthInput.value) || 800;
    const h = parseInt(canvasHeightInput.value) || 600;
    initCanvas(w, h);
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            initCanvas(img.width, img.height);
            const targetLayer = layers.find(l => l.id === activeLayerId);
            targetLayer.ctx.drawImage(img, 0, 0);
            compositeCanvasStack();
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(file);
});

// Advanced Color Wheel UI Engine: Hue Ring + Saturation/Lightness Square
function drawColorWheel() {
    const width = colorWheel.width;
    const height = colorWheel.height;
    const cx = width / 2;
    const cy = height / 2;
    const outerRadius = width / 2 - 2;
    const innerRadius = outerRadius - 20;
    const squareSize = Math.floor(innerRadius * Math.sqrt(2)) - 4;

    // Fill background space with structural gray to seamlessly blend panel layout profiles
    wheelCtx.fillStyle = '#2a2a2a';
    wheelCtx.fillRect(0, 0, width, height);

    // 1. Draw Hue Ring
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const d = Math.hypot(dx, dy);

            if (d >= innerRadius && d <= outerRadius) {
                const angle = Math.atan2(dy, dx) + Math.PI;
                const hue = (angle * 180) / Math.PI;
                wheelCtx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                wheelCtx.fillRect(x, y, 1, 1);
            }
        }
    }

    // 2. Draw Internal Saturation / Lightness Square
    const sx = cx - squareSize / 2;
    const sy = cy - squareSize / 2;
    for (let y = 0; y < squareSize; y++) {
        for (let x = 0; x < squareSize; x++) {
            const sat = (x / squareSize) * 100;
            const light = (1 - (y / squareSize)) * 100;
            wheelCtx.fillStyle = `hsl(${currentHue}, ${sat}%, ${light}%)`;
            wheelCtx.fillRect(sx + x, sy + y, 1, 1);
        }
    }

    // 3. Draw Ring Cursor
    const ringAngle = (currentHue - 180) * Math.PI / 180;
    const rx = cx + ((innerRadius + outerRadius) / 2) * Math.cos(ringAngle);
    const ry = cy + ((innerRadius + outerRadius) / 2) * Math.sin(ringAngle);
    drawCursorIndicator(rx, ry);

    // 4. Draw Square Cursor
    const cursorX = sx + (currentSat / 100) * squareSize;
    const cursorY = sy + (1 - (currentLight / 100)) * squareSize;
    drawCursorIndicator(cursorX, cursorY);
}

function drawCursorIndicator(x, y) {
    wheelCtx.save();
    wheelCtx.beginPath();
    wheelCtx.arc(x, y, 5, 0, Math.PI * 2);
    wheelCtx.strokeStyle = '#ffffff';
    wheelCtx.lineWidth = 2;
    wheelCtx.stroke();
    wheelCtx.beginPath();
    wheelCtx.arc(x, y, 6, 0, Math.PI * 2);
    wheelCtx.strokeStyle = '#000000';
    wheelCtx.lineWidth = 1;
    wheelCtx.stroke();
    wheelCtx.restore();
}

colorWheel.addEventListener('pointerdown', selectWheelColor);
colorWheel.addEventListener('pointermove', (e) => {
    if (e.buttons === 1) selectWheelColor(e);
});

function selectWheelColor(e) {
    const rect = colorWheel.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);

    const cx = colorWheel.width / 2;
    const cy = colorWheel.height / 2;
    const outerRadius = colorWheel.width / 2 - 2;
    const innerRadius = outerRadius - 20;
    const squareSize = Math.floor(innerRadius * Math.sqrt(2)) - 4;
    const sx = cx - squareSize / 2;
    const sy = cy - squareSize / 2;

    const dx = x - cx;
    const dy = y - cy;
    const d = Math.hypot(dx, dy);

    if (d >= innerRadius && d <= outerRadius) {
        const angle = Math.atan2(dy, dx) + Math.PI;
        currentHue = Math.round((angle * 180) / Math.PI);
        updateHexFromHsl();
    } else if (x >= sx && x <= sx + squareSize && y >= sy && y <= sy + squareSize) {
        currentSat = Math.round(((x - sx) / squareSize) * 100);
        currentLight = Math.round((1 - ((y - sy) / squareSize)) * 100);
        updateHexFromHsl();
    }
}

function updateHexFromHsl() {
    const dummy = document.createElement('div');
    dummy.style.color = `hsl(${currentHue}, ${currentSat}%, ${currentLight}%)`;
    document.body.appendChild(dummy);
    const rgb = window.getComputedStyle(dummy).color;
    document.body.removeChild(dummy);

    const matches = rgb.match(/\d+/g);
    if (matches) {
        const r = parseInt(matches[0]), g = parseInt(matches[1]), b = parseInt(matches[2]);
        const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        activeColor = hex;
        hexInput.value = hex;
        drawColorWheel();
        updateBrushSizePreview();
    }
}

function updateHslFromHex(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; 
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    currentHue = Math.round(h * 360);
    currentSat = Math.round(s * 100);
    currentLight = Math.round(l * 100);
    drawColorWheel();
}

hexInput.addEventListener('change', (e) => {
    let val = e.target.value;
    if(!val.startsWith('#')) val = '#' + val;
    if(/^#[0-9A-F]{6}$/i.test(val)) {
        activeColor = val;
        updateHslFromHex(val);
        updateBrushSizePreview();
    } else {
        hexInput.value = activeColor;
    }
});

function commitColorToPalette(hex) {
    if (recentColors[0] !== hex) {
        recentColors.unshift(hex);
        recentColors.pop();
        renderPalette();
    }
}

function renderPalette() {
    paletteGrid.innerHTML = '';
    recentColors.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        swatch.addEventListener('click', () => {
            activeColor = color;
            hexInput.value = color;
            updateHslFromHex(color);
            updateBrushSizePreview();
        });
        paletteGrid.appendChild(swatch);
    });
}
renderPalette();

// Core Drawing Logic
function attachDrawingListeners() {
    canvas.addEventListener('pointerdown', startDrawing);
    canvas.addEventListener('pointermove', drawStroke);
    window.addEventListener('pointerup', stopDrawing);
}

// Coordinate Translator
function getCanvasCoordinates(e) {
    const rect = transformContainer.getBoundingClientRect();
    const rad = (-rotation * Math.PI) / 180;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    
    const xRot = (e.clientX - cx) * Math.cos(rad) - (e.clientY - cy) * Math.sin(rad);
    const yRot = (e.clientX - cx) * Math.sin(rad) + (e.clientY - cy) * Math.cos(rad);
    
    return {
        x: xRot / scale + canvas.width / 2,
        y: yRot / scale + canvas.height / 2
    };
}

let lastCoords = null;
let transformStartCoords = null;

function startDrawing(e) {
    if (activePointers.length >= 2) return; 
    
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer || !activeLayer.visible) return; 

    const coords = getCanvasCoordinates(e);
    lastCoords = coords;

    if (currentTool === 'lasso') {
        lassoPoints = [coords];
        drawing = true;
        return;
    }

    if (currentTool === 'transform') {
        drawing = true;
        transformStartCoords = { x: e.clientX, y: e.clientY };
        return;
    }

    saveHistoryState(); 
    drawing = true;
    strokeHasPainted = false; 

    if (activeLayer.alphaLock) {
        alphaBackupCtx.clearRect(0, 0, canvas.width, canvas.height);
        alphaBackupCtx.drawImage(activeLayer.canvas, 0, 0);
        alphaScratchCtx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    drawStroke(e);
}

function drawStroke(e) {
    if (!drawing || activePointers.length >= 2 || !lastCoords) return;
    
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer) return;

    const coords = getCanvasCoordinates(e);
    
    if (currentTool === 'lasso') {
        lassoPoints.push(coords);
        compositeCanvasStack();
        return;
    }

    if (currentTool === 'transform') {
        layerOffsetX += (e.clientX - transformStartCoords.x) / scale;
        layerOffsetY += (e.clientY - transformStartCoords.y) / scale;
        transformStartCoords = { x: e.clientX, y: e.clientY };
        compositeCanvasStack();
        return;
    }

    strokeHasPainted = true;
    
    if (activeLayer.alphaLock) {
        if (currentTool === 'eraser') {
            // FIXED Path: Clear color directly inside the active layout copying profile channel boundaries
            activeLayer.ctx.save();
            activeLayer.ctx.lineWidth = currentBrushSize;
            activeLayer.ctx.lineCap = 'round';
            activeLayer.ctx.lineJoin = 'round';
            activeLayer.ctx.globalAlpha = currentOpacity;
            activeLayer.ctx.globalCompositeOperation = 'destination-out';
            activeLayer.ctx.strokeStyle = 'rgba(0,0,0,1.0)';
            activeLayer.ctx.beginPath();
            activeLayer.ctx.moveTo(lastCoords.x, lastCoords.y);
            activeLayer.ctx.lineTo(coords.x, coords.y);
            activeLayer.ctx.stroke();
            activeLayer.ctx.restore();
        } else {
            // Brush Path: Render additions strictly clipped into alpha parameters
            alphaScratchCtx.save();
            alphaScratchCtx.lineWidth = currentBrushSize;
            alphaScratchCtx.lineCap = 'round';
            alphaScratchCtx.lineJoin = 'round';
            alphaScratchCtx.globalAlpha = currentOpacity;
            alphaScratchCtx.globalCompositeOperation = 'source-over';
            alphaScratchCtx.strokeStyle = activeColor;
            alphaScratchCtx.beginPath();
            alphaScratchCtx.moveTo(lastCoords.x, lastCoords.y);
            alphaScratchCtx.lineTo(coords.x, coords.y);
            alphaScratchCtx.stroke();
            alphaScratchCtx.restore();

            activeLayer.ctx.clearRect(0, 0, canvas.width, canvas.height);
            activeLayer.ctx.drawImage(alphaScratchCanvas, 0, 0);
            activeLayer.ctx.save();
            activeLayer.ctx.globalCompositeOperation = 'destination-over';
            activeLayer.ctx.drawImage(alphaBackupCanvas, 0, 0);
            activeLayer.ctx.globalCompositeOperation = 'destination-in';
            activeLayer.ctx.drawImage(alphaBackupCanvas, 0, 0);
            activeLayer.ctx.restore();
        }
    } else {
        activeLayer.ctx.save();
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

function stopDrawing() {
    if (!drawing) return;
    drawing = false;
    lastCoords = null;

    const activeLayer = layers.find(l => l.id === activeLayerId);

    if (currentTool === 'lasso' && lassoPoints.length > 2) {
        // Enforce boundary parameters closing selection vector masks
        selectionMaskCtx.clearRect(0, 0, canvas.width, canvas.height);
        selectionMaskCtx.fillStyle = 'rgba(0,0,0,1.0)';
        selectionMaskCtx.beginPath();
        selectionMaskCtx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
        for(let i=1; i<lassoPoints.length; i++) {
            selectionMaskCtx.lineTo(lassoPoints[i].x, lassoPoints[i].y);
        }
        selectionMaskCtx.closePath();
        selectionMaskCtx.fill();
        hasActiveSelection = true;
        compositeCanvasStack();
        return;
    }

    if (currentTool === 'transform' && transformTargetData && activeLayer) {
        // Render translated updates back down to layer surface textures cleanly
        activeLayer.ctx.save();
        activeLayer.ctx.translate(canvas.width / 2 + layerOffsetX, canvas.height / 2 + layerOffsetY);
        activeLayer.ctx.scale(initialTransformScale, initialTransformScale);
        activeLayer.ctx.drawImage(transformTargetData, -canvas.width / 2, -canvas.height / 2);
        activeLayer.ctx.restore();
        
        transformTargetData = null;
        hasActiveSelection = false;
        lassoPoints = [];
        compositeCanvasStack();
        return;
    }
    
    if (strokeHasPainted && currentTool === 'brush') {
        commitColorToPalette(activeColor);
    }
    
    updateLayersUI();
    speedpaintFrames.push(canvas.toDataURL('image/jpeg', 0.6));
}

// Global Workspace Gestures (Pinch-to-Zoom handling when Tool != Transform)
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
    
    if (activePointers.length === 1 && e.target !== canvas) {
        isPanning = true;
        startPanX = e.clientX - panX;
        startPanY = e.clientY - panY;
    } else if (activePointers.length === 2) {
        if (drawing) stopDrawing(); 
        
        isPanning = false;
        initialTouchDist = getDistance(activePointers[0], activePointers[1]);
        initialTouchAngle = getAngle(activePointers[0], activePointers[1]);
        initialScale = currentTool === 'transform' ? initialTransformScale : scale;
        initialRotation = rotation;
        
        startPanX = ((activePointers[0].clientX + activePointers[1].clientX) / 2) - panX;
        startPanY = ((activePointers[0].clientY + activePointers[1].clientY) / 2) - panY;
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

        if (currentTool === 'transform') {
            // Interpret dynamic touch adjustments to scale selected items
            initialTransformScale = initialScale * (currentDist / initialTouchDist);
            compositeCanvasStack();
        } else {
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
        isPanning = true;
        startPanX = activePointers[0].clientX - panX;
        startPanY = activePointers[0].clientY - panY;
    } else {
        isPanning = false;
    }
}

window.addEventListener('pointerup', handlePointerUp);
window.addEventListener('pointercancel', handlePointerUp);

workspace.addEventListener('wheel', (e) => {
    if (e.target.closest('.top-bar') || e.target.closest('.left-controls') || e.target.closest('.color-panel') || e.target.closest('.layer-sidebar')) return;
    e.preventDefault();
    
    if (currentTool === 'transform') {
        initialTransformScale *= e.deltaY < 0 ? 1.1 : 0.9;
        compositeCanvasStack();
    } else {
        const zoomFactor = 1.1;
        let targetScale = scale;
        if (e.deltaY < 0) {
            targetScale *= zoomFactor;
        } else {
            targetScale /= zoomFactor;
        }
        scale = Math.max(0.1, Math.min(targetScale, 10));
        applyTransforms();
    }
}, { passive: false });
