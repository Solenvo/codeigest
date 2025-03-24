/**
 * Specialized functions for Jupyter Notebook (.ipynb) processing
 */

const NotebookProcessor = {
    /**
     * Format a Jupyter notebook into text representation
     * @param {Object} notebook - Parsed notebook JSON
     * @param {boolean} includeOutputs - Whether to include cell outputs
     * @param {boolean} includeImages - Whether to include image data
     * @return {string} Formatted notebook content
     */
    formatNotebookContent(notebook, includeOutputs, includeImages) {
      try {
        let content = '';
        
        // Include notebook metadata if available
        if (notebook.metadata) {
          content += '# Notebook Metadata\n';
          
          if (notebook.metadata.kernelspec && notebook.metadata.kernelspec.display_name) {
            content += `# Kernel: ${notebook.metadata.kernelspec.display_name}\n`;
          }
          
          if (notebook.metadata.language_info && notebook.metadata.language_info.name) {
            content += `# Language: ${notebook.metadata.language_info.name}\n`;
          }
          
          content += '\n';
        }
        
        if (notebook.cells) {
          notebook.cells.forEach((cell, index) => {
            // Add cell type as comment
            content += `# Cell [${index + 1}] - ${cell.cell_type.toUpperCase()}\n`;
            
            if (cell.cell_type === 'code') {
              // Add source code
              if (cell.source) {
                const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
                content += source;
                if (!source.endsWith('\n')) content += '\n';
              }
              
              // Add outputs if enabled
              if (includeOutputs && cell.outputs && cell.outputs.length > 0) {
                content += '\n# Output:\n';
                
                cell.outputs.forEach(output => {
                  if (output.output_type === 'stream') {
                    const text = Array.isArray(output.text) ? output.text.join('') : output.text;
                    content += text;
                    if (!text.endsWith('\n')) content += '\n';
                  } else if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
                    // Handle text output
                    if (output.data && output.data['text/plain']) {
                      const text = Array.isArray(output.data['text/plain']) 
                        ? output.data['text/plain'].join('') 
                        : output.data['text/plain'];
                      content += text;
                      if (!text.endsWith('\n')) content += '\n';
                    }
                    
                    // Handle image data
                    if (includeImages && output.data) {
                      // Skip image data if not including images
                      if (output.data['image/png']) {
                        content += '\n# [Image data: PNG]\n';
                      } else if (output.data['image/jpeg']) {
                        content += '\n# [Image data: JPEG]\n';
                      } else if (output.data['image/svg+xml']) {
                        content += '\n# [Image data: SVG]\n';
                      }
                    }
                  } else if (output.output_type === 'error') {
                    content += `# Error: ${output.ename}\n`;
                    content += `# ${output.evalue}\n`;
                    
                    if (output.traceback) {
                      content += '# Traceback:\n# ' + output.traceback.join('\n# ') + '\n';
                    }
                  }
                });
              }
            } else if (cell.cell_type === 'markdown') {
              // Add markdown content
              if (cell.source) {
                const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
                
                // Check for embedded images in markdown
                const hasEmbeddedImages = source.includes('![') || 
                                         source.includes('<img') ||
                                         source.toLowerCase().includes('data:image');
                
                if (!includeImages && hasEmbeddedImages) {
                  // If we have embedded images but don't want to include them,
                  // filter or mark these lines
                  const lines = source.split('\n');
                  const filteredLines = lines.map(line => {
                    if ((line.includes('![') && line.includes(')')) || 
                        line.includes('<img') || 
                        line.toLowerCase().includes('data:image')) {
                      return '# [Embedded image removed]';
                    }
                    return line;
                  });
                  content += filteredLines.join('\n');
                } else {
                  content += source;
                }
                
                if (!source.endsWith('\n')) content += '\n';
              }
            } else if (cell.cell_type === 'raw') {
              // Add raw content
              if (cell.source) {
                const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
                content += source;
                if (!source.endsWith('\n')) content += '\n';
              }
            }
            
            content += '\n';
          });
        }
        
        return content;
      } catch (error) {
        console.error('Error formatting notebook:', error);
        return JSON.stringify(notebook, null, 2);
      }
    },
  
    /**
     * Calculate the size reduction percentage when removing images
     * @param {Object} notebook - Parsed notebook JSON
     * @return {number} Percentage of size reduction (0-100)
     */
    calculateImageSizeImpact(notebook) {
      try {
        let totalSize = JSON.stringify(notebook).length;
        let imageSize = 0;
        
        if (notebook.cells) {
          notebook.cells.forEach(cell => {
            // Check code cell outputs
            if (cell.cell_type === 'code' && cell.outputs) {
              cell.outputs.forEach(output => {
                if ((output.output_type === 'execute_result' || output.output_type === 'display_data') && output.data) {
                  // Check for various image formats
                  if (output.data['image/png']) {
                    imageSize += JSON.stringify(output.data['image/png']).length;
                  }
                  if (output.data['image/jpeg']) {
                    imageSize += JSON.stringify(output.data['image/jpeg']).length;
                  }
                  if (output.data['image/svg+xml']) {
                    imageSize += JSON.stringify(output.data['image/svg+xml']).length;
                  }
                }
              });
            }
            
            // Check markdown cells for embedded images
            if (cell.cell_type === 'markdown' && cell.source) {
              const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
              const lines = source.split('\n');
              
              lines.forEach(line => {
                // Look for markdown or HTML image syntax
                if ((line.includes('![') && line.includes(')')) || 
                    line.includes('<img') || 
                    line.toLowerCase().includes('data:image')) {
                  
                  // Approximate size of embedded images
                  // This is a rough estimate - only base64 data is accurate
                  const base64Match = line.match(/data:[^;]+;base64,([^"'\s)]+)/);
                  if (base64Match && base64Match[1]) {
                    imageSize += base64Match[1].length;
                  } else if (line.includes('![') || line.includes('<img')) {
                    // For external images, count the URL length as an approximation
                    const urlMatch = line.match(/(https?:\/\/[^)"'\s]+)/) || 
                                    line.match(/src=["']([^"']+)["']/);
                    if (urlMatch && urlMatch[1]) {
                      imageSize += urlMatch[1].length;
                    }
                  }
                }
              });
            }
          });
        }
        
        // Calculate percentage of size that is images
        if (totalSize > 0) {
          return Math.round((imageSize / totalSize) * 100);
        }
        
        return 0;
      } catch (error) {
        console.error('Error calculating image size impact:', error);
        return 0;
      }
    },
  
    /**
     * Count cells by type in a notebook
     * @param {Object} notebook - Parsed notebook JSON
     * @return {Object} Counts of different cell types
     */
    countCellTypes(notebook) {
      const counts = {
        code: 0,
        markdown: 0,
        raw: 0,
        codeWithOutput: 0
      };
      
      if (notebook.cells) {
        notebook.cells.forEach(cell => {
          if (cell.cell_type === 'code') {
            counts.code++;
            if (cell.outputs && cell.outputs.length > 0) {
              counts.codeWithOutput++;
            }
          } else if (cell.cell_type === 'markdown') {
            counts.markdown++;
          } else if (cell.cell_type === 'raw') {
            counts.raw++;
          }
        });
      }
      
      return counts;
    }
  };