// Setup DOM References and Basic states
const startMenu = document.getElementById('startMenu');
const workspace = document.getElementById('workspace');
const canvasWidthInput = document.getElementById('canvasWidth');
const canvasHeightInput = document.getElementById('canvasHeight');
const previewBox = document.getElementById('previewBox');
const confirmBtn = document.getElementById('confirmBtn');
const fileInput = document.getElementById('fileInput');

const menuBtn = document.getElementById('menuBtn');
const menuDropdown = document.getElementById('menuDropdown');
const newFileBtn = document.getElementById('newFileBtn');
const savePngBtn = document.getElementById('savePngBtn');
const saveJpegBtn = document.getElementById('saveJpegBtn');
const saveSvgBtn = document.getElementById('saveSvgBtn');
const saveSpeedpaintBtn = document.getElementById('saveSpeedpaintBtn');

const colorBtn = document.getElementById('colorBtn');
const brushBtn = document.getElementById('brushBtn');
const eraserBtn = document.getElementById('eraserBtn');
const transformBtn = document.getElementById('transformBtn');
const lassoBtn = document.getElementById('lassoBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const layerPanelBtn = document.getElementById('layerPanelBtn');

const colorPanel = document.getElementById('colorPanel');
const closeColorBtn = document.getElementById('closeColorBtn');
const colorWheel = document.getElementById('colorWheel');
const hexInput = document.getElementById('hexInput');
const paletteGrid = document.getElementById('paletteGrid');

const sizeSlider = document.getElementById('sizeSlider');
const sizeHandle = document.getElementById('sizeHandle');
const sizeTrackFill = document.getElementById('sizeTrackFill');
const sizeBubble = document.getElementById('sizeBubble');

const opacSlider = document.getElementById('opacSlider');
const opacHandle = document.getElementById('opacHandle');
const opacTrackFill = document.getElementById('opacTrackFill');
const opacBubble = document.getElementById('opacBubble');

const layerSidebar = document.getElementById('layerSidebar');
const addLayerBtn = document.getElementById('addLayerBtn');
const clippingBtn = document.getElementById('clippingBtn');
const alphaLockBtn = document.getElementById('alphaLockBtn');
const blendModeSelect = document.getElementById('blendModeSelect');
const layerOpacityRange = document.getElementById('layerOpacityRange');
const layersList = document.getElementById('layersList');

const transformContainer = document.getElementById('transformContainer');
const canvas = document.getElementById('paintCanvas');
const mainCtx = canvas.getContext('2d');
const brushLiveRing = document.getElementById('brushLiveRing');

// Core App State Configuration Tracking Elements
let layers = [];
let activeLayerId = null;
let currentTool = 'brush'; // brush, eraser, transform, lasso
let activeColor = '#000000';
let currentBrushSize = 10;
let currentOpacity = 1.0;
let drawing = false;
let lastCoords = null;
let strokeHasPainted = false;
let speedpaintFrames = [];

// Transformation and Camera Workspace matrices
let scale = 1;
let rotation = 0;
let panX = window.innerWidth / 2;
let panY = window.innerHeight / 2;

// Undo & Redo Architectural Array stacks
let undoStack = [];
let redoStack = [];

// Alpha Lock System Backups
let alphaScratchCanvas = document.createElement('canvas');
let alphaScratchCtx = alphaScratchCanvas.getContext('2d');
let alphaBackupCanvas = document.createElement('canvas');
let alphaBackupCtx = alphaBackupCanvas.getContext('2d');

// NEW: Lasso Tracking Variables
let lassoPoints = [];
let lassoActivePath = null; // Stored as Array of coordinates or null

// NEW: Transform Session Control Properties
let transformActive = false;
let transformState = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotation: 0,
    sourceCanvas: null,
    isLassoCutout: false
};
let transformInteraction = {
    type: null, // 'move', 'rotate', 'nw', 'ne', 'se', 'sw'
    startX: 0,
    startY: 0,
    startState: {}
};

// Preset dynamic local user configurations 
const customPalette = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#888888', '#444444'];

// Boot Logic Initializer Hooks
window.addEventListener('DOMContentLoaded', () => {
    updatePreviewBox();
    buildColorWheel();
    initPalette();
    initSliders();
    setupDropdownsAndPanels();
    setupToolButtons();
});

// Window Layout Resize Sync Hooks
window.addEventListener('resize', () => {
    if (!startMenu.classList.contains('hidden')) {
        updatePreviewBox();
    }
});

function updatePreviewBox() {
    const w = parseInt(canvasWidthInput.value) || 800;
    const h = parseInt(canvasHeightInput.value) || 600;
    const max = 150;
    if (w >= h) {
        previewBox.style.width = max + 'px';
        previewBox.style.height = (h / w * max) + 'px';
    } else {
        previewBox.style.height = max + 'px';
        previewBox.style.width = (w / h * max) + 'px';
    }
}
canvasWidthInput.addEventListener('input', updatePreviewBox);
canvasHeightInput.addEventListener('input', updatePreviewBox);

// Action confirmation initialization setup
confirmBtn.addEventListener('click', () => {
    const w = parseInt(canvasWidthInput.value) || 800;
    const h = parseInt(canvasHeightInput.value) || 600;
    createNewWorkspace(w, h);
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                createNewWorkspace(img.width, img.height);
                const activeLayer = layers.find(l => l.id === activeLayerId);
                if (activeLayer) {
                    activeLayer.ctx.drawImage(img, 0, 0);
                    updateLayersUI();
                    compositeCanvasStack();
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(e.target.files[0]);
    }
});

