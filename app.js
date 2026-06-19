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
brushBtn.addEventListener('click', () => {
    currentTool = 'brush';
    brushBtn.classList.add('active');
    eraserBtn.classList.remove('active');
});

eraserBtn.addEventListener('click', () => {
    currentTool = 'eraser';
    eraserBtn.classList.add('active');
    brushBtn.classList.remove('active');
});

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

// Global Tap Listener (Persistent Layer GUI Exception Added)
window.addEventListener('pointerdown', (e) => {
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
    if (index === 0) return; // Already at the top
    saveHistoryState();
    const temp = layers[index];
    layers[index] = layers[index - 1];
    layers[index - 1] = temp;
    updateLayersUI();
    compositeCanvasStack();
}

function moveLayerDown(index) {
    if (index === layers.length - 1) return; // Already at the bottom
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
            if (e.target.closest('button')) return;
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

        // Up/Down Arrows Reordering Controls
        const orderControls = document.createElement('div');
        orderControls.className = 'layer-order-controls';
        
        const upBtn = document.createElement('button');
        upBtn.className = 'layer-order-btn';
        upBtn.innerHTML = '&#9650;'; // Up Arrow Symbol
        upBtn.title = 'Move Layer Up';
        upBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            moveLayerUp(index);
        });

        const downBtn = document.createElement('button');
        downBtn.className = 'layer-order-btn';
        downBtn.innerHTML = '&#9660;'; // Down Arrow Symbol
        downBtn.title = 'Move Layer Down';
        downBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            moveLayerDown(index);
        });

        orderControls.appendChild(upBtn);
        orderControls.appendChild(downBtn);

        // Visibility Toggle Check
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

        // Delete Layer Action
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

// Side Control Events Linked to Current Layer Context
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
    
    // Render from bottom to top index
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

// Menu Actions Realignment
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

// Alpha Lock Scratchpad Layer Generation Canvas
let alphaScratchCanvas = document.createElement('canvas');
let alphaScratchCtx = alphaScratchCanvas.getContext('2d');

function initCanvas(width, height) {
    canvas.width = width;
    canvas.height = height;
    
    alphaScratchCanvas.width = width;
    alphaScratchCanvas.height = height;

    startMenu.classList.add('hidden');
    workspace.classList.remove('hidden');
    
    transformContainer.style.width = canvas.width + 'px';
    transformContainer.style.height = canvas.height + 'px';
    
    layers = [];
    layerIdCounter = 0;
    
    // True Transparent Launch Structure: Single layer initialization
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

// Core Drawing Logic
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
        y: yRot / scale + canvas.height / 2
    };
}

function startDrawing(e) {
    if (activePointers.length >= 2) return; 
    
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer || !activeLayer.visible) return; 

    saveHistoryState(); 
    drawing = true;
    strokeHasPainted = false; 

    const coords = getCanvasCoordinates(e);

    if (activeLayer.alphaLock) {
        // Clear isolated alpha scratch canvas for real-time composition tracking
        alphaScratchCtx.clearRect(0, 0, canvas.width, canvas.height);
        alphaScratchCtx.beginPath();
        alphaScratchCtx.moveTo(coords.x, coords.y);
    } else {
        activeLayer.ctx.beginPath();
        activeLayer.ctx.moveTo(coords.x, coords.y);
    }
    
    drawStroke(e);
}

function drawStroke(e) {
    if (!drawing || activePointers.length >= 2) return;
    
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer) return;

    strokeHasPainted = true;
    const coords = getCanvasCoordinates(e);
    
    // Choose appropriate context interface depending on target context parameters
    const renderCtx = activeLayer.alphaLock ? alphaScratchCtx : activeLayer.ctx;
    
    renderCtx.save();
    renderCtx.lineWidth = currentBrushSize;
    renderCtx.lineCap = 'round';
    renderCtx.lineJoin = 'round';
    renderCtx.globalAlpha = currentOpacity;

    if (!activeLayer.alphaLock && currentTool === 'eraser') {
        renderCtx.globalCompositeOperation = 'destination-out';
        renderCtx.strokeStyle = 'rgba(0,0,0,1.0)';
    } else {
        renderCtx.globalCompositeOperation = 'source-over';
        renderCtx.strokeStyle = activeColor;
    }

    renderCtx.lineTo(coords.x, coords.y);
    renderCtx.stroke();
    renderCtx.restore();
    
    renderCtx.beginPath();
    renderCtx.moveTo(coords.x, coords.y);

    if (activeLayer.alphaLock) {
        // Composite new strokes constrained strictly inside target destination bounds
        activeLayer.ctx.save();
        activeLayer.ctx.globalCompositeOperation = 'source-in';
        activeLayer.ctx.drawImage(alphaScratchCanvas, 0, 0);
        activeLayer.ctx.restore();
    }

    compositeCanvasStack();
}

function stopDrawing() {
    if (drawing) {
        drawing = false;
        const activeLayer = layers.find(l => l.id === activeLayerId);
        
        if (activeLayer) {
            activeLayer.ctx.beginPath();
            if (activeLayer.alphaLock) alphaScratchCtx.beginPath();
        }
        
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
        applyTransforms();
    }
};

window.addEventListener('pointerdown', handlePointerDownGlobal);
window.addEventListener('pointermove', handlePointerMoveGlobal);

function handlePointerUp(e) {
    activePointers = activePointers.filter(p => p.pointerId !== e.pointerId);
    if (activePointers.length < 2) {
        initialTouchDist = 0;
        initialTouchAngle = 0;
    }
    if (activePointers.length === 0) {
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
