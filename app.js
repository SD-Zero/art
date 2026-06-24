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

// Modular Brush UI Elements
const brushMenuDropdown = document.getElementById('brushMenuDropdown');
const brushCategoriesList = document.getElementById('brushCategoriesList');
const brushVariantsGrid = document.getElementById('brushVariantsGrid');
const brushSettingsPanel = document.getElementById('brushSettingsPanel');
const closeBrushSettingsBtn = document.getElementById('closeBrushSettingsBtn');
const settingsPanelTitle = document.getElementById('settingsPanelTitle');

// Schema Control Inputs
const brushSettingSpacing = document.getElementById('brushSettingSpacing');
const brushSettingStabilization = document.getElementById('brushSettingStabilization');
const brushSettingTexture = document.getElementById('brushSettingTexture');
const brushSettingPSize = document.getElementById('brushSettingPSize');
const brushSettingPOpacity = document.getElementById('brushSettingPOpacity');
const brushSettingPScatter = document.getElementById('brushSettingPScatter');

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
        colorPanel.classList.remove('show');
        menuDropdown.classList.remove('show');
        brushMenuDropdown.classList.toggle('show');
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
    brushMenuDropdown.classList.remove('show');
});

// Sidebar & Dropdown Trigger Logic
menuBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    colorPanel.classList.remove('show');
    brushMenuDropdown.classList.remove('show');
    menuDropdown.classList.toggle('show');
});

colorBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    menuDropdown.classList.remove('show');
    brushMenuDropdown.classList.remove('show');
    colorPanel.classList.toggle('show');
    if (colorPanel.classList.contains('show')) drawColorWheel();
});

layerPanelBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    menuDropdown.classList.remove('show');
    colorPanel.classList.remove('show');
    brushMenuDropdown.classList.remove('show');
    layerSidebar.classList.toggle('show');
});

closeColorBtn.addEventListener('click', () => {
    colorPanel.classList.remove('show');
});

