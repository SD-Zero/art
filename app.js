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

// Custom Engine Dropdowns
const brushCategorySelect = document.getElementById('brushCategorySelect');
const brushVariantSelect = document.getElementById('brushVariantSelect');

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

// EXTENSIBLE STRUCTURED REGISTRY SYSTEM
const BrushRegistry = {
    ink: {
        name: "Ink",
        variants: {
            hard_ink: {
                name: "Hard Ink",
                config: { spacing: 0.05, stabilization: 0.9, texture: "none", pressureInfluence: { size: 0.8, opacity: 0.0, scatter: 0.0 } }
            },
            soft_ink: {
                name: "Soft Ink",
                config: { spacing: 0.08, stabilization: 0.6, texture: "soft_edge", pressureInfluence: { size: 0.6, opacity: 0.3, scatter: 0.0 } }
            },
            calligraphy: {
                name: "Calligraphy Ink",
                config: { spacing: 0.03, stabilization: 0.8, texture: "directional", pressureInfluence: { size: 1.0, opacity: 0.0, scatter: 0.0 } }
            }
        }
    },
    pencil: {
        name: "Pencil",
        variants: {
            light_pencil: {
                name: "Light Pencil",
                config: { spacing: 0.15, stabilization: 0.2, texture: "grain", pressureInfluence: { size: 0.2, opacity: 0.8, scatter: 0.1 } }
            },
            graphite: {
                name: "Graphite Pencil",
                config: { spacing: 0.12, stabilization: 0.3, texture: "heavy_grain", pressureInfluence: { size: 0.4, opacity: 0.9, scatter: 0.15 } }
            },
            mechanical: {
                name: "Mechanical Pencil",
                config: { spacing: 0.05, stabilization: 0.5, texture: "none", pressureInfluence: { size: 0.0, opacity: 0.3, scatter: 0.0 } }
            }
        }
    },
    sketch: {
        name: "Sketch",
        variants: {
            rough_sketch: {
                name: "Rough Sketch",
                config: { spacing: 0.2, stabilization: 0.0, texture: "fine_grain", pressureInfluence: { size: 0.5, opacity: 0.6, scatter: 0.0 } }
            },
            clean_sketch: {
                name: "Clean Sketch",
                config: { spacing: 0.08, stabilization: 0.5, texture: "none", pressureInfluence: { size: 0.5, opacity: 0.5, scatter: 0.0 } }
            },
            gesture: {
                name: "Gesture Sketch",
                config: { spacing: 0.25, stabilization: 0.1, texture: "none", pressureInfluence: { size: 0.3, opacity: 0.9, scatter: 0.0 } }
            }
        }
    },
    marker: {
        name: "Marker",
        variants: {
            chisel: {
                name: "Chisel Marker",
                config: { spacing: 0.04, stabilization: 0.4, texture: "chisel_flat", pressureInfluence: { size: 0.0, opacity: 0.2, scatter: 0.0 } }
            },
            round: {
                name: "Round Marker",
                config: { spacing: 0.05, stabilization: 0.4, texture: "none", pressureInfluence: { size: 0.0, opacity: 0.1, scatter: 0.0 } }
            },
            soft_marker: {
                name: "Soft Marker",
                config: { spacing: 0.06, stabilization: 0.5, texture: "soft_edge", pressureInfluence: { size: 0.1, opacity: 0.4, scatter: 0.0 } }
            }
        }
    },
    pen: {
        name: "Pen",
        variants: {
            fine_liner: {
                name: "Fine Liner",
                config: { spacing: 0.04, stabilization: 0.6, texture: "none", pressureInfluence: { size: 0.0, opacity: 0.0, scatter: 0.0 } }
            },
            technical: {
                name: "Technical Pen",
                config: { spacing: 0.02, stabilization: 0.9, texture: "none", pressureInfluence: { size: 0.0, opacity: 0.0, scatter: 0.0 } }
            },
            brush_pen: {
                name: "Brush Pen",
                config: { spacing: 0.03, stabilization: 0.7, texture: "tapered", pressureInfluence: { size: 1.0, opacity: 0.4, scatter: 0.0 } }
            }
        }
    },
    spray: {
        name: "Spray Paint",
        variants: {
            soft_spray: {
                name: "Soft Spray",
                config: { spacing: 0.4, stabilization: 0.2, texture: "spray_soft", particleCount: 35, performanceThrottling: true, pressureInfluence: { size: 0.4, opacity: 0.6, scatter: 0.8 } }
            },
            hard_spray: {
                name: "Hard Spray",
                config: { spacing: 0.2, stabilization: 0.3, texture: "spray_dense", particleCount: 60, performanceThrottling: true, pressureInfluence: { size: 0.2, opacity: 0.4, scatter: 0.2 } }
            },
            splatter: {
                name: "Splatter Spray",
                config: { spacing: 0.8, stabilization: 0.1, texture: "spray_splat", particleCount: 15, performanceThrottling: false, pressureInfluence: { size: 0.8, opacity: 0.8, scatter: 1.0 } }
            }
        }
    },
    airbrush: {
        name: "Airbrush",
        variants: {
            soft_airbrush: {
                name: "Soft Airbrush",
                config: { spacing: 0.05, stabilization: 0.5, texture: "airbrush_wide", pressureInfluence: { size: 0.3, opacity: 0.9, scatter: 0.0 } }
            },
            controlled: {
                name: "Controlled Airbrush",
                config: { spacing: 0.04, stabilization: 0.6, texture: "airbrush_mod", pressureInfluence: { size: 0.5, opacity: 0.7, scatter: 0.0 } }
            },
            focused: {
                name: "Focused Airbrush",
                config: { spacing: 0.03, stabilization: 0.7, texture: "airbrush_tight", pressureInfluence: { size: 0.6, opacity: 0.5, scatter: 0.0 } }
            }
        }
    },
    watercolor: {
        name: "Watercolor",
        variants: {
            light_wash: {
                name: "Light Wash",
                config: { spacing: 0.3, stabilization: 0.4, texture: "water_soft", performanceThrottling: true, pressureInfluence: { size: 0.4, opacity: 0.9, scatter: 0.0 } }
            },
            wet_blend: {
                name: "Wet Blend",
                config: { spacing: 0.2, stabilization: 0.5, texture: "water_diffuse", performanceThrottling: true, pressureInfluence: { size: 0.6, opacity: 0.5, scatter: 0.0 } }
            },
            pigment_heavy: {
                name: "Pigment Heavy Wash",
                config: { spacing: 0.15, stabilization: 0.6, texture: "water_heavy", performanceThrottling: true, pressureInfluence: { size: 0.5, opacity: 0.2, scatter: 0.0 } }
            }
        }
    }
};

