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
            // Validate inputs
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
            
            // Helper function for native XSLTProcessor fallback
            function useNativeXSLTProcessor() {
                try {
                    fetch(xsltUrl)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`Failed to load XSLT: ${response.status} ${response.statusText}`);
                            }
                            return response.text();
                        })
                        .then(xsltText => {
                            try {
                                // Parse XSLT
                                const parser = new DOMParser();
                                if (!parser) {
                                    throw new Error('DOMParser not available');
                                }
                                
                                const xsltDoc = parser.parseFromString(xsltText, 'text/xml');
                                
                                // Check for parsing errors
                                const parseError = xsltDoc.querySelector('parsererror');
                                if (parseError) {
                                    throw new Error('Invalid XSLT: ' + parseError.textContent);
                                }
                                
                                // Use browser's native XSLTProcessor (XSLT 1.0)
                                // Note: This only supports XSLT 1.0, not XSLT 3.0 features
                                if (typeof XSLTProcessor === 'undefined') {
                                    throw new Error('XSLTProcessor not available in this browser');
                                }
                                
                                const processor = new XSLTProcessor();
                                processor.importStylesheet(xsltDoc);
                                
                                const result = processor.transformToDocument(sourceDoc);
                                if (!result) {
                                    throw new Error('XSLT transformation returned null result');
                                }
                                
                                // Convert result document to string
                                const serializer = new XMLSerializer();
                                if (!serializer) {
                                    throw new Error('XMLSerializer not available');
                                }
                                
                                const htmlString = serializer.serializeToString(result);
                                if (!htmlString) {
                                    throw new Error('Serialization returned empty string');
                                }
                                
                                resolve(htmlString);
                            } catch (parseError) {
                                console.error('Error parsing or processing XSLT:', parseError);
                                reject(new Error('XSLT processing failed: ' + (parseError.message || 'Unknown error')));
                            }
                        })
                        .catch(fetchError => {
                            console.error('Error fetching XSLT file:', fetchError);
                            reject(new Error('Failed to load XSLT file: ' + (fetchError.message || 'Unknown error')));
                        });
                } catch (error) {
                    console.error('Error in useNativeXSLTProcessor:', error);
                    reject(new Error('XSLT transformation setup failed: ' + (error.message || 'Unknown error')));
                }
            }
            
            // First try SEF file (pre-compiled)
            fetch(sefUrl)
                .then(response => {
                    if (response.ok) {
                        return response.json().catch(jsonError => {
                            throw new Error('Failed to parse SEF JSON: ' + (jsonError.message || 'Invalid JSON'));
                        });
                    }
                    throw new Error('SEF file not found (status: ' + response.status + '), trying native XSLTProcessor');
                })
                .then(sefData => {
                    try {
                        if (!sefData) {
                            throw new Error('SEF data is empty');
                        }
                        
                        // Use compiled SEF with SaxonJS
                        const options = {
                            stylesheetInternal: sefData,
                            sourceNode: sourceDoc,
                            destination: 'serialized'
                        };
                        
                        const transformPromise = saxonJS.transform(options, 'async');
                        
                        if (!transformPromise) {
                            throw new Error('SaxonJS.transform returned null');
                        }
                        
                        if (typeof transformPromise.then !== 'function') {
                            throw new Error('SaxonJS.transform did not return a promise');
                        }
                        
                        return transformPromise;
                    } catch (transformError) {
                        throw new Error('SaxonJS transformation setup failed: ' + (transformError.message || 'Unknown error'));
                    }
                })
                .then(output => {
                    try {
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
                    } catch (outputError) {
                        reject(new Error('Error processing SaxonJS output: ' + (outputError.message || 'Unknown error')));
                    }
                })
                .catch(sefError => {
                    console.warn('SEF file not available, using browser native XSLTProcessor:', sefError.message || sefError);
                    // Fallback to browser's native XSLTProcessor (XSLT 1.0)
                    useNativeXSLTProcessor();
                });
        } catch (error) {
            console.error('Error in transformWithSaxonJS:', error);
            reject(new Error('XSLT transformation failed: ' + (error.message || 'Unknown error')));
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