function createNewWorkspace(w, h) {
    canvas.width = w;
    canvas.height = h;
    alphaScratchCanvas.width = w;
    alphaScratchCanvas.height = h;
    alphaBackupCanvas.width = w;
    alphaBackupCanvas.height = h;

    layers = [];
    undoStack = [];
    redoStack = [];
    lassoPoints = [];
    lassoActivePath = null;
    clearTransform();
    updateUndoRedoButtons();

    // Create Initial Base Canvas Layer Group
    addLayer("Layer 1");

    startMenu.classList.add('hidden');
    workspace.classList.remove('hidden');

    // Recalculate and reset workspace coordinates system centers
    scale = Math.min((window.innerWidth * 0.7) / w, (window.innerHeight * 0.7) / h);
    if (scale > 1) scale = 1;
    rotation = 0;
    panX = window.innerWidth / 2;
    panY = window.innerHeight / 2;
    applyTransforms();
    compositeCanvasStack();
}

function applyTransforms() {
    transformContainer.style.transform = `translate(${panX}px, ${panY}px) scale(${scale}) rotate(${rotation}deg) translate(-50%, -50%)`;
}

// Interactive custom slider mechanisms 
function initSliders() {
    setupSliderTracking(sizeSlider, (percent, active) => {
        currentBrushSize = Math.round(percent * 199) + 1; // 1 - 200px
        sizeBubble.textContent = currentBrushSize;
        
        // Show Empty Outline Ring only while active
        if (active && (currentTool === 'brush' || currentTool === 'eraser')) {
            brushLiveRing.style.display = 'block';
            const screenRadius = currentBrushSize * scale;
            brushLiveRing.style.width = screenRadius + 'px';
            brushLiveRing.style.height = screenRadius + 'px';
            brushLiveRing.style.left = window.innerWidth / 2 + 'px';
            brushLiveRing.style.top = window.innerHeight / 2 + 'px';
        } else {
            brushLiveRing.style.display = 'none';
        }
    });

    setupSliderTracking(opacSlider, (percent) => {
        currentOpacity = percent;
        opacBubble.textContent = Math.round(percent * 100);
    });
}

function setupSliderTracking(container, callback) {
    const handle = container.querySelector('.slider-handle');
    const trackFill = container.querySelector('.slider-track-fill');

    function updateFromEvent(e) {
        const rect = container.getBoundingClientRect();
        let clientY = e.clientY;
        if (e.touches && e.touches[0]) clientY = e.touches[0].clientY;
        let offset = rect.bottom - clientY;
        let percent = Math.max(0, Math.min(offset / rect.height, 1));
        
        handle.style.bottom = (percent * 100) + '%';
        trackFill.style.height = (percent * 100) + '%';
        callback(percent, true);
    }

    container.addEventListener('pointerdown', (e) => {
        container.setPointerCapture(e.pointerId);
        updateFromEvent(e);
        
        const moveHandler = (evt) => updateFromEvent(evt);
        const upHandler = (evt) => {
            container.releasePointerCapture(evt.pointerId);
            container.removeEventListener('pointermove', moveHandler);
            container.removeEventListener('pointerup', upHandler);
            callback(Math.max(0, Math.min((rect.bottom - evt.clientY) / rect.height, 1)), false);
        };
        const rect = container.getBoundingClientRect();

        container.addEventListener('pointermove', moveHandler);
        container.addEventListener('pointerup', upHandler);
    });
}

// Tool Switching Interface Management Loop Config
function setupToolButtons() {
    const tools = [
        { btn: brushBtn, name: 'brush' },
        { btn: eraserBtn, name: 'eraser' },
        { btn: transformBtn, name: 'transform' },
        { btn: lassoBtn, name: 'lasso' }
    ];

    tools.forEach(t => {
        t.btn.addEventListener('click', () => {
            if (currentTool === 'transform' && t.name !== 'transform') {
                commitTransform();
            }
            tools.forEach(o => o.btn.classList.remove('active'));
            t.btn.classList.add('active');
            currentTool = t.name;
            
            if (currentTool === 'transform') {
                initializeTransformSession();
            }
            compositeCanvasStack();
        });
    });
}

function setupDropdownsAndPanels() {
    menuBtn.addEventListener('click', () => menuDropdown.classList.toggle('show'));
    colorBtn.addEventListener('click', () => colorPanel.classList.toggle('show'));
    closeColorBtn.addEventListener('click', () => colorPanel.classList.remove('show'));
    layerPanelBtn.addEventListener('click', () => layerSidebar.classList.toggle('show'));

    window.addEventListener('click', (e) => {
        if (!menuBtn.contains(e.target)) menuDropdown.classList.remove('show');
    });

    newFileBtn.addEventListener('click', () => {
        workspace.classList.add('hidden');
        startMenu.classList.remove('hidden');
    });

    savePngBtn.addEventListener('click', () => exportImage('image/png', 'canvas.png'));
    saveJpegBtn.addEventListener('click', () => exportImage('image/jpeg', 'canvas.jpg'));
    saveSvgBtn.addEventListener('click', exportSvgFile);
    saveSpeedpaintBtn.addEventListener('click', exportSpeedpaintVideo);
}