// Selection State for Active Brushes
let activeCategory = "ink";
let activeVariant = "hard_ink";

// BRUSH ENGINE ARCHITECTURE
const BrushEngine = {
    historyQueue: [],
    lastDrawnPoint: null,
    remainderDistance: 0,

    getVariant() {
        const cat = BrushRegistry[activeCategory];
        if (!cat) return BrushRegistry["ink"].variants["hard_ink"];
        return cat.variants[activeVariant] || Object.values(cat.variants)[0];
    },

    initializeStroke(x, y, pressure) {
        const variant = this.getVariant();
        this.historyQueue = [{ x, y, pressure }];
        this.lastDrawnPoint = { x, y, pressure };
        this.remainderDistance = 0;
    },

    processStroke(x, y, pressure) {
        const variant = this.getVariant();
        const stabilizationStrength = variant.config.stabilization;
        
        // Mathematical Pointer Stabilization Integration
        const lastQueued = this.historyQueue[this.historyQueue.length - 1];
        const stabilizedX = lastQueued.x + (x - lastQueued.x) * (1 - stabilizationStrength);
        const stabilizedY = lastQueued.y + (y - lastQueued.y) * (1 - stabilizationStrength);
        const stabilizedPressure = lastQueued.pressure + (pressure - lastQueued.pressure) * (1 - stabilizationStrength);

        const targetPoint = { x: stabilizedX, y: stabilizedY, pressure: stabilizedPressure };
        this.historyQueue.push(targetPoint);

        // Spline Generation Mapping into Segments
        let dx = targetPoint.x - this.lastDrawnPoint.x;
        let dy = targetPoint.y - this.lastDrawnPoint.y;
        let distance = Math.hypot(dx, dy);
        
        // Variable Mapping Size Configuration
        const baseSize = currentBrushSize;
        const mappedSize = baseSize * (1 - variant.config.pressureInfluence.size * (1 - targetPoint.pressure));
        const stepSpacing = Math.max(1, mappedSize * variant.config.spacing);

        let currentOffset = stepSpacing - this.remainderDistance;

        if (distance >= currentOffset) {
            const headingAngle = Math.atan2(dy, dx);
            while (currentOffset <= distance) {
                const ratio = currentOffset / distance;
                const interpolatedPoint = {
                    x: this.lastDrawnPoint.x + dx * ratio,
                    y: this.lastDrawnPoint.y + dy * ratio,
                    pressure: this.lastDrawnPoint.pressure + (targetPoint.pressure - this.lastDrawnPoint.pressure) * ratio,
                    angle: headingAngle
                };

                // Performance Throttle Execution Mapping
                if (variant.config.performanceThrottling) {
                    if (Math.random() > 0.85) {
                        currentOffset += stepSpacing;
                        continue;
                    }
                }

                this.renderSegment(interpolatedPoint, variant);
                currentOffset += stepSpacing;
            }
            this.remainderDistance = distance - (currentOffset - stepSpacing);
            this.lastDrawnPoint = targetPoint;
        } else {
            this.remainderDistance += distance;
            this.lastDrawnPoint = targetPoint;
        }
    },

    renderSegment(point, variant) {
        const renderCtx = activeLayerLockCtx();
        if (!renderCtx) return;

        renderCtx.save();

        // Calculations for Configured Pressure Influences
        const calculatedSize = currentBrushSize * (1 - variant.config.pressureInfluence.size * (1 - point.pressure));
        const calculatedOpacity = currentOpacity * (1 - variant.config.pressureInfluence.opacity * (1 - point.pressure));

        renderCtx.globalAlpha = Math.max(0, Math.min(1, calculatedOpacity));
        
        if (currentTool === 'eraser') {
            renderCtx.globalCompositeOperation = 'destination-out';
            renderCtx.fillStyle = 'rgba(0,0,0,1.0)';
            renderCtx.strokeStyle = 'rgba(0,0,0,1.0)';
        } else {
            renderCtx.globalCompositeOperation = 'source-over';
            renderCtx.fillStyle = activeColor;
            renderCtx.strokeStyle = activeColor;
        }

        // Texture Context Routing Switch
        switch (variant.config.texture) {
            case "directional":
                // Directional Brush Taper
                renderCtx.translate(point.x, point.y);
                renderCtx.rotate(point.angle);
                renderCtx.beginPath();
                renderCtx.ellipse(0, 0, calculatedSize * 0.5, calculatedSize * 1.5, 0, 0, Math.PI * 2);
                renderCtx.fill();
                break;

            case "chisel_flat":
                // Angled Marker Stroke
                renderCtx.translate(point.x, point.y);
                renderCtx.rotate(Math.PI / 4); // Standard 45 degree tilt
                renderCtx.fillRect(-calculatedSize / 2, -calculatedSize / 6, calculatedSize, calculatedSize / 3);
                break;

            case "soft_edge":
            case "airbrush_wide":
            case "airbrush_mod":
            case "airbrush_tight":
                // Soft Radiant Gradients
                let dropRadius = calculatedSize;
                if (variant.config.texture === "airbrush_wide") dropRadius *= 2.0;
                if (variant.config.texture === "airbrush_tight") dropRadius *= 0.5;

                let radialGrad = renderCtx.createRadialGradient(point.x, point.y, dropRadius * 0.1, point.x, point.y, dropRadius);
                if (currentTool === 'eraser') {
                    radialGrad.addColorStop(0, 'rgba(0,0,0,1.0)');
                    radialGrad.addColorStop(1, 'rgba(0,0,0,0.0)');
                } else {
                    radialGrad.addColorStop(0, activeColor);
                    radialGrad.addColorStop(1, 'rgba(0,0,0,0.0)');
                }
                renderCtx.fillStyle = radialGrad;
                renderCtx.beginPath();
                renderCtx.arc(point.x, point.y, dropRadius, 0, Math.PI * 2);
                renderCtx.fill();
                break;

            case "spray_soft":
            case "spray_dense":
            case "spray_splat":
                // Scatter Distribution System with Core Caps
                let maxParticles = variant.config.particleCount || 20;
                let sprayRadius = calculatedSize * 2.0;
                
                if (variant.config.texture === "spray_dense") sprayRadius *= 0.6;
                if (variant.config.texture === "spray_splat") sprayRadius *= 3.0;

                const scatterFactor = variant.config.pressureInfluence.scatter;
                let activeRadius = sprayRadius * (1 + scatterFactor * point.pressure);

                for (let p = 0; p < maxParticles; p++) {
                    let radDist = Math.random() * activeRadius;
                    let randAng = Math.random() * Math.PI * 2;
                    let px = point.x + Math.cos(randAng) * radDist;
                    let py = point.y + Math.sin(randAng) * radDist;
                    
                    let partSize = Math.max(1, calculatedSize * 0.06);
                    if (variant.config.texture === "spray_splat") {
                        partSize = Math.max(2, Math.random() * calculatedSize * 0.25);
                    }

                    renderCtx.beginPath();
                    renderCtx.arc(px, py, partSize, 0, Math.PI * 2);
                    renderCtx.fill();
                }
                break;

            case "water_soft":
            case "water_diffuse":
            case "water_heavy":
                // Fluid Wet Edge Layer Simulation
                let waterSize = calculatedSize * 1.5;
                let bleedEdge = renderCtx.createRadialGradient(point.x, point.y, waterSize * 0.7, point.x, point.y, waterSize);
                
                let heavyOpacity = variant.config.texture === "water_heavy" ? 0.25 : 0.08;
                renderCtx.globalAlpha = Math.max(0, Math.min(1, calculatedOpacity * heavyOpacity));

                bleedEdge.addColorStop(0, activeColor);
                bleedEdge.addColorStop(0.8, activeColor);
                bleedEdge.addColorStop(0.95, "rgba(0,0,0,0.15)");
                bleedEdge.addColorStop(1, 'rgba(0,0,0,0.0)');

                renderCtx.fillStyle = bleedEdge;
                renderCtx.beginPath();
                renderCtx.arc(point.x, point.y, waterSize, 0, Math.PI * 2);
                renderCtx.fill();
                break;

            case "grain":
            case "heavy_grain":
            case "fine_grain":
                // Jittered Noise Distribution Patterns
                renderCtx.beginPath();
                renderCtx.arc(point.x, point.y, calculatedSize / 2, 0, Math.PI * 2);
                renderCtx.clip();

                let granularity = variant.config.texture === "heavy_grain" ? 45 : 15;
                for (let g = 0; g < granularity; g++) {
                    let rx = point.x + (Math.random() - 0.5) * calculatedSize;
                    let ry = point.y + (Math.random() - 0.5) * calculatedSize;
                    let noiseDiameter = Math.random() * 2 + 0.5;
                    
                    renderCtx.beginPath();
                    renderCtx.arc(rx, ry, noiseDiameter, 0, Math.PI * 2);
                    renderCtx.fill();
                }
                break;

            case "none":
            default:
                // Solid Crisp Stamp Rendering
                renderCtx.beginPath();
                renderCtx.arc(point.x, point.y, calculatedSize / 2, 0, Math.PI * 2);
                renderCtx.fill();
                break;
        }

        renderCtx.restore();
    }
};

