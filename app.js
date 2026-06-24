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

// NEW Brush UI Elements
const brushLibraryPanel = document.getElementById('brushLibraryPanel');
const brushCategoryColumn = document.getElementById('brushCategoryColumn');
const brushVariantsColumn = document.getElementById('brushVariantsColumn');
const brushSettingsModal = document.getElementById('brushSettingsModal');
const closeBrushSettingsBtn = document.getElementById('closeBrushSettingsBtn');
const brushSettingsTitle = document.getElementById('brushSettingsTitle');

// Brush Settings Input Controls
const brushSettingSpacing = document.getElementById('brushSettingSpacing');
const brushSettingStabilization = document.getElementById('brushSettingStabilization');
const brushSettingTexture = document.getElementById('brushSettingTexture');
const brushSettingPressureSize = document.getElementById('brushSettingPressureSize');
const brushSettingPressureOpacity = document.getElementById('brushSettingPressureOpacity');
const brushSettingParticleCap = document.getElementById('brushSettingParticleCap');

// State Tracking
let scale = 1;
let panX = 0;
let panY = 0;
let rotation = 0; 

let drawing = false;
let currentBrushSize = 10;
let currentOpacity = 1.0;
let activeColor = '#000000';
let currentTool = 'brush'; 
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

// iOS Double-Tap System Zoom Prevention Engine
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault(); 
    }
    lastTouchEnd = now;
}, { passive: false });

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
        }
    };

    container.addEventListener('pointerup', stopDrag);
    container.addEventListener('pointercancel', stopDrag);
}

setupCustomSlider(sizeSlider, sizeTrackFill, sizeHandle, sizeBubble, 1, 100, 10, (val) => {
    currentBrushSize = Math.round(val);
});

setupCustomSlider(opacSlider, opacTrackFill, opacHandle, opacBubble, 0, 100, 100, (val) => {
    currentOpacity = val / 100;
});

// Tool Switching
brushBtn.addEventListener('click', (e) => {
    if (currentTool === 'brush') {
        e.stopPropagation();
        menuDropdown.classList.remove('show');
        colorPanel.classList.remove('show');
        layerSidebar.classList.remove('show');
        brushLibraryPanel.classList.toggle('show');
        if (brushLibraryPanel.classList.contains('show')) {
            renderBrushLibrary();
        }
    } else {
        currentTool = 'brush';
        brushBtn.classList.add('active');
        eraserBtn.classList.remove('active');
    }
});

eraserBtn.addEventListener('click', () => {
    currentTool = 'eraser';
    eraserBtn.classList.add('active');
    brushBtn.classList.remove('active');
    brushLibraryPanel.classList.remove('show');
});

// Sidebar & Dropdown Trigger Logic
menuBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    colorPanel.classList.remove('show');
    brushLibraryPanel.classList.remove('show');
    menuDropdown.classList.toggle('show');
});

colorBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    menuDropdown.classList.remove('show');
    brushLibraryPanel.classList.remove('show');
    colorPanel.classList.toggle('show');
    if (colorPanel.classList.contains('show')) drawColorWheel();
});

layerPanelBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    menuDropdown.classList.remove('show');
    colorPanel.classList.remove('show');
    brushLibraryPanel.classList.remove('show');
    layerSidebar.classList.toggle('show');
});

closeColorBtn.addEventListener('click', () => {
    colorPanel.classList.remove('show');
});