// Palette Construction Graphics Engine Loops
function buildColorWheel() {
    const ctx = colorWheel.getContext('2d');
    const radius = colorWheel.width / 2;
    const cx = radius;
    const cy = radius;

    for (let y = 0; y < colorWheel.height; y++) {
        for (let x = 0; x < colorWheel.width; x++) {
            const rx = x - cx;
            const ry = y - cy;
            const d = Math.sqrt(rx*rx + ry*ry);
            if (d <= radius) {
                const angle = Math.atan2(ry, rx) + Math.PI; // 0 to 2PI
                const hue = (angle / (2 * Math.PI)) * 360;
                const sat = d / radius;
                ctx.fillStyle = `hsl(${hue}, ${sat * 100}%, 50%)`;
                ctx.fillRect(x, y, 1, 1);
            }
        }
    }

    colorWheel.addEventListener('pointerdown', handleColorPick);
}

function handleColorPick(e) {
    const rect = colorWheel.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = colorWheel.getContext('2d');
    try {
        const imgData = ctx.getImageData(x, y, 1, 1).data;
        if (imgData[3] > 0) {
            const hex = "#" + ((1 << 24) + (imgData[0] << 16) + (imgData[1] << 8) + imgData[2]).toString(16).slice(1);
            setActiveColor(hex);
        }
    } catch(err) {}

    const moveHandler = (evt) => {
        const nx = evt.clientX - rect.left;
        const ny = evt.clientY - rect.top;
        if (nx >= 0 && nx < rect.width && ny >= 0 && ny < rect.height) {
            const imgData = ctx.getImageData(nx, ny, 1, 1).data;
            if (imgData[3] > 0) {
                const hex = "#" + ((1 << 24) + (imgData[0] << 16) + (imgData[1] << 8) + imgData[2]).toString(16).slice(1);
                setActiveColor(hex);
            }
        }
    };
    const upHandler = () => {
        window.removeEventListener('pointermove', moveHandler);
        window.removeEventListener('pointerup', upHandler);
    };
    window.addEventListener('pointermove', moveHandler);
    window.addEventListener('pointerup', upHandler);
}

function initPalette() {
    paletteGrid.innerHTML = '';
    customPalette.forEach(c => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = c;
        swatch.addEventListener('click', () => setActiveColor(c));
        paletteGrid.appendChild(swatch);
    });
}

function setActiveColor(hex) {
    activeColor = hex;
    hexInput.value = hex.toUpperCase();
}
hexInput.addEventListener('change', () => {
    let val = hexInput.value.trim();
    if (!val.startsWith('#')) val = '#' + val;
    if (/^#[0-9A-F]{6}$/i.test(val)) {
        setActiveColor(val);
    }
});

function commitColorToPalette(color) {
    if (!customPalette.includes(color)) {
        customPalette.pop();
        customPalette.unshift(color);
        initPalette();
    }
}

// Structural Layer Management Subsystem Block
function addLayer(name = "") {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    const layerCanvas = document.createElement('canvas');
    layerCanvas.width = canvas.width;
    layerCanvas.height = canvas.height;
    
    const layerCtx = layerCanvas.getContext('2d');
    const layerName = name || `Layer ${layers.length + 1}`;

    const newLayer = {
        id: id,
        name: layerName,
        canvas: layerCanvas,
        ctx: layerCtx,
        visible: true,
        opacity: 1.0,
        blendMode: 'source-over',
        clipping: false,
        alphaLock: false
    };

    // Insert new layers above the current active layer selection point
    if (activeLayerId) {
        const idx = layers.findIndex(l => l.id === activeLayerId);
        layers.splice(idx, 0, newLayer);
    } else {
        layers.unshift(newLayer);
    }

    activeLayerId = id;
    saveUndoState();
    updateLayersUI();
    compositeCanvasStack();
    return newLayer;
}

function updateLayersUI() {
    layersList.innerHTML = '';
    layers.forEach((layer, index) => {
        const item = document.createElement('div');
        item.className = `layer-item ${layer.id === activeLayerId ? 'active' : ''} ${layer.clipping ? 'clipping' : ''}`;
        
        // Dynamic miniature generation logic loops
        const thumb = document.createElement('canvas');
        thumb.className = 'layer-thumbnail';
        thumb.width = 40;
        thumb.height = 30;
        const tCtx = thumb.getContext('2d');
        tCtx.drawImage(layer.canvas, 0, 0, 40, 30);

        const title = document.createElement('span');
        title.className = 'layer-title-text';
        title.textContent = layer.name;

        // Visibility toggles
        const visBtn = document.createElement('button');
        visBtn.className = 'layer-item-btn';
        visBtn.innerHTML = layer.visible ? 
            `<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>` :
            `<svg viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.82l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.74-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.01-.16c0-1.66-1.34-3-3-3l-.16.01z"/></svg>`;
        
        visBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            layer.visible = !layer.visible;
            updateLayersUI();
            compositeCanvasStack();
        });

        // Removal buttons
        const delBtn = document.createElement('button');
        delBtn.className = 'layer-item-btn';
        delBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;
        delBtn.disabled = layers.length <= 1;
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (layers.length > 1) {
                saveUndoState();
                layers.splice(index, 1);
                if (activeLayerId === layer.id) activeLayerId = layers[0].id;
                updateLayersUI();
                compositeCanvasStack();
            }
        });

        // Sorting controls
        const orderWrapper = document.createElement('div');
        orderWrapper.className = 'layer-order-controls';
        const upBtn = document.createElement('button');
        upBtn.className = 'layer-order-btn';
        upBtn.textContent = '▲';
        upBtn.disabled = index === 0;
        upBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            saveUndoState();
            const temp = layers[index];
            layers[index] = layers[index - 1];
            layers[index - 1] = temp;
            updateLayersUI();
            compositeCanvasStack();
        });

        const downBtn = document.createElement('button');
        downBtn.className = 'layer-order-btn';
        downBtn.textContent = '▼';
        downBtn.disabled = index === layers.length - 1;
        downBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            saveUndoState();
            const temp = layers[index];
            layers[index] = layers[index + 1];
            layers[index + 1] = temp;
            updateLayersUI();
            compositeCanvasStack();
        });

        orderWrapper.appendChild(upBtn);
        orderWrapper.appendChild(downBtn);

        item.appendChild(thumb);
        item.appendChild(title);
        item.appendChild(orderWrapper);
        item.appendChild(visBtn);
        item.appendChild(delBtn);

        item.addEventListener('click', () => {
            if (currentTool === 'transform') commitTransform();
            activeLayerId = layer.id;
            syncActiveLayerSettingsToUI();
            updateLayersUI();
        });

        layersList.appendChild(item);
    });

    syncActiveLayerSettingsToUI();
}

