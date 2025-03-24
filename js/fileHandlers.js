/**
 * File processing and handling functions
 */
const FileHandlers = {
  // File storage maps
  allFilesMap: new Map(), // Stores all file objects (both relevant and non-relevant)
  filesMap: new Map(),    // Stores text content of relevant files
  notebooksMap: new Map(), // Stores parsed notebook JSON
  
  // Content tracking
  nonRelevantContent: new Map(), // Stores content of non-relevant files
  // Allowed file extensions
  textFileExtensions: ['.tsx', '.css', '.html', '.js', '.py', '.ipynb', '.md', '.txt', '.json'],
  // Notebook processing settings
  includeNotebookOutputs: false,  // Default to OFF per requirements
  includeNotebookImages: false,   // Default to OFF per requirements
  /**
   * Check if a file extension is recognized as a text file
   * @param {string} extension - The file extension to check
   * @return {boolean} Whether the extension is in the allowed list
   */
  isTextFile(extension) {
    return this.textFileExtensions.includes(extension);
  },
  
  /**
   * Save current extensions to localStorage
   */
  saveExtensionsToLocalStorage() {
    try {
      localStorage.setItem('codeigest-extensions', JSON.stringify(this.textFileExtensions));
      console.log('Extensions saved to localStorage');
    } catch (error) {
      console.error('Error saving extensions to localStorage:', error);
    }
  },
  
  /**
   * Load extensions from localStorage
   * @return {boolean} Whether extensions were successfully loaded
   */
  loadExtensionsFromLocalStorage() {
    try {
      const savedExtensions = localStorage.getItem('codeigest-extensions');
      if (savedExtensions) {
        this.textFileExtensions = JSON.parse(savedExtensions);
        console.log('Extensions loaded from localStorage:', this.textFileExtensions);
        return true;
      }
    } catch (error) {
      console.error('Error loading extensions from localStorage:', error);
    }
    return false;
  },
  
  /**
   * Handle dropped files or directories
   * @param {DataTransfer} dataTransfer - The data transfer object from the drop event
   * @param {function} onProgress - Callback for progress updates
   * @param {function} onComplete - Callback when processing is complete
   */
  handleDrop(dataTransfer, onProgress, onComplete) {
    const items = dataTransfer.items;
    
    if (items) {
      onProgress('Processing dropped items...');
      
      const filePromises = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) {
          filePromises.push(this.traverseFileTree(item));
        }
      }
      
      Promise.all(filePromises)
        .then(files => {
          const allFiles = files.flat();
          if (allFiles.length > 0) {
            this.processFiles(allFiles, onProgress, onComplete);
          } else {
            onComplete([]);
          }
        })
        .catch(error => {
          console.error('Error traversing file tree:', error);
          onComplete([]);
        });
    } else {
      // Fallback to using files property
      const files = dataTransfer.files;
      if (files.length > 0) {
        this.processFiles(Array.from(files), onProgress, onComplete);
      } else {
        onComplete([]);
      }
    }
  },
  /**
   * Recursively traverse a directory structure
   * @param {FileSystemEntry} item - The directory or file entry
   * @param {string} path - The current path (for building relative paths)
   * @return {Promise} Promise resolving to an array of files
   */
  traverseFileTree(item, path = '') {
    return new Promise((resolve) => {
      if (item.isFile) {
        item.file(
          file => {
            file.relativePath = path + file.name;
            resolve([file]);
          },
          error => {
            console.error('Error reading file:', error);
            resolve([]);
          }
        );
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        dirReader.readEntries(entries => {
          if (entries.length === 0) {
            resolve([]);
            return;
          }
          
          const promises = entries.map(entry => 
            this.traverseFileTree(entry, path + item.name + '/')
          );
          
          Promise.all(promises)
            .then(results => {
              resolve(results.flat());
            })
            .catch(error => {
              console.error('Error traversing subdirectory:', error);
              resolve([]);
            });
        }, error => {
          console.error('Error reading directory:', error);
          resolve([]);
        });
      } else {
        resolve([]);
      }
    });
  },
  /**
   * Process an array of files
   * @param {File[]} files - Array of File objects to process
   * @param {function} onProgress - Callback for progress updates
   * @param {function} onComplete - Callback when processing is complete
   */
  processFiles(files, onProgress, onComplete) {
    onProgress(`Processing ${files.length} files...`);
    
    const meaningfulFiles = [];
    const nonRelevantFiles = [];
    
    // First pass: categorize files and store in allFilesMap
    files.forEach(file => {
      const fileName = file.relativePath || file.webkitRelativePath || file.name;
      const fileExtension = Utils.getFileExtension(fileName);
      
      // Check if file already exists and if so, ask for replacement
      if (this.allFilesMap.has(fileName)) {
        const existingFile = this.allFilesMap.get(fileName);
        // For simplicity, we'll just replace the file without asking in this version
        // but in a production app you might want to confirm with the user
      }
      
      // Store in all-files map regardless of type
      this.allFilesMap.set(fileName, file);
      
      if (this.isTextFile(fileExtension)) {
        meaningfulFiles.push({file, fileName});
      } else {
        nonRelevantFiles.push({file, fileName});
      }
    });
    
    // Return early if no files found
    if (meaningfulFiles.length === 0 && nonRelevantFiles.length === 0) {
      onComplete({
        meaningfulFiles: [],
        nonRelevantFiles: []
      });
      return;
    }
    
    // Second pass: read contents of ALL files (both meaningful and non-relevant)
    onProgress(`Reading ${meaningfulFiles.length + nonRelevantFiles.length} files...`);
    
    const readerPromises = [];
    
    // Process meaningful files
    meaningfulFiles.forEach(({file, fileName}) => {
      const reader = new FileReader();
      const fileExtension = Utils.getFileExtension(fileName);
      
      const filePromise = new Promise((resolve) => {
        reader.onload = (e) => {
          try {
            if (fileExtension === '.ipynb') {
              // Parse notebook JSON
              const notebook = JSON.parse(e.target.result);
              this.notebooksMap.set(fileName, notebook);
              
              // Format notebook with current settings
              const content = NotebookProcessor.formatNotebookContent(
                notebook, 
                this.includeNotebookOutputs,
                this.includeNotebookImages
              );
              
              this.filesMap.set(fileName, content);
            } else {
              // Regular text file
              this.filesMap.set(fileName, e.target.result);
            }
          } catch (error) {
            console.error(`Error processing file ${fileName}:`, error);
            // Store raw content even if parsing fails
            this.filesMap.set(fileName, e.target.result);
          }
          resolve(fileName);
        };
        
        reader.onerror = () => {
          console.error(`Error reading file: ${fileName}`);
          resolve(null);
        };
      });
      
      reader.readAsText(file);
      readerPromises.push(filePromise);
    });
    
    // Also process non-relevant files to display in the output
    nonRelevantFiles.forEach(({file, fileName}) => {
      const reader = new FileReader();
      
      const filePromise = new Promise((resolve) => {
        reader.onload = (e) => {
          try {
            // Store the content of non-relevant files
            this.nonRelevantContent.set(fileName, e.target.result);
          } catch (error) {
            console.error(`Error processing non-relevant file ${fileName}:`, error);
            this.nonRelevantContent.set(fileName, "Error reading file content");
          }
          resolve(fileName);
        };
        
        reader.onerror = () => {
          console.error(`Error reading non-relevant file: ${fileName}`);
          this.nonRelevantContent.set(fileName, "Error reading file content");
          resolve(null);
        };
      });
      
      reader.readAsText(file);
      readerPromises.push(filePromise);
    });
    
    Promise.all(readerPromises)
      .then(results => {
        // Filter out any failures
        const successfulFiles = results.filter(Boolean);
        
        onComplete({
          meaningfulFiles: meaningfulFiles.map(f => f.fileName),
          nonRelevantFiles: nonRelevantFiles.map(f => f.fileName)
        });
      })
      .catch(error => {
        console.error('Error processing files:', error);
        onComplete({
          meaningfulFiles: meaningfulFiles.map(f => f.fileName),
          nonRelevantFiles: nonRelevantFiles.map(f => f.fileName)
        });
      });
  },
  /**
   * Handle selected files from the file input element
   * @param {FileList} fileList - The FileList from the input element
   * @param {function} onProgress - Callback for progress updates
   * @param {function} onComplete - Callback when processing is complete
   */
  handleSelectedFiles(fileList, onProgress, onComplete) {
    if (!fileList || fileList.length === 0) {
      onComplete({
        meaningfulFiles: [],
        nonRelevantFiles: []
      });
      return;
    }
    
    const files = Array.from(fileList).map(file => {
      file.relativePath = file.webkitRelativePath || file.name;
      return file;
    });
    
    this.processFiles(files, onProgress, onComplete);
  },
  /**
   * Regenerate notebook content with new settings
   * @return {boolean} Whether any changes were made
   */
  updateNotebookOutputs() {
    let hasChanges = false;
    
    // Iterate through all .ipynb files in notebooksMap
    for (let [fileName, notebook] of this.notebooksMap.entries()) {
      // Update content with current settings
      const content = NotebookProcessor.formatNotebookContent(
        notebook, 
        this.includeNotebookOutputs, 
        this.includeNotebookImages
      );
      
      this.filesMap.set(fileName, content);
      hasChanges = true;
    }
    
    return hasChanges;
  },
  /**
   * Add a new file extension to the allowed list
   * @param {string} extension - The extension to add (e.g. ".py")
   * @return {boolean} Whether the extension was added (false if already exists)
   */
  addFileExtension(extension) {
    extension = extension.trim().toLowerCase();
    
    if (!extension || !extension.startsWith('.')) {
      return false;
    }
    
    if (this.textFileExtensions.includes(extension)) {
      return false;
    }
    
    this.textFileExtensions.push(extension);
    
    // Save the updated extensions list to localStorage
    this.saveExtensionsToLocalStorage();
    
    return true;
  },
  /**
   * Remove a file extension from the allowed list
   * @param {string} extension - The extension to remove
   * @return {boolean} Whether the extension was successfully removed
   */
  removeFileExtension(extension) {
    const index = this.textFileExtensions.indexOf(extension);
    if (index === -1) return false;
    
    this.textFileExtensions.splice(index, 1);
    
    // Save the updated extensions list to localStorage
    this.saveExtensionsToLocalStorage();
    
    return true;
  },
  /**
   * Check for newly relevant files after adding extensions
   * @param {function} onFileRead - Callback when a file becomes relevant
   */
  activateNewlyRelevantFiles(onFileRead) {
    const newlyRelevantFiles = [];
    
    for (let [fileName, fileObj] of this.allFilesMap.entries()) {
      if (!this.filesMap.has(fileName)) {
        const extension = Utils.getFileExtension(fileName);
        
        if (this.isTextFile(extension)) {
          // This file is now relevant based on the new extension
          
          // If we already have the content in the nonRelevantContent map, use it
          if (this.nonRelevantContent.has(fileName)) {
            const content = this.nonRelevantContent.get(fileName);
            
            if (extension === '.ipynb') {
              try {
                const notebook = JSON.parse(content);
                this.notebooksMap.set(fileName, notebook);
                
                const formattedContent = NotebookProcessor.formatNotebookContent(
                  notebook, 
                  this.includeNotebookOutputs,
                  this.includeNotebookImages
                );
                
                this.filesMap.set(fileName, formattedContent);
                this.nonRelevantContent.delete(fileName); // Remove from non-relevant
                newlyRelevantFiles.push(fileName);
                
                if (onFileRead) {
                  onFileRead(fileName, extension);
                }
              } catch (error) {
                console.error(`Error parsing notebook: ${fileName}`, error);
                this.filesMap.set(fileName, content);
                this.nonRelevantContent.delete(fileName);
                newlyRelevantFiles.push(fileName);
                
                if (onFileRead) {
                  onFileRead(fileName, extension);
                }
              }
            } else {
              // Regular text file
              this.filesMap.set(fileName, content);
              this.nonRelevantContent.delete(fileName);
              newlyRelevantFiles.push(fileName);
              
              if (onFileRead) {
                onFileRead(fileName, extension);
              }
            }
          } else {
            // Need to read the file
            const reader = new FileReader();
            
            reader.onload = (e) => {
              try {
                if (extension === '.ipynb') {
                  // Process notebook
                  const notebook = JSON.parse(e.target.result);
                  this.notebooksMap.set(fileName, notebook);
                  
                  const content = NotebookProcessor.formatNotebookContent(
                    notebook, 
                    this.includeNotebookOutputs,
                    this.includeNotebookImages
                  );
                  
                  this.filesMap.set(fileName, content);
                } else {
                  // Regular text file
                  this.filesMap.set(fileName, e.target.result);
                }
                
                newlyRelevantFiles.push(fileName);
                
                if (onFileRead) {
                  onFileRead(fileName, extension);
                }
              } catch (error) {
                console.error(`Error processing file ${fileName}:`, error);
                this.filesMap.set(fileName, e.target.result);
                newlyRelevantFiles.push(fileName);
                
                if (onFileRead) {
                  onFileRead(fileName, extension);
                }
              }
            };
            
            reader.onerror = () => {
              console.error(`Error reading file: ${fileName}`);
            };
            
            reader.readAsText(fileObj);
          }
        }
      }
    }
    
    return newlyRelevantFiles;
  },
  /**
   * Update files that are no longer relevant after removing extensions
   * @return {string[]} Array of files that are now non-relevant
   */
  updateFileRelevance() {
    const nowIrrelevantFiles = [];
    
    for (let [fileName, content] of this.filesMap.entries()) {
      const extension = Utils.getFileExtension(fileName);
      
      if (!this.isTextFile(extension)) {
        nowIrrelevantFiles.push(fileName);
        
        // Move the content to nonRelevantContent instead of deleting it
        this.nonRelevantContent.set(fileName, content);
        this.filesMap.delete(fileName);
        
        if (extension === '.ipynb') {
          this.notebooksMap.delete(fileName);
        }
      }
    }
    
    return nowIrrelevantFiles;
  },
  /**
   * Remove a file from all collections
   * @param {string} fileName - The file name to remove
   */
  removeFile(fileName) {
    this.filesMap.delete(fileName);
    this.nonRelevantContent.delete(fileName);
    this.allFilesMap.delete(fileName);
    
    if (Utils.getFileExtension(fileName) === '.ipynb') {
      this.notebooksMap.delete(fileName);
    }
  },
  /**
   * Remove all files in a given folder path
   * @param {string} folderPath - The folder path to remove files from
   * @return {string[]} Array of removed file names
   */
  removeFolder(folderPath) {
    const removedFiles = [];
    
    for (let fileName of Array.from(this.allFilesMap.keys())) {
      if (fileName.startsWith(folderPath + '/')) {
        this.filesMap.delete(fileName);
        this.nonRelevantContent.delete(fileName);
        this.allFilesMap.delete(fileName);
        
        if (Utils.getFileExtension(fileName) === '.ipynb') {
          this.notebooksMap.delete(fileName);
        }
        
        removedFiles.push(fileName);
      }
    }
    
    return removedFiles;
  },
  /**
   * Clear all files from all collections
   */
  clearAllFiles() {
    this.filesMap.clear();
    this.nonRelevantContent.clear();
    this.allFilesMap.clear();
    this.notebooksMap.clear();
  },
  /**
   * Get combined content of all relevant files only
   * @return {string} The combined content of relevant files
   */
  getCombinedContent() {
    let combinedContent = '';
    
    // Add content from relevant files only
    for (let [fileName, content] of this.filesMap.entries()) {
      combinedContent += `${fileName}:\n${content}\n\n`;
    }
    
    // Non-relevant files are now excluded from the textbox output
    // They are still stored in nonRelevantContent for future use
    
    return combinedContent;
  },
  /**
   * Check if there are any notebooks in the collection
   * @return {boolean} Whether any notebooks are present
   */
  hasNotebooks() {
    return this.notebooksMap.size > 0;
  },
  
  /**
   * Get all files, both relevant and non-relevant
   * @return {Object} Object containing arrays of file names
   */
  getAllFiles() {
    const relevant = [];
    const nonRelevant = [];
    
    // Check all files in allFilesMap
    for (let [fileName, _] of this.allFilesMap.entries()) {
      if (this.filesMap.has(fileName)) {
        relevant.push(fileName);
      } else if (this.nonRelevantContent.has(fileName)) {
        nonRelevant.push(fileName);
      }
    }
    
    return {
      relevant,
      nonRelevant
    };
  }
};