// Global Tap Listener
window.addEventListener('pointerdown', (e) => {
    if (layerSidebar.contains(e.target) || layerPanelBtn.contains(e.target)) return; 
    if (brushLibraryPanel.contains(e.target) || e.target.closest('#brushBtn') || e.target.closest('.brush-settings-modal')) return;

    if (!menuDropdown.contains(e.target) && e.target !== menuBtn) {
        menuDropdown.classList.remove('show');
    }
    if (!colorPanel.contains(e.target) && !colorBtn.contains(e.target)) {
        colorPanel.classList.remove('show');
    }
    brushLibraryPanel.classList.remove('show');
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
        
        item.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('select') || e.target.closest('input')) return;
            activeLayerId = layer.id;
            updateLayersUI();
            updateGlobalLayerControlsUI();
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
    brushLibraryPanel.classList.remove('show');
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

    startMenu.classList.add('hidden');
    workspace.classList.remove('hidden');
    
    transformContainer.style.width = canvas.width + 'px';
    transformContainer.style.height = canvas.height + 'px';
    
    layers = [];
    layerIdCounter = 0;
    
    createLayerElement("Layer 1");
    
    centerCanvas();
    attachDrawingListeners();
    
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

// Color Wheel UI
function drawColorWheel() {
    const width = colorWheel.width;
    const height = colorWheel.height;
    const cx = width / 2;
    const cy = height / 2;
    const r = width / 2;

    wheelCtx.clearRect(0,0,width,height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const d = Math.hypot(dx, dy);

            if (d <= r) {
                const angle = Math.atan2(dy, dx) + Math.PI;
                const hue = (angle * 180) / Math.PI;
                const sat = d / r;
                wheelCtx.fillStyle = `hsl(${hue}, ${sat * 100}%, 50%)`;
                wheelCtx.fillRect(x, y, 1, 1);
            }
        }
    }
}

colorWheel.addEventListener('pointerdown', selectWheelColor);
colorWheel.addEventListener('pointermove', (e) => {
    if (e.buttons === 1) selectWheelColor(e);
});

function selectWheelColor(e) {
    const rect = colorWheel.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);

    if(x >= 0 && x < colorWheel.width && y >= 0 && y < colorWheel.height) {
        const imgData = wheelCtx.getImageData(x, y, 1, 1).data;
        if (imgData[3] > 0) {
            const hex = "#" + ((1 << 24) + (imgData[0] << 16) + (imgData[1] << 8) + imgData[2]).toString(16).slice(1);
            activeColor = hex;
            hexInput.value = hex;
        }
    }
}

hexInput.addEventListener('change', (e) => {
    let val = e.target.value;
    if(!val.startsWith('#')) val = '#' + val;
    if(/^#[0-9A-F]{6}$/i.test(val)) {
        activeColor = val;
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
        });
        paletteGrid.appendChild(swatch);
    });
}
renderPalette();

/* ==========================================
   NEW MODULAR BRUSH ENGINE ARCHITECTURE
   ========================================== */