function syncActiveLayerSettingsToUI() {
    const l = layers.find(layer => layer.id === activeLayerId);
    if (!l) return;

    clippingBtn.classList.toggle('active', l.clipping);
    alphaLockBtn.classList.toggle('active', l.alphaLock);
    blendModeSelect.value = l.blendMode;
    layerOpacityRange.value = Math.round(l.opacity * 100);
}

// Sidepanel Action Row Click Triggers Setup 
clippingBtn.addEventListener('click', () => {
    const l = layers.find(layer => layer.id === activeLayerId);
    if (l) {
        saveUndoState();
        l.clipping = !l.clipping;
        updateLayersUI();
        compositeCanvasStack();
    }
});

alphaLockBtn.addEventListener('click', () => {
    const l = layers.find(layer => layer.id === activeLayerId);
    if (l) {
        saveUndoState();
        l.alphaLock = !l.alphaLock;
        updateLayersUI();
    }
});

blendModeSelect.addEventListener('change', () => {
    const l = layers.find(layer => layer.id === activeLayerId);
    if (l) {
        saveUndoState();
        l.blendMode = blendModeSelect.value;
        compositeCanvasStack();
    }
});

layerOpacityRange.addEventListener('input', () => {
    const l = layers.find(layer => layer.id === activeLayerId);
    if (l) {
        l.opacity = parseFloat(layerOpacityRange.value) / 100;
        compositeCanvasStack();
    }
});

addLayerBtn.addEventListener('click', () => addLayer());

// Master Compositor Core Engine 
function compositeCanvasStack() {
    mainCtx.clearRect(0, 0, canvas.width, canvas.height);

    // Render backwards to achieve the correct canvas ordering stack sequence
    for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        if (!layer.visible) continue;

        // Mask off runtime configurations using standalone temporary canvas configurations
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Draw Layer contents
        tempCtx.drawImage(layer.canvas, 0, 0);

        // If transform is active on this layer, draw its live transformed data on top instead
        if (transformActive && layer.id === activeLayerId && transformState.sourceCanvas) {
            if (transformState.isLassoCutout) {
                // Clear out original selection path space first
                tempCtx.save();
                tempCtx.globalCompositeOperation = 'destination-out';
                renderLassoPathOnContext(tempCtx);
                tempCtx.fill();
                tempCtx.restore();
            } else {
                tempCtx.clearRect(0, 0, canvas.width, canvas.height);
            }
            
            // Draw transformed slice bounding matrix
            tempCtx.save();
            tempCtx.translate(transformState.x, transformState.y);
            tempCtx.rotate((transformState.rotation * Math.PI) / 180);
            tempCtx.drawImage(
                transformState.sourceCanvas, 
                -transformState.width / 2, 
                -transformState.height / 2, 
                transformState.width, 
                transformState.height
            );
            tempCtx.restore();
        }

        // Apply Clipping Mode clipping properties referencing baseline target elements underneath
        if (layer.clipping && i < layers.length - 1) {
            let baseLayer = null;
            for (let j = i + 1; j < layers.length; j++) {
                if (!layers[j].clipping) {
                    baseLayer = layers[j];
                    break;
                }
            }
            if (baseLayer) {
                tempCtx.save();
                tempCtx.globalCompositeOperation = 'destination-in';
                tempCtx.drawImage(baseLayer.canvas, 0, 0);
                tempCtx.restore();
            }
        }

        mainCtx.save();
        mainCtx.globalAlpha = layer.opacity;
        mainCtx.globalCompositeOperation = layer.blendMode;
        mainCtx.drawImage(tempCanvas, 0, 0);
        mainCtx.restore();
    }

    // Overlay selection borders if Lasso tool paths are explicitly drawn out
    if (lassoActivePath && lassoActivePath.length > 1) {
        mainCtx.save();
        mainCtx.strokeStyle = '#007acc';
        mainCtx.lineWidth = 2 / scale;
        mainCtx.setLineDash([6 / scale, 6 / scale]);
        mainCtx.beginPath();
        renderLassoPathOnContext(mainCtx);
        mainCtx.stroke();
        mainCtx.restore();
    }

    // Render interactive Transform box decorations directly over active layers
    if (transformActive) {
        drawTransformBoundingBox();
    }
}

