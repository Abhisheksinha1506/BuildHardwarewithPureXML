let bomBuilder;
let selectedItem = null;
let darkMode = false;
let tooltipsSetup = false;
let tooltipHandlers = {
    documentClick: null,
    documentKeydown: null
};
let treeClickHandler = null; // Store tree event delegation handler
let costCache = new Map(); // Cache for cost calculations
let validateTimeout = null; // Timeout for debounced validation

// Debounce helper function
function debounce(func, wait) {
    return function(...args) {
        clearTimeout(validateTimeout);
        validateTimeout = setTimeout(() => func.apply(this, args), wait);
    };
}

try {
    if (typeof localStorage !== 'undefined') {
        darkMode = localStorage.getItem('darkMode') === 'true';
    }
} catch (e) {
    console.warn('localStorage not available:', e);
}

if (typeof BOMBuilder !== 'undefined') {
    bomBuilder = new BOMBuilder();
} else {
    console.error('BOMBuilder class not found');
}

document.addEventListener('DOMContentLoaded', function() {
    initializeUI();
    setupEventListeners();
    applyTheme();
});

function initializeUI() {
    if (!bomBuilder) {
        console.error('BOMBuilder not initialized');
        return;
    }
    if (bomBuilder.root) {
        renderTree();
        validateBOM(); // Initial validation doesn't need debouncing
    }
}

function setupEventListeners() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const addAssemblyBtn = document.getElementById('addAssemblyBtn');
    const addPartBtn = document.getElementById('addPartBtn');
    const saveBomBtn = document.getElementById('saveBomBtn');
    const loadBomBtn = document.getElementById('loadBomBtn');
    const loadSampleBtn = document.getElementById('loadSampleBtn');
    const exportBtn = document.getElementById('exportBtn');
    const exportBtnOutput = document.getElementById('exportBtnOutput');
    const fileInput = document.getElementById('fileInput');
    
    if (!darkModeToggle || !addAssemblyBtn || !addPartBtn || !saveBomBtn || 
        !loadBomBtn || !loadSampleBtn || !exportBtn || !fileInput) {
        console.error('Required DOM elements not found');
        return;
    }
    
    darkModeToggle.addEventListener('click', toggleDarkMode);
    addAssemblyBtn.addEventListener('click', addAssembly);
    addPartBtn.addEventListener('click', addPart);
    saveBomBtn.addEventListener('click', saveBOM);
    loadBomBtn.addEventListener('click', () => {
        fileInput.click();
    });
    loadSampleBtn.addEventListener('click', loadSample);
    
    const handleExport = () => {
        if (typeof exportAll === 'function') {
            exportAll();
        } else {
            alert('Export functionality loading...');
        }
    };
    
    exportBtn.addEventListener('click', handleExport);
    if (exportBtnOutput) {
        exportBtnOutput.addEventListener('click', handleExport);
    }
    
    fileInput.addEventListener('change', handleFileLoad);
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            if (tab) {
                switchTab(tab);
            }
        });
    });
    
    // Setup tooltip functionality
    setupTooltips();
}

function toggleDarkMode() {
    darkMode = !darkMode;
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('darkMode', darkMode.toString());
        }
    } catch (e) {
        console.warn('Could not save dark mode preference:', e);
    }
    applyTheme();
}

function applyTheme() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (!darkModeToggle) return;
    
    if (darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        darkModeToggle.textContent = '☀️ Light Mode';
    } else {
        document.documentElement.removeAttribute('data-theme');
        darkModeToggle.textContent = '🌙 Dark Mode';
    }
}

function addAssembly() {
    if (!bomBuilder) {
        alert('BOMBuilder not initialized. Please refresh the page.');
        return;
    }
    const name = prompt('Enter assembly name:', 'New Assembly');
    if (name && name.trim()) {
        const parent = selectedItem && selectedItem.type === 'assembly' ? selectedItem : null;
        const assembly = bomBuilder.createAssembly(name.trim(), parent);
        renderTree();
        selectItem(assembly);
        debouncedValidateBOM();
    }
}