closeBrushSettingsBtn.addEventListener('click', () => {
    brushSettingsPanel.classList.remove('show');
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
    if (!brushMenuDropdown.contains(e.target) && !brushBtn.contains(e.target) && !brushSettingsPanel.contains(e.target)) {
        brushMenuDropdown.classList.remove('show');
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

/* ==========================================================================
   MODULAR BRUSH ENGINE ARCHITECTURE
   ========================================================================== */

const BrushRegistry = {
    favorites: {},
    ink: {
        hard_ink: { name: "Hard Ink", spacing: 5, stabilization: 15, texture: 0, pressureSize: true, pressureOpacity: false, pressureScatter: false, behavior: 'standard' },
        soft_ink: { name: "Soft Ink", spacing: 8, stabilization: 10, texture: 15, pressureSize: true, pressureOpacity: true, pressureScatter: false, behavior: 'standard', softEdge: true },
        calligraphy: { name: "Calligraphy Ink", spacing: 3, stabilization: 25, texture: 0, pressureSize: true, pressureOpacity: false, pressureScatter: false, behavior: 'directional' }
    },
    pencil: {
        light_pencil: { name: "Light Pencil", spacing: 25, stabilization: 2, texture: 65, pressureSize: false, pressureOpacity: true, pressureScatter: true, behavior: 'standard' },
        graphite_pencil: { name: "Graphite Pencil", spacing: 18, stabilization: 4, texture: 85, pressureSize: true, pressureOpacity: true, pressureScatter: true, behavior: 'standard' },
        mechanical: { name: "Mechanical Pencil", spacing: 5, stabilization: 8, texture: 20, pressureSize: false, pressureOpacity: false, pressureScatter: false, behavior: 'standard' }
    },
    sketch: {
        rough_sketch: { name: "Rough Sketch", spacing: 35, stabilization: 1, texture: 40, pressureSize: false, pressureOpacity: true, pressureScatter: true, behavior: 'standard' },
        clean_sketch: { name: "Clean Sketch", spacing: 12, stabilization: 12, texture: 10, pressureSize: true, pressureOpacity: true, pressureScatter: false, behavior: 'standard' },
        gesture_sketch: { name: "Gesture Sketch", spacing: 40, stabilization: 0, texture: 5, pressureSize: false, pressureOpacity: true, pressureScatter: false, behavior: 'standard' }
    },
    marker: {
        chisel_marker: { name: "Chisel Marker", spacing: 8, stabilization: 6, texture: 10, pressureSize: false, pressureOpacity: false, pressureScatter: false, behavior: 'chisel' },
        round_marker: { name: "Round Marker", spacing: 10, stabilization: 8, texture: 0, pressureSize: false, pressureOpacity: false, pressureScatter: false, behavior: 'standard' },
        soft_marker: { name: "Soft Marker", spacing: 14, stabilization: 10, texture: 20, pressureSize: false, pressureOpacity: true, pressureScatter: false, behavior: 'standard', softEdge: true }
    },
    pen: {
        fine_liner: { name: "Fine Liner", spacing: 5, stabilization: 14, texture: 0, pressureSize: false, pressureOpacity: false, pressureScatter: false, behavior: 'standard' },
        technical_pen: { name: "Technical Pen", spacing: 4, stabilization: 20, texture: 0, pressureSize: false, pressureOpacity: false, pressureScatter: false, behavior: 'standard' },
        brush_pen: { name: "Brush Pen", spacing: 4, stabilization: 18, texture: 5, pressureSize: true, pressureOpacity: false, pressureScatter: false, behavior: 'tapered' }
    },
    spray_paint: {
        soft_spray: { name: "Soft Spray", spacing: 40, stabilization: 2, texture: 0, pressureSize: true, pressureOpacity: true, pressureScatter: true, behavior: 'particle', particleDensity: 25, particleCap: 60 },
        hard_spray: { name: "Hard Spray", spacing: 25, stabilization: 4, texture: 0, pressureSize: false, pressureOpacity: true, pressureScatter: true, behavior: 'particle', particleDensity: 65, particleCap: 120 },
        splatter_spray: { name: "Splatter Spray", spacing: 70, stabilization: 1, texture: 0, pressureSize: true, pressureOpacity: false, pressureScatter: true, behavior: 'particle', particleDensity: 12, particleCap: 30, irregular: true }
    },
    airbrush: {
        soft_airbrush: { name: "Soft Airbrush", spacing: 12, stabilization: 5, texture: 0, pressureSize: false, pressureOpacity: true, pressureScatter: false, behavior: 'standard', softEdge: true, wideFalloff: true },
        controlled_airbrush: { name: "Controlled Airbrush", spacing: 10, stabilization: 10, texture: 0, pressureSize: false, pressureOpacity: true, pressureScatter: false, behavior: 'standard', softEdge: true },
        focused_airbrush: { name: "Focused Airbrush", spacing: 6, stabilization: 12, texture: 0, pressureSize: false, pressureOpacity: true, pressureScatter: false, behavior: 'standard', softEdge: true, narrowSpread: true }
    },
    watercolor: {
        light_wash: { name: "Light Wash", spacing: 30, stabilization: 8, texture: 40, pressureSize: false, pressureOpacity: true, pressureScatter: false, behavior: 'watercolor', wetDiffusion: 0.2 },
        wet_blend: { name: "Wet Blend", spacing: 20, stabilization: 14, texture: 50, pressureSize: true, pressureOpacity: true, pressureScatter: false, behavior: 'watercolor', wetDiffusion: 0.6, blending: true },
        pigment_heavy: { name: "Pigment Heavy Wash", spacing: 15, stabilization: 10, texture: 75, pressureSize: true, pressureOpacity: false, pressureScatter: false, behavior: 'watercolor', wetDiffusion: 0.1, heavyEdge: true }
    }
};

let activeCategoryKey = 'ink';
let activeBrushKey = 'hard_ink';
let selectedSettingsTarget = null;

const BrushEngine = {
    strokeQueue: [],
    
    getActiveBrush() {
        if (BrushRegistry.favorites[activeBrushKey]) {
            return BrushRegistry.favorites[activeBrushKey];
        }
        return BrushRegistry[activeCategoryKey]?.[activeBrushKey] || BrushRegistry.ink.hard_ink;
    },

    processStrokeSegment(targetCtx, p1, p2, baseSize, baseOpacity, hexColor) {
        const brush = this.getActiveBrush();
        
        // 1. Centralized Pointer Stabilization (EMA Engine)
        const stabFactor = (brush.stabilization || 0) + 1;
        p2.x = p1.x + (p2.x - p1.x) / stabFactor;
        p2.y = p1.y + (p2.y - p1.y) / stabFactor;

        const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const steps = Math.max(1, distance / Math.max(1, (baseSize * (brush.spacing / 100))));
        
        // Performance constraint throttling for performance-heavy modules
        if ((brush.behavior === 'particle' || brush.behavior === 'watercolor') && steps > 120) {
            return p2; 
        }

        // 2. Continuous Linear Interpolation Stamp Pipeline
        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            const cx = p1.x + (p2.x - p1.x) * t;
            const cy = p1.y + (p2.y - p1.y) * t;
            const pressure = p1.pressure + (p2.pressure - p1.pressure) * t;

            // Compute dynamic properties from pressure mapping schema
            let dynamicSize = baseSize;
            if (brush.pressureSize) dynamicSize *= (pressure * 1.5 + 0.2);
            dynamicSize = Math.max(0.5, dynamicSize);

            let dynamicOpacity = baseOpacity;
            if (brush.pressureOpacity) dynamicOpacity *= (pressure * 0.85 + 0.15);

            let scatterOffset = { x: 0, y: 0 };
            if (brush.pressureScatter) {
                const maxScatter = dynamicSize * (brush.texture / 20 + 1);
                scatterOffset.x = (Math.random() - 0.5) * maxScatter * pressure;
                scatterOffset.y = (Math.random() - 0.5) * maxScatter * pressure;
            }

            this.executeVariantRender(targetCtx, cx + scatterOffset.x, cy + scatterOffset.y, dynamicSize, dynamicOpacity, hexColor, pressure, p1, p2, brush);
        }
        return p2;
    },

    executeVariantRender(tCtx, x, y, size, opacity, color, pressure, p1, p2, brush) {
        tCtx.save();
        tCtx.fillStyle = color;
        tCtx.strokeStyle = color;
        tCtx.globalAlpha = opacity;

        // Apply shared texture parameters via composite masking simulations
        if (brush.texture > 0 && brush.behavior !== 'particle') {
            if (Math.random() * 100 < brush.texture) {
                size *= (0.75 + Math.random() * 0.4);
            }
        }

        switch (brush.behavior) {
            case 'directional':
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const angle = Math.atan2(dy, dx);
                tCtx.translate(x, y);
                tCtx.rotate(angle);
                tCtx.beginPath();
                tCtx.ellipse(0, 0, size * 1.4 * (pressure + 0.3), size * 0.4, 0, 0, Math.PI * 2);
                tCtx.fill();
                break;

            case 'chisel':
                tCtx.translate(x, y);
                tCtx.rotate(-Math.PI / 4); // Static 45-deg angled variant
                tCtx.fillRect(-size / 2, -size / 8, size, size / 4);
                break;

            case 'tapered':
                const velocity = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                const taperSize = Math.max(0.2, size * (1.0 - Math.min(1, velocity / 30)));
                tCtx.beginPath();
                tCtx.arc(x, y, taperSize, 0, Math.PI * 2);
                tCtx.fill();
                break;

            case 'particle':
                const cap = brush.particleCap || 50;
                const count = Math.min(cap, Math.round((brush.particleDensity || 20) * (pressure + 0.5)));
                const radius = size * (brush.irregular ? 2.5 : 1.8);
                
                for (let p = 0; p < count; p++) {
                    const ang = Math.random() * Math.PI * 2;
                    const dist = brush.irregular ? (Math.pow(Math.random(), 2) * radius) : (Math.random() * radius);
                    const px = x + Math.cos(ang) * dist;
                    const py = y + Math.sin(ang) * dist;
                    const pSize = brush.irregular ? (Math.random() * 3 + 0.5) : Math.max(0.4, size * 0.06 * Math.random());
                    
                    tCtx.globalAlpha = opacity * (brush.irregular ? 0.8 : (1.0 - (dist / radius)));
                    tCtx.beginPath();
                    tCtx.arc(px, py, pSize, 0, Math.PI * 2);
                    tCtx.fill();
                }
                break;

            case 'watercolor':
                const diffusion = size * (brush.wetDiffusion || 0.3) * (pressure + 0.2);
                const grad = tCtx.createRadialGradient(x, y, size * 0.1, x, y, size + diffusion);
                
                if (brush.heavyEdge) {
                    grad.addColorStop(0, color);
                    grad.addColorStop(0.7, color + "22");
                    grad.addColorStop(0.95, color + "aa");
                    grad.addColorStop(1, color + "00");
                } else if (brush.blending) {
                    grad.addColorStop(0, color);
                    grad.addColorStop(0.4, color + "66");
                    grad.addColorStop(1, "#ffffff00");
                } else {
                    grad.addColorStop(0, color);
                    grad.addColorStop(0.5, color + "44");
                    grad.addColorStop(1, color + "00");
                }
                
                tCtx.fillStyle = grad;
                tCtx.beginPath();
                tCtx.arc(x, y, size + diffusion, 0, Math.PI * 2);
                tCtx.fill();
                break;

            case 'standard':
default:
                if (brush.softEdge) {
                    const falloff = brush.wideFalloff ? 0.01 : (brush.narrowSpread ? 0.6 : 0.3);
                    const radGrad = tCtx.createRadialGradient(x, y, size * falloff, x, y, size);
                    radGrad.addColorStop(0, color);
                    radGrad.addColorStop(1, color + "00");
                    tCtx.fillStyle = radGrad;
                }
                tCtx.beginPath();
                tCtx.arc(x, y, size, 0, Math.PI * 2);
                tCtx.fill();
                break;
        }
        tCtx.restore();
    }
};

// Modular Sub-Menu UI Generation Logic
function renderModularBrushUI() {
    brushCategoriesList.innerHTML = '';
    
    // Inject Favorites Virtual Category alongside the 7 required types
    const categories = Object.keys(BrushRegistry);
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `category-btn ${cat === activeCategoryKey ? 'active' : ''}`;
        btn.textContent = cat.replace('_', ' ');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            activeCategoryKey = cat;
            renderModularBrushUI();
        });
        brushCategoriesList.appendChild(btn);
    });

    brushVariantsGrid.innerHTML = '';
    const variants = BrushRegistry[activeCategoryKey] || {};
    
    Object.keys(variants).forEach(vKey => {
        const variant = variants[vKey];
        const card = document.createElement('div');
        card.className = `brush-variant-card ${vKey === activeBrushKey ? 'active' : ''}`;
        
        card.addEventListener('click', () => {
            activeBrushKey = vKey;
            renderModularBrushUI();
        });

        const nameLabel = document.createElement('div');
        nameLabel.className = 'brush-card-name';
        nameLabel.textContent = variant.name;
        card.appendChild(nameLabel);

        const rowActions = document.createElement('div');
        rowActions.className = 'brush-card-actions';

        // Settings Selector Cog Setup
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'brush-card-icon';
        settingsBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3c.06-.61.06-.93 0-1.24l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.17 2.11 13.95 2 13.7 2h-4c-.25 0-.47.11-.5.35L8.82 5c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.31-.07.63-.07.94s.03.63.07.94l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.35.5.35h4c.25 0 .47-.11.5-.35l.38-2.65c.6-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>`;
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openSettingsSchemaPanel(vKey, variant);
        });

        // Favorite Star Handler
        const starBtn = document.createElement('button');
        const isStarred = !!BrushRegistry.favorites[vKey];
        starBtn.className = `brush-card-icon ${isStarred ? 'starred' : ''}`;
        starBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;
        starBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isStarred) {
                delete BrushRegistry.favorites[vKey];
            } else {
                BrushRegistry.favorites[vKey] = variant;
            }
            renderModularBrushUI();
        });

        rowActions.appendChild(settingsBtn);
        rowActions.appendChild(starBtn);
        card.appendChild(rowActions);
        brushVariantsGrid.appendChild(card);
    });
}

function openSettingsSchemaPanel(key, variant) {
    selectedSettingsTarget = variant;
    settingsPanelTitle.textContent = variant.name;
    
    brushSettingSpacing.value = variant.spacing;
    brushSettingStabilization.value = variant.stabilization;
    brushSettingTexture.value = variant.texture;
    brushSettingPSize.checked = variant.pressureSize;
    brushSettingPOpacity.checked = variant.pressureOpacity;
    brushSettingPScatter.checked = variant.pressureScatter;
    
    brushSettingsPanel.classList.add('show');
}

// Map Live Changes back to Object Instances
[brushSettingSpacing, brushSettingStabilization, brushSettingTexture, brushSettingPSize, brushSettingPOpacity, brushSettingPScatter].forEach(elem => {
    elem.addEventListener('change', () => {
        if (!selectedSettingsTarget) return;
        selectedSettingsTarget.spacing = parseInt(brushSettingSpacing.value);
        selectedSettingsTarget.stabilization = parseInt(brushSettingStabilization.value);
        selectedSettingsTarget.texture = parseInt(brushSettingTexture.value);
        selectedSettingsTarget.pressureSize = brushSettingPSize.checked;
        selectedSettingsTarget.pressureOpacity = brushSettingPOpacity.checked;
        selectedSettingsTarget.pressureScatter = brushSettingPScatter.checked;
    });
});

renderModularBrushUI();

// Core Drawing Logic Connection Points
function attachDrawingListeners() {
    canvas.addEventListener('pointerdown', startDrawing);
    canvas.addEventListener('pointermove', drawStroke);
    window.addEventListener('pointerup', stopDrawing);
}

function getCanvasCoordinates(e) {
    const rect = transformContainer.getBoundingClientRect();
    const rad = (-rotation * Math.PI) / 180;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    
    const xRot = (e.clientX - cx) * Math.cos(rad) - (e.clientY - cy) * Math.sin(rad);
    const yRot = (e.clientX - cx) * Math.sin(rad) + (e.clientY - cy) * Math.cos(rad);
    
    return {
        x: xRot / scale + canvas.width / 2,
        y: yRot / scale + canvas.height / 2,
        pressure: e.pressure || 0.5
    };
}

let lastCoords = null;

function startDrawing(e) {
    if (activePointers.length >= 2) return; 
    
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer || !activeLayer.visible) return; 

    saveHistoryState(); 
    drawing = true;
    strokeHasPainted = false; 

    const coords = getCanvasCoordinates(e);
    lastCoords = coords;

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
    const coords = getCanvasCoordinates(e);
    
    if (activeLayer.alphaLock) {
        if (currentTool === 'eraser') {
            alphaScratchCtx.save();
            alphaScratchCtx.lineWidth = currentBrushSize;
            alphaScratchCtx.lineCap = 'round';
            alphaScratchCtx.lineJoin = 'round';
            alphaScratchCtx.globalCompositeOperation = 'destination-out';
            alphaScratchCtx.beginPath();
            alphaScratchCtx.moveTo(lastCoords.x, lastCoords.y);
            alphaScratchCtx.lineTo(coords.x, coords.y);
            alphaScratchCtx.stroke();
            alphaScratchCtx.restore();
        } else {
            lastCoords = BrushEngine.processStrokeSegment(alphaScratchCtx, lastCoords, coords, currentBrushSize, currentOpacity, activeColor);
        }

        activeLayer.ctx.clearRect(0, 0, canvas.width, canvas.height);
        activeLayer.ctx.drawImage(alphaScratchCanvas, 0, 0);

        activeLayer.ctx.save();
        activeLayer.ctx.globalCompositeOperation = 'destination-in';
        activeLayer.ctx.drawImage(alphaBackupCanvas, 0, 0);
        activeLayer.ctx.restore();
    } else {
        if (currentTool === 'eraser') {
            activeLayer.ctx.save();
            activeLayer.ctx.lineWidth = currentBrushSize;
            activeLayer.ctx.lineCap = 'round';
            activeLayer.ctx.lineJoin = 'round';
            activeLayer.ctx.globalCompositeOperation = 'destination-out';
            activeLayer.ctx.strokeStyle = 'rgba(0,0,0,1.0)';
            activeLayer.ctx.beginPath();
            activeLayer.ctx.moveTo(lastCoords.x, lastCoords.y);
            activeLayer.ctx.lineTo(coords.x, coords.y);
            activeLayer.ctx.stroke();
            activeLayer.ctx.restore();
            lastCoords = coords;
        } else {
            lastCoords = BrushEngine.processStrokeSegment(activeLayer.ctx, lastCoords, coords, currentBrushSize, currentOpacity, activeColor);
        }
    }
    
    compositeCanvasStack();
}

function stopDrawing() {
    if (drawing) {
        drawing = false;
        lastCoords = null;
        
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
    if (e.target.closest('.top-bar') || e.target.closest('.left-controls') || e.target.closest('.color-panel') || e.target.closest('.layer-sidebar') || e.target.closest('.brush-menu-dropdown') || e.target.closest('.brush-settings-panel')) return;

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