// Global Coordinates Projection Engine
function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    let clientX = e.clientX;
    let clientY = e.clientY;
    
    if (e.touches && e.touches[0]) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    }

    // Transform coordinate offsets out of viewport space down into model translation matrix limits
    const cx = panX;
    const cy = panY;
    let dx = clientX - cx;
    let dy = clientY - cy;

    // Un-rotate coordinate nodes
    const rad = (-rotation * Math.PI) / 180;
    const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ry = dx * Math.sin(rad) + dy * Math.cos(rad);

    // Un-scale coordinate steps relative to model sizing specifications
    const x = rx / scale + canvas.width / 2;
    const y = ry / scale + canvas.height / 2;

    return { x: x, y: y };
}

// Multi-touch Gestures & Drawing Tracking Block
canvas.addEventListener('pointerdown', (e) => {
    if (activePointers.length >= 2) return;

    if (currentTool === 'brush' || currentTool === 'eraser') {
        drawing = true;
        strokeHasPainted = false;
        lastCoords = getCanvasCoordinates(e);
        saveUndoState();

        const activeLayer = layers.find(l => l.id === activeLayerId);
        if (activeLayer && activeLayer.alphaLock) {
            alphaBackupCanvas.width = canvas.width;
            alphaBackupCanvas.height = canvas.height;
            alphaBackupCtx.clearRect(0, 0, canvas.width, canvas.height);
            alphaBackupCtx.drawImage(activeLayer.canvas, 0, 0);

            alphaScratchCanvas.width = canvas.width;
            alphaScratchCanvas.height = canvas.height;
            alphaScratchCtx.clearRect(0, 0, canvas.width, canvas.height);
            alphaScratchCtx.drawImage(activeLayer.canvas, 0, 0);
        }
        drawStroke(e);
    } else if (currentTool === 'lasso') {
        drawing = true;
        const coords = getCanvasCoordinates(e);
        lassoPoints = [coords];
        lassoActivePath = null;
    }
});

canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    if (currentTool === 'brush' || currentTool === 'eraser') {
        drawStroke(e);
    } else if (currentTool === 'lasso') {
        const coords = getCanvasCoordinates(e);
        lassoPoints.push(coords);
        
        // Render a live running lasso preview outline path
        mainCtx.save();
        compositeCanvasStack();
        mainCtx.strokeStyle = '#ffff00';
        mainCtx.lineWidth = 2 / scale;
        mainCtx.beginPath();
        mainCtx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
        for(let i = 1; i < lassoPoints.length; i++) {
            mainCtx.lineTo(lassoPoints[i].x, lassoPoints[i].y);
        }
        mainCtx.stroke();
        mainCtx.restore();
    }
});

canvas.addEventListener('pointerup', (e) => {
    if (!drawing) return;
    drawing = false;
    
    if (currentTool === 'brush' || currentTool === 'eraser') {
        stopDrawing();
    } else if (currentTool === 'lasso') {
        if (lassoPoints.length > 2) {
            lassoActivePath = [...lassoPoints];
        } else {
            lassoActivePath = null;
        }
        compositeCanvasStack();
    }
});