// UI Generation Logic Engine for Selector Dropdowns
function buildRegistrySelectors() {
    brushCategorySelect.innerHTML = '';
    Object.keys(BrushRegistry).forEach(catKey => {
        const option = document.createElement('option');
        option.value = catKey;
        option.textContent = BrushRegistry[catKey].name;
        brushCategorySelect.appendChild(option);
    });

    brushCategorySelect.value = activeCategory;
    syncVariantsSelector();

    brushCategorySelect.addEventListener('change', (e) => {
        activeCategory = e.target.value;
        syncVariantsSelector();
    });

    brushVariantSelect.addEventListener('change', (e) => {
        activeVariant = e.target.value;
    });
}

function syncVariantsSelector() {
    brushVariantSelect.innerHTML = '';
    const currentCat = BrushRegistry[activeCategory];
    if (!currentCat) return;

    Object.keys(currentCat.variants).forEach(varKey => {
        const option = document.createElement('option');
        option.value = varKey;
        option.textContent = currentCat.variants[varKey].name;
        brushVariantSelect.appendChild(option);
    });
    
    activeVariant = Object.keys(currentCat.variants)[0];
    brushVariantSelect.value = activeVariant;
}

function activeLayerLockCtx() {
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer) return null;
    return activeLayer.alphaLock ? alphaScratchCtx : activeLayer.ctx;
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
    buildRegistrySelectors();
    
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
    strokeHasPainted = true; 

    const coords = getCanvasCoordinates(e);
    const pointPressure = e.pressure !== undefined && e.pressure !== 0 ? e.pressure : 0.5;

    if (activeLayer.alphaLock) {
        alphaBackupCtx.clearRect(0, 0, canvas.width, canvas.height);
        alphaBackupCtx.drawImage(activeLayer.canvas, 0, 0);

        alphaScratchCtx.clearRect(0, 0, canvas.width, canvas.height);
        alphaScratchCtx.drawImage(activeLayer.canvas, 0, 0);
    }
    
    BrushEngine.initializeStroke(coords.x, coords.y, pointPressure);
    BrushEngine.renderSegment({ x: coords.x, y: coords.y, pressure: pointPressure, angle: 0 }, BrushEngine.getVariant());
    compositeCanvasStack();
}

function drawStroke(e) {
    if (!drawing || activePointers.length >= 2) return;
    
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer) return;

    const coords = getCanvasCoordinates(e);
    const pointPressure = e.pressure !== undefined && e.pressure !== 0 ? e.pressure : 0.5;

    BrushEngine.processStroke(coords.x, coords.y, pointPressure);

    if (activeLayer.alphaLock) {
        activeLayer.ctx.clearRect(0, 0, canvas.width, canvas.height);
        activeLayer.ctx.drawImage(alphaScratchCanvas, 0, 0);

        activeLayer.ctx.save();
        activeLayer.ctx.globalCompositeOperation = 'destination-in';
        activeLayer.ctx.drawImage(alphaBackupCanvas, 0, 0);
        activeLayer.ctx.restore();
    }
    
    compositeCanvasStack();
}

function stopDrawing() {
    if (drawing) {
        drawing = false;
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
