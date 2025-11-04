let bomBuilder;
let selectedItem = null;
let darkMode = false;

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
        validateBOM();
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
    exportBtn.addEventListener('click', () => {
        if (typeof exportAll === 'function') {
            exportAll();
        } else {
            alert('Export functionality loading...');
        }
    });
    fileInput.addEventListener('change', handleFileLoad);
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            if (tab) {
                switchTab(tab);
            }
        });
    });
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
        updateCostDisplay();
        validateBOM();
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
    updateCostDisplay();
    validateBOM();
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
    
    if (!bomBuilder || !bomBuilder.root) {
        treeContainer.innerHTML = '<div class="empty-state"><p>No parts yet. Add an assembly or part to get started.</p></div>';
        return;
    }
    
    const hasChildren = bomBuilder.root.children && Array.isArray(bomBuilder.root.children) && bomBuilder.root.children.length > 0;
    
    if (!hasChildren) {
        treeContainer.innerHTML = '<div class="empty-state"><p>No parts yet. Add an assembly or part to get started.</p></div>';
        return;
    }
    
    treeContainer.innerHTML = '';
    
    function renderItem(item) {
        if (!item) return null;
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'tree-item';
        if (selectedItem === item) {
            itemDiv.classList.add('selected');
        }
        
        itemDiv.dataset.itemId = item.id;
        
        const icon = item.type === 'assembly' ? '📦' : '🔩';
        const cost = item.type === 'part' 
            ? `$${((item.cost || 0) * (item.quantity || 1)).toFixed(2)}` 
            : `$${(bomBuilder ? bomBuilder.calculateTotalCost(item) : 0).toFixed(2)}`;
        const escapedName = escapeHTML(item.name || 'Unnamed');
        const escapedId = escapeHTML(item.id);
        
        itemDiv.innerHTML = `
            <div class="tree-item-header">
                <span class="tree-item-icon">${icon}</span>
                <span class="tree-item-name">${escapedName}</span>
                <span style="color: var(--text-secondary); font-size: 0.9em;">${cost}</span>
                <div class="tree-item-actions">
                    <button onclick="event.stopPropagation(); deleteItem('${escapedId}')">Delete</button>
                </div>
            </div>
        `;
        
        itemDiv.addEventListener('click', (e) => {
            if (!e.target.closest('.tree-item-actions')) {
                selectItem(item);
            }
        });
        
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
                treeContainer.appendChild(childElement);
            }
        }
    }
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
                <textarea id="edit-description" rows="3">${escapedDescription}</textarea>
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
    updateCostDisplay();
    validateBOM();
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
        updateCostDisplay();
        validateBOM();
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

function updateCostDisplay() {
    if (!bomBuilder || !bomBuilder.root) return;
    const total = bomBuilder.calculateTotalCost();
    console.log('Total BOM cost:', total);
}

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
            updateCostDisplay();
            validateBOM();
            alert('BOM loaded successfully!');
        } catch (error) {
            console.error('Error loading BOM:', error);
            alert('Error loading BOM: ' + (error.message || 'Unknown error'));
        }
    };
    reader.onerror = function() {
        alert('Error reading file');
    };
    reader.onabort = function() {
        console.warn('File read aborted');
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
        updateCostDisplay();
        validateBOM();
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

window.saveItemDetails = saveItemDetails;
window.deleteItem = deleteItem;
window.switchTab = switchTab;