function drawStroke(e) {
    if (!drawing || activePointers.length >= 2 || !lastCoords) return;
    
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer) return;

    strokeHasPainted = true;
    const coords = getCanvasCoordinates(e);
    
    if (activeLayer.alphaLock) {
        alphaScratchCtx.save();
        
        // NEW: Enforce Lasso selection masks directly onto Alpha Lock operations
        if (lassoActivePath) {
            alphaScratchCtx.beginPath();
            renderLassoPathOnContext(alphaScratchCtx);
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
        // Standard Drawing Routine
        activeLayer.ctx.save();

        // NEW: Enforce Lasso boundary constraints onto regular drawing tracks
        if (lassoActivePath) {
            activeLayer.ctx.beginPath();
            renderLassoPathOnContext(activeLayer.ctx);
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

function stopDrawing() {
    if (drawing) {
        drawing = false;
    }
    lastCoords = null;
    if (strokeHasPainted && currentTool === 'brush') {
        commitColorToPalette(activeColor);
    }
    updateLayersUI();
    speedpaintFrames.push(canvas.toDataURL('image/jpeg', 0.6));
}

function renderLassoPathOnContext(ctx) {
    if (!lassoActivePath || lassoActivePath.length < 2) return;
    ctx.moveTo(lassoActivePath[0].x, lassoActivePath[0].y);
    for (let i = 1; i < lassoActivePath.length; i++) {
        ctx.lineTo(lassoActivePath[i].x, lassoActivePath[i].y);
    }
    ctx.closePath();
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
    // Check if clicking UI panels first
    if (e.target.closest('.top-bar') || e.target.closest('.left-controls') || e.target.closest('.color-panel') || e.target.closest('.layer-sidebar')) return;

    // Handle interactive Transform nodes if enabled
    if (currentTool === 'transform' && transformActive) {
        if (checkTransformHandlesPointerDown(e)) {
            return; 
        }
    }

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
    // Route handles down to dedicated tracking engine loops if active
    if (currentTool === 'transform' && transformActive && transformInteraction.type) {
        handleTransformEngineTrackingMove(e);
        return;
    }

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
        
        // Multi-touch rotation handles rotation of transform node if active, otherwise routes back to standard workspace camera configurations
        if (currentTool === 'transform' && transformActive) {
            transformState.rotation = transformState.rotation + (currentAngle - initialTouchAngle);
        } else {
            rotation = initialRotation + (currentAngle - initialTouchAngle);
        }

        const currentMidX = (activePointers[0].clientX + activePointers[1].clientX) / 2;
        const currentMidY = (activePointers[0].clientY + activePointers[1].clientY) / 2;
        
        panX = currentMidX - startPanX;
        panY = currentMidY - startPanY;

        applyTransforms();
        compositeCanvasStack();
    }
};

window.addEventListener('pointerdown', handlePointerDownGlobal);
window.addEventListener('pointermove', handlePointerMoveGlobal);

function handlePointerUp(e) {
    if (currentTool === 'transform' && transformInteraction.type) {
        transformInteraction.type = null;
        compositeCanvasStack();
    }

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
    compositeCanvasStack();
}, { passive: false });

// NEW: Transform Implementation Engine Structures
function initializeTransformSession() {
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer) return;

    const src = document.createElement('canvas');
    let xMin = 0, yMin = 0, xMax = canvas.width, yMax = canvas.height;

    if (lassoActivePath) {
        // Find selection bounding bounds box limits
        lassoActivePath.forEach(pt => {
            if (pt.x < xMin) xMin = pt.x;
            if (pt.x > xMax) xMax = pt.x;
            if (pt.y < yMin) yMin = pt.y;
            if (pt.y > yMax) yMax = pt.y;
        });
        
        // Clamp bounds to canvas limits
        xMin = Math.max(0, Math.floor(xMin));
        yMin = Math.max(0, Math.floor(yMin));
        xMax = Math.min(canvas.width, Math.ceil(xMax));
        yMax = Math.min(canvas.height, Math.ceil(yMax));
        
        let w = xMax - xMin;
        let h = yMax - yMin;
        if (w <= 0 || h <= 0) return;

        src.width = w;
        src.height = h;
        const sCtx = src.getContext('2d');
        
        // Clip selection path maps precisely
        sCtx.save();
        sCtx.translate(-xMin, -yMin);
        sCtx.beginPath();
        renderLassoPathOnContext(sCtx);
        sCtx.clip();
        sCtx.drawImage(layer.canvas, 0, 0);
        sCtx.restore();

        transformState.x = xMin + w / 2;
        transformState.y = yMin + h / 2;
        transformState.width = w;
        transformState.height = h;
        transformState.isLassoCutout = true;
    } else {
        // Default to targeting the whole layer context space
        src.width = canvas.width;
        src.height = canvas.height;
        src.getContext('2d').drawImage(activeLayer.canvas, 0, 0);

        transformState.x = canvas.width / 2;
        transformState.y = canvas.height / 2;
        transformState.width = canvas.width;
        transformState.height = canvas.height;
        transformState.isLassoCutout = false;
    }

    transformState.rotation = 0;
    transformState.sourceCanvas = src;
    transformActive = true;
}

function commitTransform() {
    if (!transformActive || !transformState.sourceCanvas) return;
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer) return;

    saveUndoState();

    const nextCanvas = document.createElement('canvas');
    nextCanvas.width = canvas.width;
    nextCanvas.height = canvas.height;
    const nCtx = nextCanvas.getContext('2d');

    // Retain baseline data untouched outside lasso structures if required
    if (transformState.isLassoCutout) {
        nCtx.drawImage(activeLayer.canvas, 0, 0);
        nCtx.save();
        nCtx.globalCompositeOperation = 'destination-out';
        nCtx.beginPath();
        renderLassoPathOnContext(nCtx);
        nCtx.fill();
        nCtx.restore();
    }

    // Apply active workspace matrices onto backing target spaces
    nCtx.save();
    nCtx.translate(transformState.x, transformState.y);
    nCtx.rotate((transformState.rotation * Math.PI) / 180);
    nCtx.drawImage(
        transformState.sourceCanvas, 
        -transformState.width / 2, 
        -transformState.height / 2, 
        transformState.width, 
        transformState.height
    );
    nCtx.restore();

    activeLayer.ctx.clearRect(0, 0, canvas.width, canvas.height);
    activeLayer.ctx.drawImage(nextCanvas, 0, 0);

    clearTransform();
}

function clearTransform() {
    transformActive = false;
    transformState.sourceCanvas = null;
    lassoActivePath = null;
    lassoPoints = [];
}

function drawTransformBoundingBox() {
    mainCtx.save();
    
    // Position transform coordinates to align onto center coordinates matrix properties
    mainCtx.translate(transformState.x, transformState.y);
    mainCtx.rotate((transformState.rotation * Math.PI) / 180);

    const w = transformState.width;
    const h = transformState.height;
    const pad = 0;

    // Main Box Frame
    mainCtx.strokeStyle = '#007acc';
    mainCtx.lineWidth = 2 / scale;
    mainCtx.strokeRect(-w/2 - pad, -h/2 - pad, w + pad*2, h + pad*2);

    // Bounding handle configurations
    const hs = 10 / scale; // Screen responsive structural size logic handling metrics
    mainCtx.fillStyle = '#ffffff';

    // 4 Corner Resizers
    mainCtx.fillRect(-w/2 - hs/2, -h/2 - hs/2, hs, hs); // NW
    mainCtx.strokeRect(-w/2 - hs/2, -h/2 - hs/2, hs, hs);
    
    mainCtx.fillRect(w/2 - hs/2, -h/2 - hs/2, hs, hs);  // NE
    mainCtx.strokeRect(w/2 - hs/2, -h/2 - hs/2, hs, hs);
    
    mainCtx.fillRect(w/2 - hs/2, h/2 - hs/2, hs, hs);   // SE
    mainCtx.strokeRect(w/2 - hs/2, h/2 - hs/2, hs, hs);
    
    mainCtx.fillRect(-w/2 - hs/2, h/2 - hs/2, hs, hs);  // SW
    mainCtx.strokeRect(-w/2 - hs/2, h/2 - hs/2, hs, hs);

    // Rotation stem link and circular node elements
    mainCtx.beginPath();
    mainCtx.moveTo(0, -h/2);
    mainCtx.lineTo(0, -h/2 - 30/scale);
    mainCtx.stroke();

    mainCtx.beginPath();
    mainCtx.arc(0, -h/2 - 30/scale, hs/1.2, 0, Math.PI * 2);
    mainCtx.fill();
    mainCtx.stroke();

    mainCtx.restore();
}

