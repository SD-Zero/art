// Helper to draw an elegant Ibis-style line stroke snapshot preview box
function generateBrushPreview(brush) {
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = 140;
    previewCanvas.height = 40;
    const pCtx = previewCanvas.getContext('2d');
    
    // Clear back plate to clean solid white
    pCtx.fillStyle = '#ffffff';
    pCtx.fillRect(0, 0, 140, 40);
    
    pCtx.save();
    pCtx.fillStyle = '#222222';
    pCtx.strokeStyle = '#222222';
    
    const points = [];
    const steps = 35;
    
    // Generate a beautiful preview coordinate line path with mid-stroke maximum pressure curves
    for (let i = 0; i <= steps; i++) {
        let t = i / steps;
        let x = 15 + (110 * t);
        let y = 20 + Math.sin(t * Math.PI * 2) * 4; 
        let pressure = Math.sin(t * Math.PI); // Perfectly tapered stroke on both ends
        points.push({ x, y, pressure });
    }
    
    // Render preview track path loops manually
    for (let i = 0; i < points.length - 1; i++) {
        let p1 = points[i];
        let p2 = points[i + 1];
        
        pCtx.save();
        
        let size = 5; // Base line scale weight
        if (brush.pressureSize) size *= (p1.pressure * 1.5 + 0.2);
        size = Math.max(0.8, size);
        
        if (brush.pressureOpacity) pCtx.globalAlpha = p1.pressure * 0.85 + 0.15;
        
        if (brush.behavior === 'chisel') {
            pCtx.translate(p1.x, p1.y);
            pCtx.rotate(-Math.PI / 4);
            pCtx.fillRect(-size / 2, -size / 8, size, size / 4);
        } else if (brush.softEdge) {
            const radGrad = pCtx.createRadialGradient(p1.x, p1.y, size * 0.2, p1.x, p1.y, size);
            radGrad.addColorStop(0, '#222222');
            radGrad.addColorStop(1, '#22222200');
            pCtx.fillStyle = radGrad;
            pCtx.beginPath();
            pCtx.arc(p1.x, p1.y, size, 0, Math.PI * 2);
            pCtx.fill();
        } else {
            pCtx.lineWidth = size;
            pCtx.lineCap = 'round';
            pCtx.beginPath();
            pCtx.moveTo(p1.x, p1.y);
            pCtx.lineTo(p2.x, p2.y);
            pCtx.stroke();
        }
        
        pCtx.restore();
    }
    
    pCtx.restore();
    return previewCanvas;
}

// Modular Sub-Menu UI Generation Logic
function renderModularBrushUI() {
    brushCategoriesList.innerHTML = '';
    
    const categories = Object.keys(BrushRegistry);
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `category-btn ${cat === activeCategoryKey ? 'active' : ''}`;
        btn.textContent = cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ');
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
        
        // Click interaction triggers active key selection update
        card.addEventListener('click', () => {
            activeBrushKey = vKey;
            renderModularBrushUI();
        });

        // Generate dynamic thumbnail image preview box dynamically
        const previewCanvas = generateBrushPreview(variant);
        previewCanvas.className = "brush-preview-frame";
        card.appendChild(previewCanvas);

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