function addPart() {
    if (!bomBuilder) {
        alert('BOMBuilder not initialized. Please refresh the page.');
        return;
    }
    const parent = selectedItem && selectedItem.type === 'assembly' ? selectedItem : null;
    const part = bomBuilder.createPart({ name: 'New Part' }, parent);
    renderTree();
    selectItem(part);
    debouncedValidateBOM();
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function renderTree() {
    const treeContainer = document.getElementById('partsTree');
    if (!treeContainer) return;
    
    // Remove old event delegation handler if it exists
    if (treeClickHandler) {
        treeContainer.removeEventListener('click', treeClickHandler);
        treeClickHandler = null;
    }
    
    if (!bomBuilder || !bomBuilder.root) {
        treeContainer.innerHTML = '<div class="empty-state"><p>No parts yet. Add an assembly or part to get started.</p></div>';
        return;
    }
    
    const hasChildren = bomBuilder.root.children && Array.isArray(bomBuilder.root.children) && bomBuilder.root.children.length > 0;
    
    if (!hasChildren) {
        treeContainer.innerHTML = '<div class="empty-state"><p>No parts yet. Add an assembly or part to get started.</p></div>';
        return;
    }
    
    // Clear cost cache for fresh calculations
    costCache.clear();
    
    // Use DocumentFragment for batch DOM operations
    const fragment = document.createDocumentFragment();
    
    function renderItem(item) {
        if (!item) return null;
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'tree-item';
        if (selectedItem === item) {
            itemDiv.classList.add('selected');
        }
        
        itemDiv.dataset.itemId = item.id;
        
        const icon = item.type === 'assembly' ? '📦' : '🔩';
        
        // Cache cost calculations to avoid O(n²) complexity
        let cost;
        if (item.type === 'part') {
            cost = `$${((item.cost || 0) * (item.quantity || 1)).toFixed(2)}`;
        } else {
            // Use cached cost if available, otherwise calculate and cache
            if (costCache.has(item.id)) {
                cost = `$${costCache.get(item.id).toFixed(2)}`;
            } else {
                const totalCost = bomBuilder ? bomBuilder.calculateTotalCost(item) : 0;
                costCache.set(item.id, totalCost);
                cost = `$${totalCost.toFixed(2)}`;
            }
        }
        
        const escapedName = escapeHTML(item.name || 'Unnamed');
        const escapedId = escapeHTML(item.id);
        
        itemDiv.innerHTML = `
            <div class="tree-item-header">
                <span class="tree-item-icon">${icon}</span>
                <span class="tree-item-name">${escapedName}</span>
                <span style="color: var(--text-secondary); font-size: 0.9em;">${cost}</span>
                <div class="tree-item-actions">
                    <button data-action="delete" data-item-id="${escapedId}">Delete</button>
                </div>
            </div>
        `;
        
        if (item.children && Array.isArray(item.children) && item.children.length > 0) {
            const childrenDiv = document.createElement('div');
            childrenDiv.className = 'tree-item-children';
            for (const child of item.children) {
                const childElement = renderItem(child);
                if (childElement) {
                    childrenDiv.appendChild(childElement);
                }
            }
            itemDiv.appendChild(childrenDiv);
        }
        
        return itemDiv;
    }
    
    const rootChildren = bomBuilder.root.children;
    if (rootChildren && Array.isArray(rootChildren)) {
        for (const child of rootChildren) {
            const childElement = renderItem(child);
            if (childElement) {
                fragment.appendChild(childElement);
            }
        }
    }
    
    // Clear container and append fragment in one operation
    treeContainer.innerHTML = '';
    treeContainer.appendChild(fragment);
    
    // Set up event delegation on the container (single listener for all items)
    treeClickHandler = (e) => {
        const target = e.target;
        const treeItem = target.closest('.tree-item');
        if (!treeItem) return;
        
        const itemId = treeItem.dataset.itemId;
        if (!itemId) return;
        
        // Handle delete button click
        if (target.dataset.action === 'delete') {
            e.stopPropagation();
            deleteItem(itemId);
            return;
        }
        
        // Handle item selection (ignore clicks on action buttons)
        if (!target.closest('.tree-item-actions')) {
            const item = findItemById(bomBuilder.root, itemId);
            if (item) {
                selectItem(item);
            }
        }
    };
    
    treeContainer.addEventListener('click', treeClickHandler);
}

function selectItem(item) {
    selectedItem = item;
    renderTree();
    renderPartDetails(item);
}

function renderPartDetails(item) {
    const detailsContainer = document.getElementById('partDetails');
    if (!detailsContainer) return;
    
    if (!item) {
        detailsContainer.innerHTML = '<div class="empty-state"><p>Select a part or assembly to edit details.</p></div>';
        return;
    }
    
    if (item.type === 'assembly') {
        if (!bomBuilder) {
            detailsContainer.innerHTML = '<div class="empty-state"><p>BOMBuilder not initialized.</p></div>';
            return;
        }
        const totalCost = bomBuilder.calculateTotalCost(item);
        const escapedName = escapeHTML(item.name || '');
        detailsContainer.innerHTML = `
            <div class="form-group">
                <label>Assembly Name</label>
                <input type="text" id="edit-name" value="${escapedName}" />
            </div>
            <div class="cost-display">
                Total Cost: $${totalCost.toFixed(2)}
            </div>
            <div style="margin-top: 20px;">
                <button class="btn-primary" onclick="saveItemDetails()">Save Changes</button>
            </div>
        `;
    } else {
        const escapedName = escapeHTML(item.name || '');
        const escapedSku = escapeHTML(item.sku || '');
        const escapedSupplier = escapeHTML(item.supplier || '');
        const escapedDescription = escapeHTML(item.description || '');
        const escapedCompatibility = escapeHTML((item.compatibility || []).join(', '));
        const quantity = item.quantity || 1;
        const cost = item.cost || 0;
        
        detailsContainer.innerHTML = `
            <div class="form-group">
                <label>Part Name *</label>
                <input type="text" id="edit-name" value="${escapedName}" />
            </div>
            <div class="form-group">
                <label>SKU</label>
                <input type="text" id="edit-sku" value="${escapedSku}" />
            </div>
            <div class="form-group">
                <label>Quantity *</label>
                <input type="number" id="edit-quantity" value="${quantity}" min="1" />
            </div>
            <div class="form-group">
                <label>Unit Cost ($) *</label>
                <input type="number" id="edit-cost" value="${cost}" min="0" step="0.01" />
            </div>
            <div class="form-group">
                <label>Supplier</label>
                <input type="text" id="edit-supplier" value="${escapedSupplier}" placeholder="e.g., DigiKey, Mouser" />
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="edit-description" rows="3"></textarea>
            </div>
            <div class="form-group">
                <label>Compatibility Rules</label>
                <input type="text" id="edit-compatibility" value="${escapedCompatibility}" placeholder="e.g., M3 threads, 5mm hole" />
            </div>
            <div class="cost-display">
                Total: $${(cost * quantity).toFixed(2)}
            </div>
            <div style="margin-top: 20px;">
                <button class="btn-primary" onclick="saveItemDetails()">Save Changes</button>
            </div>
        `;
        // Set textarea value using textContent for security (after innerHTML creates the element)
        const descriptionTextarea = detailsContainer.querySelector('#edit-description');
        if (descriptionTextarea) {
            descriptionTextarea.textContent = escapedDescription;
        }
    }
}

function saveItemDetails() {
    if (!selectedItem) return;
    
    const nameInput = document.getElementById('edit-name');
    if (!nameInput) return;
    
    if (selectedItem.type === 'assembly') {
        selectedItem.name = nameInput.value.trim() || 'Assembly';
    } else {
        selectedItem.name = nameInput.value.trim() || 'Part';
        
        const skuInput = document.getElementById('edit-sku');
        const quantityInput = document.getElementById('edit-quantity');
        const costInput = document.getElementById('edit-cost');
        const supplierInput = document.getElementById('edit-supplier');
        const descriptionInput = document.getElementById('edit-description');
        const compatibilityInput = document.getElementById('edit-compatibility');
        
        if (skuInput) selectedItem.sku = skuInput.value.trim();
        if (quantityInput) {
            const quantity = parseInt(quantityInput.value, 10);
            selectedItem.quantity = (isNaN(quantity) || quantity < 1) ? 1 : quantity;
        }
        if (costInput) {
            const cost = parseFloat(costInput.value);
            selectedItem.cost = (isNaN(cost) || cost < 0) ? 0 : cost;
        }
        if (supplierInput) selectedItem.supplier = supplierInput.value.trim();
        if (descriptionInput) selectedItem.description = descriptionInput.value.trim();
        
        if (compatibilityInput) {
            const compatText = compatibilityInput.value.trim();
            selectedItem.compatibility = compatText ? compatText.split(',').map(s => s.trim()).filter(s => s) : [];
        }
    }
    
    renderTree();
    renderPartDetails(selectedItem);
    debouncedValidateBOM();
}

function deleteItem(itemId) {
    if (!bomBuilder || !bomBuilder.root) {
        console.error('Cannot delete: BOMBuilder not initialized or no root');
        return;
    }
    const item = findItemById(bomBuilder.root, itemId);
    if (item && confirm(`Delete ${item.name || 'item'}?`)) {
        bomBuilder.deleteItem(item);
        if (selectedItem === item) {
            selectedItem = null;
            renderPartDetails(null);
        }
        renderTree();
        debouncedValidateBOM();
    }
}

function findItemById(item, id) {
    if (!item || !id) return null;
    if (item.id === id) return item;
    if (item.children && Array.isArray(item.children)) {
        for (const child of item.children) {
            const found = findItemById(child, id);
            if (found) return found;
        }
    }
    return null;
}

// Removed updateCostDisplay() - was non-functional (only logged to console)
// Cost is already displayed in the tree items and part details panel

function validateBOM() {
    const errors = [];
    const errorContainer = document.getElementById('validationErrors');
    if (!errorContainer) return;
    
    if (!bomBuilder || !bomBuilder.root) {
        errorContainer.classList.add('hidden');
        return;
    }
    
    if (typeof bomBuilder.getAllParts !== 'function' || typeof bomBuilder.getAllAssemblies !== 'function') {
        console.error('BOMBuilder methods not available');
        return;
    }
    
    const parts = bomBuilder.getAllParts();
    
    for (const part of parts) {
        if (!part) continue;
        if (!part.name || part.name.trim() === '') {
            errors.push(`Part missing required field: name`);
        }
        if (!part.quantity || part.quantity < 1) {
            const partName = part.name || 'Unnamed';
            errors.push(`Part "${escapeHTML(partName)}" has invalid quantity (must be >= 1)`);
        }
        if (part.cost === undefined || part.cost < 0 || isNaN(part.cost)) {
            const partName = part.name || 'Unnamed';
            errors.push(`Part "${escapeHTML(partName)}" has invalid cost (must be >= 0)`);
        }
    }
    
    const assemblies = bomBuilder.getAllAssemblies();
    for (const assembly of assemblies) {
        if (!assembly) continue;
        if (!assembly.name || assembly.name.trim() === '') {
            errors.push(`Assembly missing required field: name`);
        }
    }
    
    if (errors.length > 0) {
        errorContainer.classList.remove('hidden');
        const escapedErrors = errors.map(e => `<li>${escapeHTML(e)}</li>`).join('');
        errorContainer.innerHTML = `
            <strong>Validation Errors:</strong>
            <ul>
                ${escapedErrors}
            </ul>
        `;
    } else {
        errorContainer.classList.add('hidden');
    }
}

// Debounced version of validateBOM (300ms delay)
const debouncedValidateBOM = debounce(validateBOM, 300);

function saveBOM() {
    if (!bomBuilder || !bomBuilder.root) {
        alert('No BOM to save. Add some parts first!');
        return;
    }
    
    try {
        const xmlContent = bomBuilder.toXML();
        const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<bom>\n' + xmlContent + '</bom>';
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bomforge.bom.xml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error saving BOM:', error);
        alert('Error saving BOM: ' + error.message);
    }
}

function handleFileLoad(event) {
    if (!bomBuilder) {
        alert('BOMBuilder not initialized. Please refresh the page.');
        return;
    }
    
    const file = event.target && event.target.files && event.target.files[0];
    if (!file) return;
    
    if (!file.name || (!file.name.toLowerCase().endsWith('.xml') && !file.name.toLowerCase().endsWith('.bom.xml'))) {
        alert('Please select a valid XML file (.xml or .bom.xml)');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            if (!e || !e.target || !e.target.result) {
                throw new Error('Failed to read file');
            }
            bomBuilder.fromXML(e.target.result);
            renderTree();
            selectedItem = null;
            renderPartDetails(null);
            validateBOM(); // Load validation doesn't need debouncing
            // Reset file input to allow reloading the same file
            if (event.target) {
                event.target.value = '';
            }
            alert('BOM loaded successfully!');
        } catch (error) {
            console.error('Error loading BOM:', error);
            alert('Error loading BOM: ' + (error.message || 'Unknown error'));
            // Reset file input even on error
            if (event.target) {
                event.target.value = '';
            }
        }
    };
    reader.onerror = function() {
        alert('Error reading file');
        // Reset file input on error
        if (event.target) {
            event.target.value = '';
        }
    };
    reader.onabort = function() {
        console.warn('File read aborted');
        // Reset file input on abort
        if (event.target) {
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

function loadSample() {
    if (!bomBuilder) {
        alert('BOMBuilder not initialized. Please refresh the page.');
        return;
    }
    
    const sampleXML = `<?xml version="1.0" encoding="UTF-8"?>
<bom>
  <assembly>
    <name>3D Printer Hotend</name>
    <part>
      <name>Heater Cartridge 40W</name>
      <sku>E3D-HT-40W</sku>
      <quantity>1</quantity>
      <cost>12.99</cost>
      <supplier>E3D Online</supplier>
      <description>40W 24V heater cartridge</description>
    </part>
    <part>
      <name>Thermistor 100K</name>
      <sku>E3D-TH-100K</sku>
      <quantity>1</quantity>
      <cost>3.50</cost>
      <supplier>E3D Online</supplier>
      <description>100K NTC thermistor</description>
    </part>
    <assembly>
      <name>Nozzle Assembly</name>
      <part>
        <name>Nozzle 0.4mm</name>
        <sku>E3D-NZ-04</sku>
        <quantity>1</quantity>
        <cost>8.99</cost>
        <supplier>E3D Online</supplier>
        <compatibility>
          <rule>M6 threads</rule>
          <rule>Compatible with V6 hotend</rule>
        </compatibility>
      </part>
      <part>
        <name>Heatbreak</name>
        <sku>E3D-HB-V6</sku>
        <quantity>1</quantity>
        <cost>15.99</cost>
        <supplier>E3D Online</supplier>
      </part>
    </assembly>
  </assembly>
</bom>`;
    
    try {
        bomBuilder.fromXML(sampleXML);
        renderTree();
        selectedItem = null;
        renderPartDetails(null);
        validateBOM(); // Sample load validation doesn't need debouncing
        alert('Sample BOM loaded!');
    } catch (error) {
        console.error('Error loading sample:', error);
        alert('Error loading sample: ' + (error.message || 'Unknown error'));
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
    const tabContent = document.getElementById(tabName);
    if (tabBtn) tabBtn.classList.add('active');
    if (tabContent) tabContent.classList.add('active');
}

function setupTooltips() {
    // Prevent duplicate setup
    if (tooltipsSetup) return;
    
    const tooltip = document.getElementById('export-tooltip');
    if (!tooltip) return;
    
    const infoIcons = document.querySelectorAll('.info-icon[data-tooltip="export-tooltip"]');
    if (infoIcons.length === 0) return;
    
    let currentIcon = null;
    
    function showTooltip(icon) {
        if (!tooltip || !icon) return;
        
        try {
            currentIcon = icon;
            tooltip.classList.remove('hidden');
            
            // Use requestAnimationFrame to ensure tooltip is rendered before calculating position
            requestAnimationFrame(() => {
                try {
                    // Check if elements still exist
                    if (!tooltip || !icon) return;
                    
                    // Position tooltip relative to icon
                    const rect = icon.getBoundingClientRect();
                    const tooltipRect = tooltip.getBoundingClientRect();
                    
                    // Validate rects are valid
                    if (!rect || !tooltipRect || tooltipRect.width === 0 || tooltipRect.height === 0) {
                        // Fallback positioning
                        tooltip.style.top = '50%';
                        tooltip.style.left = '50%';
                        tooltip.style.transform = 'translate(-50%, -50%)';
                        return;
                    }
                    
                    // Try to position below the icon, or above if not enough space
                    let top = rect.bottom + 10;
                    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                    
                    // Adjust if tooltip would go off screen
                    if (top + tooltipRect.height > window.innerHeight) {
                        top = rect.top - tooltipRect.height - 10;
                    }
                    if (left < 10) {
                        left = 10;
                    }
                    if (left + tooltipRect.width > window.innerWidth - 10) {
                        left = window.innerWidth - tooltipRect.width - 10;
                    }
                    
                    tooltip.style.top = top + 'px';
                    tooltip.style.left = left + 'px';
                    tooltip.style.transform = 'none';
                } catch (error) {
                    console.warn('Error positioning tooltip:', error);
                    // Fallback: center the tooltip
                    tooltip.style.top = '50%';
                    tooltip.style.left = '50%';
                    tooltip.style.transform = 'translate(-50%, -50%)';
                }
            });
        } catch (error) {
            console.warn('Error showing tooltip:', error);
        }
    }
    
    function hideTooltip() {
        try {
            if (tooltip) {
                tooltip.classList.add('hidden');
            }
            currentIcon = null;
        } catch (error) {
            console.warn('Error hiding tooltip:', error);
        }
    }
    
    // Set up icon event listeners
    infoIcons.forEach(icon => {
        icon.addEventListener('mouseenter', () => showTooltip(icon));
        icon.addEventListener('mouseleave', () => hideTooltip());
        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentIcon === icon && !tooltip.classList.contains('hidden')) {
                hideTooltip();
            } else {
                showTooltip(icon);
            }
        });
    });
    
    // Close tooltip when clicking outside - only add once
    if (!tooltipHandlers.documentClick) {
        tooltipHandlers.documentClick = (e) => {
            if (currentIcon && !currentIcon.contains(e.target) && tooltip && !tooltip.contains(e.target)) {
                hideTooltip();
            }
        };
        document.addEventListener('click', tooltipHandlers.documentClick);
    }
    
    // Close tooltip on escape key - only add once
    if (!tooltipHandlers.documentKeydown) {
        tooltipHandlers.documentKeydown = (e) => {
            if (e.key === 'Escape' && tooltip && !tooltip.classList.contains('hidden')) {
                hideTooltip();
            }
        };
        document.addEventListener('keydown', tooltipHandlers.documentKeydown);
    }
    
    tooltipsSetup = true;
}

window.saveItemDetails = saveItemDetails;
window.deleteItem = deleteItem;
window.switchTab = switchTab;