const BrushEngine = {
    selectedCategory: 'ink',
    selectedBrushId: 'hard_ink',
    favorites: [],
    
    registry: {
        ink: {
            name: "Ink",
            brushes: {
                hard_ink: { name: "Hard Ink", desc: "Crisp lines & high stability", spacing: 0.03, stabilization: 12, texture: "none", pressureSize: true, pressureOpacity: false, particleCap: 100 },
                soft_ink: { name: "Soft Ink", desc: "Slightly feathered edges", spacing: 0.04, stabilization: 8, texture: "none", pressureSize: true, pressureOpacity: true, particleCap: 100 },
                calligraphy: { name: "Calligraphy Ink", desc: "Directional width variations", spacing: 0.02, stabilization: 15, texture: "none", pressureSize: true, pressureOpacity: false, particleCap: 100, isCalligraphy: true }
            }
        },
        pencil: {
            name: "Pencil",
            brushes: {
                light_pencil: { name: "Light Pencil", desc: "Low opacity sketch graphite", spacing: 0.12, stabilization: 2, texture: "grainy", pressureSize: false, pressureOpacity: true, particleCap: 120 },
                graphite_pencil: { name: "Graphite Pencil", desc: "Strong heavy texture grain", spacing: 0.08, stabilization: 4, texture: "grainy", pressureSize: true, pressureOpacity: true, particleCap: 150 },
                mechanical: { name: "Mechanical Pen", desc: "Clean consistent precision", spacing: 0.04, stabilization: 3, texture: "none", pressureSize: false, pressureOpacity: false, particleCap: 100 }
            }
        },
        sketch: {
            name: "Sketch",
            brushes: {
                rough_sketch: { name: "Rough Sketch", desc: "Low stability fast response", spacing: 0.06, stabilization: 1, texture: "grainy", pressureSize: true, pressureOpacity: true, particleCap: 100 },
                clean_sketch: { name: "Clean Sketch", desc: "Balanced smoothing controls", spacing: 0.04, stabilization: 8, texture: "none", pressureSize: true, pressureOpacity: true, particleCap: 100 },
                gesture: { name: "Gesture Layout", desc: "Very thin faint ideation lines", spacing: 0.05, stabilization: 2, texture: "none", pressureSize: false, pressureOpacity: false, opacityOverride: 0.2, particleCap: 100 }
            }
        },
        marker: {
            name: "Marker",
            brushes: {
                chisel: { name: "Chisel Marker", desc: "Broad angled flat stroke edges", spacing: 0.02, stabilization: 5, texture: "none", pressureSize: false, pressureOpacity: true, isChisel: true, particleCap: 100 },
                round: { name: "Round Marker", desc: "Uniform dense broad coverage", spacing: 0.03, stabilization: 4, texture: "none", pressureSize: false, pressureOpacity: false, particleCap: 100 },
                soft_marker: { name: "Soft Marker", desc: "Blended edges and rich falloff", spacing: 0.05, stabilization: 6, texture: "none", pressureSize: false, pressureOpacity: true, particleCap: 100 }
            }
        },
        pen: {
            name: "Pen",
            brushes: {
                fine_liner: { name: "Fine Liner", desc: "Thin completely uniform paths", spacing: 0.04, stabilization: 4, texture: "none", pressureSize: false, pressureOpacity: false, particleCap: 100 },
                technical: { name: "Technical Pen", desc: "High strict uniformity mapping", spacing: 0.02, stabilization: 10, texture: "none", pressureSize: false, pressureOpacity: false, particleCap: 100 },
                brush_pen: { name: "Brush Pen", desc: "Tapered dynamic pressure width", spacing: 0.03, stabilization: 9, texture: "none", pressureSize: true, pressureOpacity: false, particleCap: 100 }
            }
        },
        spray: {
            name: "Spray Paint",
            brushes: {
                soft_spray: { name: "Soft Spray", desc: "Wide scatter air-borne dots", spacing: 0.15, stabilization: 2, texture: "splat", pressureSize: true, pressureOpacity: true, isAirbrushOrSpray: true, scatterAmt: 25, particleCap: 150 },
                hard_spray: { name: "Hard Spray", desc: "Dense tight grouped droplets", spacing: 0.08, stabilization: 3, texture: "splat", pressureSize: false, pressureOpacity: true, isAirbrushOrSpray: true, scatterAmt: 10, particleCap: 250 },
                splatter: { name: "Splatter Spray", desc: "High random chaotic splotches", spacing: 0.30, stabilization: 1, texture: "splat", pressureSize: true, pressureOpacity: true, isAirbrushOrSpray: true, scatterAmt: 45, particleCap: 80 }
            }
        },
        airbrush: {
            name: "Airbrush",
            brushes: {
                soft_airbrush: { name: "Soft Airbrush", desc: "Smooth wide gradient fading", spacing: 0.02, stabilization: 5, texture: "none", pressureSize: false, pressureOpacity: true, isAirbrushOrSpray: true, scatterAmt: 15, particleCap: 300 },
                controlled: { name: "Controlled Air", desc: "Balanced stream density flow", spacing: 0.03, stabilization: 6, texture: "none", pressureSize: false, pressureOpacity: true, isAirbrushOrSpray: true, scatterAmt: 8, particleCap: 200 },
                focused: { name: "Focused Air", desc: "Narrow intense precision spray", spacing: 0.02, stabilization: 7, texture: "none", pressureSize: true, pressureOpacity: true, isAirbrushOrSpray: true, scatterAmt: 3, particleCap: 150 }
            }
        },
        watercolor: {
            name: "Watercolor",
            brushes: {
                light_wash: { name: "Light Wash", desc: "Low opacity soft layering layers", spacing: 0.06, stabilization: 4, texture: "splat", pressureSize: false, pressureOpacity: true, opacityOverride: 0.15, particleCap: 120 },
                wet_blend: { name: "Wet Blend", desc: "High diffusion blending bleed", spacing: 0.04, stabilization: 6, texture: "splat", pressureSize: true, pressureOpacity: true, isWet: true, particleCap: 180 },
                pigment_heavy: { name: "Pigment Wash", desc: "Heavy dark fringing borders", spacing: 0.03, stabilization: 8, texture: "grainy", pressureSize: true, pressureOpacity: false, isWet: true, particleCap: 220 }
            }
        }
    },

    getActiveBrush() {
        if (this.selectedCategory === 'favorites') {
            return this.favorites.find(b => b.uid === this.selectedBrushId)?.config;
        }
        return this.registry[this.selectedCategory]?.brushes[this.selectedBrushId];
    },

    renderStrokeSegment(ctx, p1, p2, size, opacity, color, pressure) {
        const config = this.getActiveBrush() || { spacing: 0.04, stabilization: 5, texture: "none" };
        
        let calcSize = size;
        if (config.pressureSize) calcSize *= (pressure * 1.3 || 0.5);
        if (calcSize < 0.5) calcSize = 0.5;

        let calcOpacity = opacity;
        if (config.pressureOpacity) calcOpacity *= (pressure || 0.5);
        if (config.opacityOverride !== undefined) calcOpacity *= config.opacityOverride;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.globalAlpha = calcOpacity;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Custom Rendering Pipelines based on configuration properties
        if (config.isAirbrushOrSpray) {
            const loops = Math.min(config.particleCap || 100, Math.floor(calcSize * (config.scatterAmt || 10) * 0.15));
            for (let i = 0; i < loops; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * calcSize * 1.5;
                const pX = p2.x + Math.cos(angle) * radius;
                const pY = p2.y + Math.sin(angle) * radius;
                ctx.globalAlpha = calcOpacity * (1.0 - (radius / (calcSize * 1.5)));
                ctx.beginPath();
                ctx.arc(pX, pY, Math.max(0.4, Math.random() * (calcSize * 0.08)), 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (config.isChisel) {
            ctx.lineWidth = calcSize;
            ctx.beginPath();
            ctx.moveTo(p1.x - calcSize * 0.4, p1.y - calcSize * 0.2);
            ctx.lineTo(p2.x - calcSize * 0.4, p2.y - calcSize * 0.2);
            ctx.lineTo(p2.x + calcSize * 0.4, p2.y + calcSize * 0.2);
            ctx.lineTo(p1.x + calcSize * 0.4, p1.y + calcSize * 0.2);
            ctx.closePath();
            ctx.fill();
        } else if (config.isCalligraphy) {
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const heading = Math.atan2(dy, dx);
            const factor = Math.abs(Math.sin(heading - Math.PI / 4));
            ctx.lineWidth = calcSize * (0.3 + factor * 1.2);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        } else if (config.isWet) {
            ctx.beginPath();
            ctx.arc(p2.x, p2.y, calcSize * 1.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = calcOpacity * 0.3;
            ctx.lineWidth = calcSize * 1.4;
            ctx.beginPath();
            ctx.arc(p2.x, p2.y, calcSize * 1.4, 0, Math.PI * 2);
            ctx.stroke();
        } else if (config.texture === 'grainy') {
            ctx.lineWidth = calcSize;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            
            ctx.globalCompositeOperation = 'destination-out';
            ctx.globalAlpha = 0.15;
            for (let i = 0; i < calcSize * 2; i++) {
                const rx = p2.x + (Math.random() - 0.5) * calcSize;
                const ry = p2.y + (Math.random() - 0.5) * calcSize;
                ctx.fillRect(rx, ry, 1, 1);
            }
        } else if (config.texture === 'splat') {
            ctx.lineWidth = calcSize;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            for (let i = 0; i < 3; i++) {
                const offX = p2.x + (Math.random() - 0.5) * calcSize * 1.4;
                const offY = p2.y + (Math.random() - 0.5) * calcSize * 1.4;
                ctx.beginPath();
                ctx.arc(offX, offY, calcSize * 0.15, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            ctx.lineWidth = calcSize;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }

        ctx.restore();
    }
};

// UI Rendering Engine logic for the Brush Categories/Variants
function renderBrushLibrary() {
    brushCategoryColumn.innerHTML = '';
    
    // 1. Favorites Category Tab Button Element
    const favTab = document.createElement('button');
    favTab.className = `category-tab-btn ${BrushEngine.selectedCategory === 'favorites' ? 'active' : ''}`;
    favTab.innerHTML = `★ Favorites (${BrushEngine.favorites.length})`;
    favTab.addEventListener('click', () => {
        BrushEngine.selectedCategory = 'favorites';
        renderBrushLibrary();
    });
    brushCategoryColumn.appendChild(favTab);

    // 2. Standard Registered Category Tabs
    Object.keys(BrushEngine.registry).forEach(catKey => {
        const cat = BrushEngine.registry[catKey];
        const tab = document.createElement('button');
        tab.className = `category-tab-btn ${BrushEngine.selectedCategory === catKey ? 'active' : ''}`;
        tab.textContent = cat.name;
        tab.addEventListener('click', () => {
            BrushEngine.selectedCategory = catKey;
            const firstBrushId = Object.keys(cat.brushes)[0];
            if (firstBrushId) BrushEngine.selectedBrushId = firstBrushId;
            renderBrushLibrary();
        });
        brushCategoryColumn.appendChild(tab);
    });

    // 3. Render Right-Hand Column Brush Variant Cards
    brushVariantsColumn.innerHTML = '';
    let variantPool = {};
    
    if (BrushEngine.selectedCategory === 'favorites') {
        BrushEngine.favorites.forEach(fav => {
            variantPool[fav.uid] = fav.config;
        });
    } else {
        variantPool = BrushEngine.registry[BrushEngine.selectedCategory]?.brushes || {};
    }

    Object.keys(variantPool).forEach(bId => {
        const brush = variantPool[bId];
        const card = document.createElement('div');
        card.className = `brush-variant-card ${BrushEngine.selectedBrushId === bId ? 'active' : ''}`;
        
        card.addEventListener('click', () => {
            BrushEngine.selectedBrushId = bId;
            renderBrushLibrary();
        });

        const nameText = document.createElement('div');
        nameText.className = 'brush-card-name';
        nameText.textContent = brush.name;

        const descText = document.createElement('div');
        descText.className = 'brush-card-desc';
        descText.textContent = brush.desc || "Configurable preset";

        // Star Toggle Behavior Icon
        const star = document.createElement('span');
        const isCurrentlyStarred = BrushEngine.favorites.some(f => f.uid === bId || (BrushEngine.selectedCategory !== 'favorites' && f.uid === `${BrushEngine.selectedCategory}_${bId}`));
        star.className = `brush-card-star ${isCurrentlyStarred ? 'starred' : ''}`;
        star.innerHTML = '★';
        star.addEventListener('click', (e) => {
            e.stopPropagation();
            const lookupId = BrushEngine.selectedCategory === 'favorites' ? bId : `${BrushEngine.selectedCategory}_${bId}`;
            if (BrushEngine.favorites.some(f => f.uid === lookupId)) {
                BrushEngine.favorites = BrushEngine.favorites.filter(f => f.uid !== lookupId);
                if (BrushEngine.selectedCategory === 'favorites') BrushEngine.selectedBrushId = '';
            } else {
                BrushEngine.favorites.push({ uid: lookupId, config: brush });
            }
            renderBrushLibrary();
        });

        // Settings Parameter Configuration Trigger Icon
        const gear = document.createElement('span');
        gear.className = 'brush-card-gear';
        gear.innerHTML = '&#9881;';
        gear.addEventListener('click', (e) => {
            e.stopPropagation();
            openBrushSettingsModal(bId, brush);
        });

        card.appendChild(nameText);
        card.appendChild(descText);
        card.appendChild(star);
        card.appendChild(gear);
        brushVariantsColumn.appendChild(card);
    });
}

// Gear Configuration Modal Bindings Logic
let tuningBrushRef = null;
function openBrushSettingsModal(id, brush) {
    tuningBrushRef = brush;
    brushSettingsTitle.textContent = `${brush.name} Configuration`;
    
    brushSettingSpacing.value = brush.spacing;
    brushSettingStabilization.value = brush.stabilization;
    brushSettingTexture.value = brush.texture;
    brushSettingPressureSize.checked = brush.pressureSize;
    brushSettingPressureOpacity.checked = brush.pressureOpacity;
    brushSettingParticleCap.value = brush.particleCap || 100;

    brushSettingsModal.classList.add('show');
}

closeBrushSettingsBtn.addEventListener('click', () => {
    brushSettingsModal.classList.remove('show');
});

[brushSettingSpacing, brushSettingStabilization, brushSettingTexture, brushSettingParticleCap].forEach(ctrl => {
    ctrl.addEventListener('change', () => {
        if (!tuningBrushRef) return;
        tuningBrushRef.spacing = parseFloat(brushSettingSpacing.value);
        tuningBrushRef.stabilization = parseInt(brushSettingStabilization.value);
        tuningBrushRef.texture = brushSettingTexture.value;
        tuningBrushRef.particleCap = parseInt(brushSettingParticleCap.value);
    });
});

[brushSettingPressureSize, brushSettingPressureOpacity].forEach(ctrl => {
    ctrl.addEventListener('click', () => {
        if (!tuningBrushRef) return;
        tuningBrushRef.pressureSize = brushSettingPressureSize.checked;
        tuningBrushRef.pressureOpacity = brushSettingPressureOpacity.checked;
    });
});

// Structural Canvas Coordinates Solver
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

// Drawing Pipeline Initialization
function attachDrawingListeners() {
    canvas.addEventListener('pointerdown', startDrawing);
    canvas.addEventListener('pointermove', drawStroke);
    window.addEventListener('pointerup', stopDrawing);
}

let lastCoords = null;
let stabilizationHistory = [];

function startDrawing(e) {
    if (activePointers.length >= 2) return; 
    
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer || !activeLayer.visible) return; 

    saveHistoryState(); 
    drawing = true;
    strokeHasPainted = false; 

    const coords = getCanvasCoordinates(e);
    lastCoords = coords;
    
    stabilizationHistory = [];
    stabilizationHistory.push(coords);

    if (activeLayer.alphaLock) {
        alphaBackupCtx.clearRect(0, 0, canvas.width, canvas.height);
        alphaBackupCtx.drawImage(activeLayer.canvas, 0, 0);
        alphaScratchCtx.clearRect(0, 0, canvas.width, canvas.height);
        alphaScratchCtx.drawImage(activeLayer.canvas, 0, 0);
    }
    
    drawStroke(e);
}

function drawStroke(e) {
    if (!drawing || activePointers.length >= 2 || !lastCoords) return;
    
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer) return;

    strokeHasPainted = true;
    const rawCoords = getCanvasCoordinates(e);
    
    // Centralized Stabilization & Smoothing Engine Filter
    const activeBrushConfig = BrushEngine.getActiveBrush() || { stabilization: 5, spacing: 0.04 };
    stabilizationHistory.push(rawCoords);
    if (stabilizationHistory.length > activeBrushConfig.stabilization) {
        stabilizationHistory.shift();
    }
    
    let sumX = 0, sumY = 0;
    stabilizationHistory.forEach(pt => { sumX += pt.x; sumY += pt.y; });
    const coords = {
        x: sumX / stabilizationHistory.length,
        y: sumY / stabilizationHistory.length
    };

    // Sub-segment Distance Interpolation Generator Loop based on Spacing Parameter values
    const distance = Math.hypot(coords.x - lastCoords.x, coords.y - lastCoords.y);
    const minSpacingDist = Math.max(1, currentBrushSize * activeBrushConfig.spacing);
    const steps = Math.floor(distance / minSpacingDist);
    
    const targetCtx = activeLayer.alphaLock ? alphaScratchCtx : activeLayer.ctx;

    if (activeLayer.alphaLock) {
        alphaScratchCtx.clearRect(0, 0, canvas.width, canvas.height);
        alphaScratchCtx.drawImage(alphaBackupCanvas, 0, 0);
    }

    if (currentTool === 'eraser') {
        targetCtx.save();
        targetCtx.lineWidth = currentBrushSize;
        targetCtx.lineCap = 'round';
        targetCtx.lineJoin = 'round';
        targetCtx.globalCompositeOperation = 'destination-out';
        targetCtx.strokeStyle = 'rgba(0,0,0,1.0)';
        targetCtx.beginPath();
        targetCtx.moveTo(lastCoords.x, lastCoords.y);
        targetCtx.lineTo(coords.x, coords.y);
        targetCtx.stroke();
        targetCtx.restore();
    } else {
        // Core routing loop mapping processed segments into active brush instance
        if (steps > 0) {
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const p1 = {
                    x: lastCoords.x + (coords.x - lastCoords.x) * (Math.max(0, t - 0.1)),
                    y: lastCoords.y + (coords.y - lastCoords.y) * (Math.max(0, t - 0.1))
                };
                const p2 = {
                    x: lastCoords.x + (coords.x - lastCoords.x) * t,
                    y: lastCoords.y + (coords.y - lastCoords.y) * t
                };
                BrushEngine.renderStrokeSegment(targetCtx, p1, p2, currentBrushSize, currentOpacity, activeColor, e.pressure || 0.5);
            }
        } else {
            BrushEngine.renderStrokeSegment(targetCtx, lastCoords, coords, currentBrushSize, currentOpacity, activeColor, e.pressure || 0.5);
        }
    }

    if (activeLayer.alphaLock) {
        activeLayer.ctx.clearRect(0, 0, canvas.width, canvas.height);
        activeLayer.ctx.drawImage(alphaScratchCanvas, 0, 0);
        activeLayer.ctx.save();
        activeLayer.ctx.globalCompositeOperation = 'destination-in';
        activeLayer.ctx.drawImage(alphaBackupCanvas, 0, 0);
        activeLayer.ctx.restore();
    }
    
    lastCoords = coords;
    compositeCanvasStack();
}

function stopDrawing() {
    if (drawing) {
        drawing = false;
        lastCoords = null;
        stabilizationHistory = [];
        
        if (strokeHasPainted && currentTool === 'brush') {
            commitColorToPalette(activeColor);
        }
        
        updateLayersUI();
        speedpaintFrames.push(canvas.toDataURL('image/jpeg', 0.6));
    }
}

// Global Workspace Gestures (Zooming Allowed Everywhere)
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
    if (e.target.closest('.top-bar') || e.target.closest('.left-controls') || e.target.closest('.color-panel') || e.target.closest('.layer-sidebar') || e.target.closest('.brush-settings-modal')) return;

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
        initialScale = scale;
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

        let targetScale = initialScale * (currentDist / initialTouchDist);
        scale = Math.max(0.1, Math.min(targetScale, 10));
        rotation = initialRotation + (currentAngle - initialTouchAngle);

        const currentMidX = (activePointers[0].clientX + activePointers[1].clientX) / 2;
        const currentMidY = (activePointers[0].clientY + activePointers[1].clientY) / 2;
        
        panX = currentMidX - startPanX;
        panY = currentMidY - startPanY;

        applyTransforms();
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
    if (e.target.closest('.top-bar') || e.target.closest('.left-controls') || e.target.closest('.color-panel') || e.target.closest('.layer-sidebar') || e.target.closest('.brush-settings-modal')) return;
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