function checkTransformHandlesPointerDown(e) {
    const modelCoords = getCanvasCoordinates(e);

    // Convert canvas-space interaction data into local transformed object structures
    const dx = modelCoords.x - transformState.x;
    const dy = modelCoords.y - transformState.y;
    const rad = (-transformState.rotation * Math.PI) / 180;
    const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ly = dx * Math.sin(rad) + dy * Math.cos(rad);

    const w = transformState.width;
    const h = transformState.height;
    const tol = 16 / scale; // Target precision threshold clearance buffers

    // Rotation handle check
    if (Math.hypot(lx - 0, ly - (-h/2 - 30/scale)) < tol) {
        transformInteraction.type = 'rotate';
        storeTransformInitialSession(e);
        return true;
    }
    // Corners checks
    if (Math.hypot(lx - (-w/2), ly - (-h/2)) < tol) { transformInteraction.type = 'nw'; storeTransformInitialSession(e); return true; }
    if (Math.hypot(lx - (w/2), ly - (-h/2)) < tol) { transformInteraction.type = 'ne'; storeTransformInitialSession(e); return true; }
    if (Math.hypot(lx - (w/2), ly - (h/2)) < tol) { transformInteraction.type = 'se'; storeTransformInitialSession(e); return true; }
    if (Math.hypot(lx - (-w/2), ly - (h/2)) < tol) { transformInteraction.type = 'sw'; storeTransformInitialSession(e); return true; }

    // Body Check to Move entire item
    if (lx >= -w/2 && lx <= w/2 && ly >= -h/2 && ly <= h/2) {
        transformInteraction.type = 'move';
        storeTransformInitialSession(e);
        return true;
    }

    return false;
}

function storeTransformInitialSession(e) {
    transformInteraction.startX = e.clientX;
    transformInteraction.startY = e.clientY;
    transformInteraction.startState = { ...transformState };
}

function handleTransformEngineTrackingMove(e) {
    const dx = (e.clientX - transformInteraction.startX) / scale;
    const dy = (e.clientY - transformInteraction.startY) / scale;
    const state = transformInteraction.startState;

    // Process tracking adjustments relative to localized rotation properties
    const rad = (-rotation * Math.PI) / 180;
    const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ry = dx * Math.sin(rad) + dy * Math.cos(rad);

    if (transformInteraction.type === 'move') {
        transformState.x = state.x + rx;
        transformState.y = state.y + ry;
    } else if (transformInteraction.type === 'rotate') {
        const centerScreenX = panX + (transformState.x - canvas.width/2) * scale;
        const centerScreenY = panY + (transformState.y - canvas.height/2) * scale;
        const initialAngle = Math.atan2(transformInteraction.startY - centerScreenY, transformInteraction.startX - centerScreenX);
        const currentAngle = Math.atan2(e.clientY - centerScreenY, e.clientX - centerScreenX);
        transformState.rotation = state.rotation + (currentAngle - initialAngle) * 180 / Math.PI;
    } else {
        // Interactive Scale Corner Computations
        let factorX = 1;
        let factorY = 1;
        if (transformInteraction.type === 'nw') { factorX = -1; factorY = -1; }
        if (transformInteraction.type === 'ne') { factorX = 1; factorY = -1; }
        if (transformInteraction.type === 'se') { factorX = 1; factorY = 1; }
        if (transformInteraction.type === 'sw') { factorX = -1; factorY = 1; }

        const localRad = (state.rotation * Math.PI) / 180;
        const lx = rx * Math.cos(-localRad) - ry * Math.sin(-localRad);
        const ly = rx * Math.sin(-localRad) + ry * Math.cos(-localRad);

        transformState.width = Math.max(10, state.width + lx * factorX * 2);
        transformState.height = Math.max(10, state.height + ly * factorY * 2);
    }

    compositeCanvasStack();
}

// Undo and Redo Implementation Subsystems
function saveUndoState() {
    const state = {
        activeId: activeLayerId,
        layerBackups: layers.map(l => {
            const backCanvas = document.createElement('canvas');
            backCanvas.width = canvas.width;
            backCanvas.height = canvas.height;
            backCanvas.getContext('2d').drawImage(l.canvas, 0, 0);
            return {
                id: l.id,
                name: l.name,
                canvas: backCanvas,
                visible: l.visible,
                opacity: l.opacity,
                blendMode: l.blendMode,
                clipping: l.clipping,
                alphaLock: l.alphaLock
            };
        })
    };
    undoStack.push(state);
    redoStack = [];
    updateUndoRedoButtons();
}

