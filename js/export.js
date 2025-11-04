async function exportAll() {
    if (typeof bomBuilder === 'undefined' || !bomBuilder || !bomBuilder.root) {
        alert('No BOM to export. Add some parts first!');
        return;
    }
    
    if (typeof JSZip === 'undefined') {
        alert('JSZip library not loaded. Please refresh the page.');
        return;
    }
    
    try {
        const zip = new JSZip();
        
        const bomXMLContent = bomBuilder.toXML();
        const bomXML = '<?xml version="1.0" encoding="UTF-8"?>\n<bom>\n' + bomXMLContent + '</bom>';
        zip.file('bom.xml', bomXML);
        
        const outputs = await generateXSLTOutputs(bomXML);
        
        if (outputs && outputs.shoppingList) {
            zip.file('shopping-list.html', outputs.shoppingList);
        }
        if (outputs && outputs.costSummary) {
            zip.file('cost-summary.html', outputs.costSummary);
        }
        if (outputs && outputs.assemblyGuide) {
            zip.file('assembly-guide.html', outputs.assemblyGuide);
        }
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bomforge-export.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        displayOutputs(outputs);
        
    } catch (error) {
        console.error('Export error:', error);
        alert('Error during export: ' + (error.message || 'Unknown error'));
    }
}

async function generateXSLTOutputs(bomXML) {
    const outputs = {
        shoppingList: '',
        costSummary: '',
        assemblyGuide: ''
    };
    
    if (!bomXML) {
        console.error('No BOM XML provided');
        return outputs;
    }
    
    try {
        const parser = new DOMParser();
        if (!parser) {
            throw new Error('DOMParser not available');
        }
        
        const bomDoc = parser.parseFromString(bomXML, 'text/xml');
        
        const parseError = bomDoc.querySelector('parsererror');
        if (parseError) {
            throw new Error('Invalid XML: ' + parseError.textContent);
        }
        
        // Check for SaxonJS (browser runtime version)
        const saxonJS = window.SaxonJS;
        if (typeof saxonJS === 'undefined' || !saxonJS || !saxonJS.transform) {
            throw new Error('SaxonJS not loaded. Please check that SaxonJS2.rt.js is loaded correctly.');
        }
        
        // Use stylesheetLocation - SaxonJS will fetch and compile XSLT automatically
        outputs.shoppingList = await transformWithSaxonJS(bomDoc, 'xslt/shopping-list.xslt', saxonJS);
        outputs.costSummary = await transformWithSaxonJS(bomDoc, 'xslt/cost-summary.xslt', saxonJS);
        outputs.assemblyGuide = await transformWithSaxonJS(bomDoc, 'xslt/assembly-guide.xslt', saxonJS);
        
    } catch (error) {
        console.error('XSLT transformation error:', error);
        const errorMsg = error.message || 'Unknown error';
        outputs.shoppingList = '<html><body><p>Error generating shopping list: ' + errorMsg + '</p></body></html>';
        outputs.costSummary = '<html><body><p>Error generating cost summary: ' + errorMsg + '</p></body></html>';
        outputs.assemblyGuide = '<html><body><p>Error generating assembly guide: ' + errorMsg + '</p></body></html>';
    }
    
    return outputs;
}

async function transformWithSaxonJS(sourceDoc, xsltUrl, saxonJSInstance) {
    return new Promise((resolve, reject) => {
        try {
            if (!sourceDoc || !xsltUrl) {
                reject(new Error('Missing source document or XSLT URL'));
                return;
            }
            
            // Use provided instance or try to find it
            const saxonJS = saxonJSInstance || window.SaxonJS;
            
            if (typeof saxonJS === 'undefined' || !saxonJS || !saxonJS.transform) {
                reject(new Error('SaxonJS not available. Please check your internet connection.'));
                return;
            }
            
            // SaxonJS browser runtime requires SEF (compiled JSON) files, not raw XSLT
            // Try to load as SEF first, fallback to browser's native XSLTProcessor
            const sefUrl = xsltUrl.replace('.xslt', '.sef.json').replace('.xsl', '.sef.json');
            
            // First try SEF file (pre-compiled)
            fetch(sefUrl)
                .then(response => {
                    if (response.ok) {
                        return response.json();
                    }
                    throw new Error('SEF file not found, trying native XSLTProcessor');
                })
                .then(sefData => {
                    // Use compiled SEF with SaxonJS
                    const options = {
                        stylesheetInternal: sefData,
                        sourceNode: sourceDoc,
                        destination: 'serialized'
                    };
                    
                    const transformPromise = saxonJS.transform(options, 'async');
                    
                    if (!transformPromise || typeof transformPromise.then !== 'function') {
                        throw new Error('SaxonJS.transform did not return a promise');
                    }
                    
                    return transformPromise;
                })
                .then(output => {
                    if (!output) {
                        throw new Error('SaxonJS returned empty output');
                    }
                    if (output.principalResult) {
                        resolve(output.principalResult);
                    } else if (typeof output === 'string') {
                        resolve(output);
                    } else {
                        throw new Error('Unexpected output format from SaxonJS: ' + typeof output);
                    }
                })
                .catch(sefError => {
                    console.warn('SEF file not available, using browser native XSLTProcessor:', sefError);
                    // Fallback to browser's native XSLTProcessor (XSLT 1.0)
                    useNativeXSLTProcessor();
                });
            
            function useNativeXSLTProcessor() {
                fetch(xsltUrl)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Failed to load XSLT: ${response.statusText}`);
                        }
                        return response.text();
                    })
                    .then(xsltText => {
                        // Parse XSLT
                        const parser = new DOMParser();
                        const xsltDoc = parser.parseFromString(xsltText, 'text/xml');
                        
                        // Check for parsing errors
                        const parseError = xsltDoc.querySelector('parsererror');
                        if (parseError) {
                            throw new Error('Invalid XSLT: ' + parseError.textContent);
                        }
                        
                        // Use browser's native XSLTProcessor (XSLT 1.0)
                        // Note: This only supports XSLT 1.0, not XSLT 3.0 features
                        const processor = new XSLTProcessor();
                        processor.importStylesheet(xsltDoc);
                        
                        const result = processor.transformToDocument(sourceDoc);
                        
                        // Convert result document to string
                        const serializer = new XMLSerializer();
                        const htmlString = serializer.serializeToString(result);
                        
                        resolve(htmlString);
                    })
                    .catch(error => {
                        console.error('Error with native XSLTProcessor:', error);
                        reject(new Error('XSLT transformation failed: ' + (error.message || 'Unknown error')));
                    });
            }
        } catch (error) {
            reject(error);
        }
    });
}

function displayOutputs(outputs) {
    if (!outputs) {
        console.error('No outputs provided');
        return;
    }
    
    const shoppingListDiv = document.getElementById('shopping-list');
    const costSummaryDiv = document.getElementById('cost-summary');
    const assemblyGuideDiv = document.getElementById('assembly-guide');
    
    // Note: innerHTML is safe here because outputs come from XSLT transformations,
    // which generate HTML from trusted XML data structure
    if (shoppingListDiv) {
        shoppingListDiv.innerHTML = outputs.shoppingList || '<p class="empty-state">No output generated</p>';
    }
    
    if (costSummaryDiv) {
        costSummaryDiv.innerHTML = outputs.costSummary || '<p class="empty-state">No output generated</p>';
    }
    
    if (assemblyGuideDiv) {
        assemblyGuideDiv.innerHTML = outputs.assemblyGuide || '<p class="empty-state">No output generated</p>';
    }
    
    if (typeof switchTab === 'function') {
        switchTab('shopping-list');
    }
}

