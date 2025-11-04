class BOMBuilder {
    constructor() {
        this.root = null;
        this.currentId = 0;
    }

    createAssembly(name, parent = null) {
        const assembly = {
            id: `assembly-${this.currentId++}`,
            type: 'assembly',
            name: name || 'New Assembly',
            children: [],
            parent: parent
        };
        
        if (parent) {
            if (!parent.children) {
                parent.children = [];
            }
            parent.children.push(assembly);
        } else {
            this.root = assembly;
        }
        
        return assembly;
    }

    createPart(data, parent = null) {
        if (!data) {
            data = {};
        }
        const part = {
            id: `part-${this.currentId++}`,
            type: 'part',
            name: data.name || 'New Part',
            sku: data.sku || '',
            quantity: data.quantity || 1,
            cost: data.cost || 0,
            supplier: data.supplier || '',
            description: data.description || '',
            compatibility: data.compatibility || [],
            parent: parent
        };
        
        if (parent) {
            if (!parent.children) {
                parent.children = [];
            }
            parent.children.push(part);
        } else {
            if (!this.root) {
                this.root = this.createAssembly('Root Assembly');
            }
            if (!this.root.children) {
                this.root.children = [];
            }
            this.root.children.push(part);
        }
        
        return part;
    }

    deleteItem(item) {
        if (!item) return;
        
        if (item.parent && item.parent.children) {
            const index = item.parent.children.indexOf(item);
            if (index > -1) {
                item.parent.children.splice(index, 1);
            }
        } else if (item === this.root) {
            this.root = null;
        }
    }

    moveItem(item, newParent) {
        if (!item) return;
        
        if (item.parent && item.parent.children) {
            const index = item.parent.children.indexOf(item);
            if (index > -1) {
                item.parent.children.splice(index, 1);
            }
        }
        
        item.parent = newParent;
        if (newParent) {
            if (!newParent.children) {
                newParent.children = [];
            }
            newParent.children.push(item);
        }
    }

    calculateTotalCost(item = null) {
        const target = item || this.root;
        if (!target) return 0;
        
        if (target.type === 'part') {
            return (target.cost || 0) * (target.quantity || 1);
        }
        
        let total = 0;
        if (target.children) {
            for (const child of target.children) {
                total += this.calculateTotalCost(child);
            }
        }
        
        return total;
    }

    toXML() {
        if (!this.root) {
            return '<?xml version="1.0" encoding="UTF-8"?><bom></bom>';
        }
        
        return this._buildXML(this.root);
    }

    _buildXML(item, indent = '') {
        if (item.type === 'part') {
            let xml = `${indent}<part>\n`;
            xml += `${indent}  <name>${this._escapeXML(item.name)}</name>\n`;
            if (item.sku) xml += `${indent}  <sku>${this._escapeXML(item.sku)}</sku>\n`;
            xml += `${indent}  <quantity>${item.quantity || 1}</quantity>\n`;
            xml += `${indent}  <cost>${item.cost || 0}</cost>\n`;
            if (item.supplier) {
                xml += `${indent}  <supplier>${this._escapeXML(item.supplier)}</supplier>\n`;
            }
            if (item.description) {
                xml += `${indent}  <description>${this._escapeXML(item.description)}</description>\n`;
            }
            if (item.compatibility && item.compatibility.length > 0) {
                xml += `${indent}  <compatibility>\n`;
                for (const comp of item.compatibility) {
                    xml += `${indent}    <rule>${this._escapeXML(comp)}</rule>\n`;
                }
                xml += `${indent}  </compatibility>\n`;
            }
            xml += `${indent}</part>\n`;
            return xml;
        } else {
            let xml = `${indent}<assembly>\n`;
            xml += `${indent}  <name>${this._escapeXML(item.name)}</name>\n`;
            if (item.children && item.children.length > 0) {
                for (const child of item.children) {
                    xml += this._buildXML(child, indent + '  ');
                }
            }
            xml += `${indent}</assembly>\n`;
            return xml;
        }
    }

    _escapeXML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    fromXML(xmlString) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(xmlString, 'text/xml');
            
            const errors = doc.querySelectorAll('parsererror');
            if (errors.length > 0) {
                throw new Error('Invalid XML: ' + errors[0].textContent);
            }
            
            const bomElement = doc.querySelector('bom');
            if (!bomElement) {
                throw new Error('No <bom> root element found');
            }
            
            this.root = null;
            this.currentId = 0;
            
            const assemblies = bomElement.querySelectorAll('assembly');
            const parts = bomElement.querySelectorAll('part');
            
            if (assemblies.length > 0 || parts.length > 0) {
                if (assemblies.length === 1 && parts.length === 0) {
                    this.root = this._parseAssembly(assemblies[0], null);
                } else {
                    this.root = this.createAssembly('Root Assembly');
                    for (const assembly of assemblies) {
                        const parsed = this._parseAssembly(assembly, this.root);
                        this.root.children.push(parsed);
                    }
                    for (const part of parts) {
                        this.root.children.push(this._parsePart(part, this.root));
                    }
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error parsing XML:', error);
            throw error;
        }
    }

    _parseAssembly(element, parent) {
        if (!element) return null;
        
        const name = element.querySelector('name')?.textContent || 'Assembly';
        const assembly = {
            id: `assembly-${this.currentId++}`,
            type: 'assembly',
            name: name,
            children: [],
            parent: parent
        };
        
        const childAssemblies = element.querySelectorAll(':scope > assembly');
        const childParts = element.querySelectorAll(':scope > part');
        
        for (const childAssembly of childAssemblies) {
            const parsed = this._parseAssembly(childAssembly, assembly);
            if (parsed) {
                assembly.children.push(parsed);
            }
        }
        
        for (const childPart of childParts) {
            const parsed = this._parsePart(childPart, assembly);
            if (parsed) {
                assembly.children.push(parsed);
            }
        }
        
        return assembly;
    }

    _parsePart(element, parent) {
        if (!element) return null;
        
        const name = element.querySelector('name')?.textContent || 'Part';
        const sku = element.querySelector('sku')?.textContent || '';
        const quantityText = element.querySelector('quantity')?.textContent || '1';
        const costText = element.querySelector('cost')?.textContent || '0';
        const quantity = parseInt(quantityText, 10) || 1;
        const cost = parseFloat(costText) || 0;
        const supplier = element.querySelector('supplier')?.textContent || '';
        const description = element.querySelector('description')?.textContent || '';
        
        const compatibility = [];
        const compRules = element.querySelectorAll('compatibility > rule');
        for (const rule of compRules) {
            if (rule && rule.textContent) {
                compatibility.push(rule.textContent);
            }
        }
        
        return {
            id: `part-${this.currentId++}`,
            type: 'part',
            name: name,
            sku: sku,
            quantity: quantity,
            cost: cost,
            supplier: supplier,
            description: description,
            compatibility: compatibility,
            parent: parent
        };
    }

    getAllParts() {
        const parts = [];
        this._collectParts(this.root, parts);
        return parts;
    }

    _collectParts(item, parts) {
        if (!item) return;
        
        if (item.type === 'part') {
            parts.push(item);
        }
        
        if (item.children) {
            for (const child of item.children) {
                this._collectParts(child, parts);
            }
        }
    }

    getAllAssemblies() {
        const assemblies = [];
        this._collectAssemblies(this.root, assemblies);
        return assemblies;
    }

    _collectAssemblies(item, assemblies) {
        if (!item) return;
        
        if (item.type === 'assembly') {
            assemblies.push(item);
        }
        
        if (item.children) {
            for (const child of item.children) {
                this._collectAssemblies(child, assemblies);
            }
        }
    }
}