undoBtn.addEventListener('click', () => {
    if (undoStack.length > 0) {
        if (currentTool === 'transform') clearTransform();
        
        // Push current layout onto redo array
        const currentBackup = {
            activeId: activeLayerId,
            layerBackups: layers.map(l => {
                const backCanvas = document.createElement('canvas');
                backCanvas.width = canvas.width;
                backCanvas.height = canvas.height;
                backCanvas.getContext('2d').drawImage(l.canvas, 0, 0);
                return {
                    id: l.id,
                    name: l.name,
                    canvas: backCanvas,
                    visible: l.visible,
                    opacity: l.opacity,
                    blendMode: l.blendMode,
                    clipping: l.clipping,
                    alphaLock: l.alphaLock
                };
            })
        };
        redoStack.push(currentBackup);

        const previousState = undoStack.pop();
        activeLayerId = previousState.activeId;
        layers = previousState.layerBackups.map(b => {
            const layerCanvas = document.createElement('canvas');
            layerCanvas.width = canvas.width;
            layerCanvas.height = canvas.height;
            layerCanvas.getContext('2d').drawImage(b.canvas, 0, 0);
            return {
                id: b.id,
                name: b.name,
                canvas: layerCanvas,
                ctx: layerCanvas.getContext('2d'),
                visible: b.visible,
                opacity: b.opacity,
                blendMode: b.blendMode,
                clipping: b.clipping,
                alphaLock: b.alphaLock
            };
        });

        updateLayersUI();
        updateUndoRedoButtons();
        compositeCanvasStack();
    }
});

redoBtn.addEventListener('click', () => {
    if (redoStack.length > 0) {
        const nextState = redoStack.pop();
        
        const currentBackup = {
            activeId: activeLayerId,
            layerBackups: layers.map(l => {
                const backCanvas = document.createElement('canvas');
                backCanvas.width = canvas.width;
                backCanvas.height = canvas.height;
                backCanvas.getContext('2d').drawImage(l.canvas, 0, 0);
                return {
                    id: l.id,
                    name: l.name,
                    canvas: backCanvas,
                    visible: l.visible,
                    opacity: l.opacity,
                    blendMode: l.blendMode,
                    clipping: l.clipping,
                    alphaLock: l.alphaLock
                };
            })
        };
        undoStack.push(currentBackup);

        activeLayerId = nextState.activeId;
        layers = nextState.layerBackups.map(b => {
            const layerCanvas = document.createElement('canvas');
            layerCanvas.width = canvas.width;
            layerCanvas.height = canvas.height;
            layerCanvas.getContext('2d').drawImage(b.canvas, 0, 0);
            return {
                id: b.id,
                name: b.name,
                canvas: layerCanvas,
                ctx: layerCanvas.getContext('2d'),
                visible: b.visible,
                opacity: b.opacity,
                blendMode: b.blendMode,
                clipping: b.clipping,
                alphaLock: b.alphaLock
            };
        });

        updateLayersUI();
        updateUndoRedoButtons();
        compositeCanvasStack();
    }
});

function updateUndoRedoButtons() {
    undoBtn.disabled = undoStack.length === 0;
    redoBtn.disabled = redoStack.length === 0;
}

// Image File Exporter Pipeline Blocks
function exportImage(format, fileName) {
    if (currentTool === 'transform') commitTransform();
    
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const eCtx = exportCanvas.getContext('2d');

    if (format === 'image/jpeg') {
        eCtx.fillStyle = '#ffffff';
        eCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    }

    eCtx.drawImage(canvas, 0, 0);
    
    const link = document.createElement('a');
    link.download = fileName;
    link.href = exportCanvas.toDataURL(format, 0.95);
    link.click();
}

function exportSvgFile() {
    if (currentTool === 'transform') commitTransform();
    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
        <image href="${canvas.toDataURL('image/png')}" width="${canvas.width}" height="${canvas.height}"/>
    </svg>`;
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const link = document.createElement('a');
    link.download = 'canvas.svg';
    link.href = URL.createObjectURL(blob);
    link.click();
}

function exportSpeedpaintVideo() {
    if (speedpaintFrames.length === 0) {
        alert("No speedpaint timeline data recorded yet!");
        return;
    }
    
    // Fallback compilation method using canvas recording processes
    const streamCanvas = document.createElement('canvas');
    streamCanvas.width = canvas.width;
    streamCanvas.height = canvas.height;
    const sCtx = streamCanvas.getContext('2d');
    
    const stream = streamCanvas.captureStream(12); // 12 FPS Frame rates
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks = [];
    
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const link = document.createElement('a');
        link.download = 'speedpaint.webm';
        link.href = URL.createObjectURL(blob);
        link.click();
    };
    
    recorder.start();
    
    let frameIdx = 0;
    function appendFrameToStream() {
        if (frameIdx >= speedpaintFrames.length) {
            recorder.stop();
            return;
        }
        const img = new Image();
        img.onload = () => {
            sCtx.fillStyle = '#ffffff';
            sCtx.fillRect(0, 0, streamCanvas.width, streamCanvas.height);
            sCtx.drawImage(img, 0, 0);
            frameIdx++;
            setTimeout(appendFrameToStream, 80); // 80ms step frames intervals
        };
        img.src = speedpaintFrames[frameIdx];
    }
    
    appendFrameToStream();
