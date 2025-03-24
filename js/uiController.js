/**
 * UI Controller - handles DOM updates and UI interactions
 */
const UIController = {
  // DOM element references
  elements: {},
  
  /**
   * Initialize the UI controller
   */
  init() {
    // Store references to DOM elements
    this.cacheElements();
    this.setupEventListeners();
    this.updateExtensionsUI();
  },

  /**
   * Cache DOM element references
   */
  cacheElements() {
    this.elements = {
      // Main sections
      dropArea: document.getElementById('drop-area'),
      fileInput: document.getElementById('file-input'),
      fileTree: document.getElementById('file-tree'),
      outputText: document.getElementById('output-text'),
      outputPlaceholder: document.getElementById('output-placeholder'),
      outputContainer: document.getElementById('output-container'),
      
      // Buttons
      copyButton: document.getElementById('copy-button'),
      clearButton: document.getElementById('clear-button'),
      selectButton: document.getElementById('select-button'),
      addExtensionButton: document.getElementById('add-extension-button'),
      expandAllButton: document.getElementById('expand-all-button'),
      collapseAllButton: document.getElementById('collapse-all-button'),
      
      // Progress and modals
      progressContainer: document.getElementById('progress-container'),
      progressText: document.getElementById('progress-text'),
      previewModal: document.getElementById('preview-modal'),
      closeModal: document.getElementById('close-modal'),
      modalTitle: document.getElementById('modal-title'),
      modalFileContent: document.getElementById('modal-file-content'),
      
      // Input fields
      extensionInput: document.getElementById('extension-input'),
      searchInput: document.getElementById('search-input'),
      
      // Counters
      charCount: document.getElementById('char-count'),
      lineCount: document.getElementById('line-count'),
      tokenCount: document.getElementById('token-count'),
      
      // Lists and containers
      extensionsList: document.getElementById('extensions-list'),
      
      // Notebook settings
      notebookSettings: document.getElementById('notebook-settings'),
      includeOutputToggle: document.getElementById('include-output-toggle'),
      includeImagesToggle: document.getElementById('include-images-toggle'),
      
      // Theme toggle
      themeToggle: document.getElementById('theme-toggle')
    };
  },

  /**
   * Set up event listeners for UI elements
   */
  setupEventListeners() {
    // Drop area events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      this.elements.dropArea.addEventListener(eventName, Utils.preventDefaults, false);
      document.body.addEventListener(eventName, Utils.preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
      this.elements.dropArea.addEventListener(eventName, this.highlightDropArea.bind(this), false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      this.elements.dropArea.addEventListener(eventName, this.unhighlightDropArea.bind(this), false);
    });
    
    this.elements.dropArea.addEventListener('drop', this.handleDrop.bind(this), false);
    this.elements.dropArea.addEventListener('click', () => this.elements.fileInput.click());
    this.elements.dropArea.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        this.elements.fileInput.click();
      }
    });
    
    // File input
    this.elements.fileInput.addEventListener('change', this.handleFileInputChange.bind(this), false);
    
    // Buttons
    this.elements.copyButton.addEventListener('click', this.copyOutputToClipboard.bind(this), false);
    this.elements.clearButton.addEventListener('click', this.clearSelection.bind(this), false);
    this.elements.addExtensionButton.addEventListener('click', this.addExtension.bind(this), false);
    
    // Folder tree control buttons
    if (this.elements.expandAllButton) {
      this.elements.expandAllButton.addEventListener('click', this.expandAllFolders.bind(this), false);
    }
    if (this.elements.collapseAllButton) {
      this.elements.collapseAllButton.addEventListener('click', this.collapseAllFolders.bind(this), false);
    }
    
    // Modal
    this.elements.closeModal.addEventListener('click', this.closePreviewModal.bind(this));
    this.elements.previewModal.addEventListener('click', (e) => {
      if (e.target === this.elements.previewModal) this.closePreviewModal();
    });
    
    // Search
    this.elements.searchInput.addEventListener('input', this.filterFileTree.bind(this));
    
    // Notebook toggles
    this.elements.includeOutputToggle.addEventListener('change', () => {
      FileHandlers.includeNotebookOutputs = this.elements.includeOutputToggle.checked;
      
      // Save preference to localStorage
      localStorage.setItem('codeigest-notebook-outputs', FileHandlers.includeNotebookOutputs);
      
      if (FileHandlers.updateNotebookOutputs()) {
        this.updateOutput();
        // Force update counts
        this.updateCounts();
      }
    });
    
    this.elements.includeImagesToggle.addEventListener('change', () => {
      FileHandlers.includeNotebookImages = this.elements.includeImagesToggle.checked;
      
      // Save preference to localStorage
      localStorage.setItem('codeigest-notebook-images', FileHandlers.includeNotebookImages);
      
      if (FileHandlers.updateNotebookOutputs()) {
        this.updateOutput();
        // Force update counts
        this.updateCounts();
      }
    });
    
    // Theme toggle
    this.elements.themeToggle.addEventListener('click', this.toggleDarkMode.bind(this));
  },

  /**
   * Toggle dark mode
   */
  toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    
    // Update icon
    const icon = this.elements.themeToggle.querySelector('i');
    if (document.body.classList.contains('dark-mode')) {
      icon.classList.remove('fa-moon');
      icon.classList.add('fa-sun');
      localStorage.setItem('codeigest-theme', 'dark');
    } else {
      icon.classList.remove('fa-sun');
      icon.classList.add('fa-moon');
      localStorage.setItem('codeigest-theme', 'light');
    }
  },

  /**
   * Expand all folders in the file tree
   */
  expandAllFolders() {
    const folderToggles = document.querySelectorAll('.tree-toggle');
    const treeChildren = document.querySelectorAll('.tree-children');
    
    folderToggles.forEach(toggle => {
      toggle.classList.add('open');
    });
    
    treeChildren.forEach(child => {
      child.classList.add('visible');
    });
  },

  /**
   * Collapse all folders in the file tree
   */
  collapseAllFolders() {
    const folderToggles = document.querySelectorAll('.tree-toggle');
    const treeChildren = document.querySelectorAll('.tree-children');
    
    folderToggles.forEach(toggle => {
      toggle.classList.remove('open');
    });
    
    treeChildren.forEach(child => {
      child.classList.remove('visible');
    });
  },

  /**
   * Highlight drop area on drag over
   */
  highlightDropArea() {
    this.elements.dropArea.classList.add('hover');
  },

  /**
   * Remove highlight from drop area
   */
  unhighlightDropArea() {
    this.elements.dropArea.classList.remove('hover');
  },

  /**
   * Handle file drop event
   * @param {Event} e - The drop event
   */
  handleDrop(e) {
    this.showProgress('Processing dropped items...');
    
    FileHandlers.handleDrop(e.dataTransfer, this.updateProgress.bind(this), (result) => {
      this.hideProgress();
      
      if (result.meaningfulFiles.length > 0 || result.nonRelevantFiles.length > 0) {
        // Get ALL files, not just the newly dropped ones
        const allFiles = FileHandlers.getAllFiles();
        
        // Update UI with all files, both meaningful and non-relevant
        this.updateFileTree([...allFiles.relevant, ...allFiles.nonRelevant], true);
        this.updateOutput();
        // Force update counts
        this.updateCounts();
        this.checkForNotebooks();
        this.elements.clearButton.classList.remove('hidden');
      } else {
        this.showEmptyState('No files found.');
      }
    });
  },

  /**
   * Handle file input change event
   * @param {Event} e - The change event
   */
  handleFileInputChange(e) {
    const files = e.target.files;
    
    if (!files || files.length === 0) {
      this.showEmptyState('No files selected.');
      return;
    }
    
    this.showProgress('Processing selected files...');
    
    FileHandlers.handleSelectedFiles(files, this.updateProgress.bind(this), (result) => {
      this.hideProgress();
      
      if (result.meaningfulFiles.length > 0 || result.nonRelevantFiles.length > 0) {
        // Get ALL files, not just the newly uploaded ones
        const allFiles = FileHandlers.getAllFiles();
        
        // Update UI with all files, both meaningful and non-relevant
        this.updateFileTree([...allFiles.relevant, ...allFiles.nonRelevant], true);
        this.updateOutput();
        // Force update counts
        this.updateCounts();
        
        // Look for .ipynb files and show notebook settings if found
        const hasIpynbFiles = FileHandlers.hasNotebooks();
        
        if (hasIpynbFiles) {
          // Force notebook settings visibility
          if (this.elements.notebookSettings) {
            this.elements.notebookSettings.classList.remove('hidden');
            Utils.showNotification('Jupyter Notebook files detected. Output and image toggles are available.');
          }
        }
        
        this.checkForNotebooks();
        this.elements.clearButton.classList.remove('hidden');
      } else {
        this.showEmptyState('No files found.');
      }
    });
  },

  /**
   * Update the file tree view with a unified folder/file structure
   * @param {string[]} files - Array of file paths
   * @param {boolean} preserveState - Whether to preserve expanded folder state
   */
  updateFileTree(files, preserveState = false) {
    // Save expanded folders state if requested
    const expandedFolders = new Set();
    if (preserveState) {
      document.querySelectorAll('.tree-children.visible').forEach(child => {
        // Find the folder path by traversing up
        let folderNode = child.previousElementSibling;
        if (folderNode && folderNode.classList.contains('folder')) {
          let path = '';
          let currentNode = folderNode;
          
          // Traverse up to build the path
          while (currentNode && currentNode !== this.elements.fileTree) {
            if (currentNode.classList.contains('folder')) {
              const folderName = currentNode.querySelector('.tree-name').textContent;
              path = path ? `${folderName}/${path}` : folderName;
            }
            
            // Move to parent
            const parent = currentNode.parentElement;
            if (parent && parent.previousElementSibling) {
              currentNode = parent.previousElementSibling;
            } else {
              currentNode = null;
            }
          }
          
          if (path) {
            expandedFolders.add(path);
          }
        }
      });
    }
    
    // Clear tree
    this.elements.fileTree.innerHTML = '';
    
    if (files.length === 0) {
      const placeholder = document.createElement('div');
      placeholder.id = 'file-placeholder';
      placeholder.classList.add('file-placeholder');
      placeholder.textContent = 'No files uploaded yet';
      this.elements.fileTree.appendChild(placeholder);
      return;
    }
    
    // Build folder structure
    const folderStructure = this.buildFolderStructure(files);
    
    // Render folder tree with expandedFolders set
    this.renderFileTree(folderStructure, this.elements.fileTree, '', expandedFolders);
  },

  /**
   * Build a folder structure from file paths
   * @param {string[]} files - Array of file paths
   * @return {Object} Folder structure object
   */
  buildFolderStructure(files) {
    const root = {
      name: 'root',
      type: 'folder',
      children: {}
    };
    
    files.forEach(filePath => {
      const parts = filePath.split('/');
      let current = root;
      
      // Process each part of the path
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        
        if (isFile) {
          // This is a file
          const extension = Utils.getFileExtension(part);
          const isRelevant = FileHandlers.isTextFile(extension) && FileHandlers.filesMap.has(filePath);
          
          current.children[part] = {
            name: part,
            path: filePath,
            type: 'file',
            isRelevant: isRelevant
          };
        } else {
          // This is a folder
          if (!current.children[part]) {
            current.children[part] = {
              name: part,
              type: 'folder',
              children: {}
            };
          }
          current = current.children[part];
        }
      }
    });
    
    return root;
  },

  /**
   * Render file tree structure to DOM
   * @param {Object} node - Current node in the folder structure
   * @param {HTMLElement} parent - Parent DOM element
   * @param {string} path - Current path
   * @param {Set} expandedFolders - Set of folder paths that should be expanded
   */
  renderFileTree(node, parent, path = '', expandedFolders = new Set()) {
    const children = Object.values(node.children);
    
    // Sort: folders first, then files; alphabetically within each group
    children.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    
    children.forEach(child => {
      const childPath = path ? `${path}/${child.name}` : child.name;
      
      if (child.type === 'folder') {
        // Create folder node
        const nodeElement = document.createElement('div');
        nodeElement.classList.add('tree-node', 'folder', 'clickable');
        
        const toggleElement = document.createElement('div');
        toggleElement.classList.add('tree-toggle');
        toggleElement.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nodeElement.appendChild(toggleElement);
        
        const iconElement = document.createElement('i');
        iconElement.classList.add('fas', 'fa-folder', 'tree-icon');
        nodeElement.appendChild(iconElement);
        
        const contentElement = document.createElement('div');
        contentElement.classList.add('tree-content');
        
        const nameElement = document.createElement('span');
        nameElement.classList.add('tree-name');
        nameElement.textContent = child.name;
        contentElement.appendChild(nameElement);
        
        nodeElement.appendChild(contentElement);
        
        // Add folder actions
        const actionsElement = document.createElement('div');
        actionsElement.classList.add('tree-actions');
        
        // Delete folder button
        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('tree-action-btn', 'remove-btn');
        deleteBtn.setAttribute('aria-label', `Delete folder ${childPath}`);
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteFolder(childPath);
        });
        
        actionsElement.appendChild(deleteBtn);
        nodeElement.appendChild(actionsElement);
        
        parent.appendChild(nodeElement);
        
        // Create children container
        const childrenContainer = document.createElement('div');
        childrenContainer.classList.add('tree-children');
        parent.appendChild(childrenContainer);
        
        // Check if this folder should be expanded initially
        const shouldExpand = expandedFolders.has(childPath);
        if (shouldExpand) {
          toggleElement.classList.add('open');
          childrenContainer.classList.add('visible');
          iconElement.classList.remove('fa-folder');
          iconElement.classList.add('fa-folder-open');
        }
        
        // Toggle children visibility
        nodeElement.addEventListener('click', () => {
          toggleElement.classList.toggle('open');
          childrenContainer.classList.toggle('visible');
          
          // Toggle folder icon
          iconElement.classList.toggle('fa-folder');
          iconElement.classList.toggle('fa-folder-open');
        });
        
        // Render children - pass expandedFolders to recursive calls
        this.renderFileTree(child, childrenContainer, childPath, expandedFolders);
      } else {
        // Create file node
        const nodeElement = document.createElement('div');
        nodeElement.classList.add('tree-node', 'file', 'clickable');
        nodeElement.classList.toggle('relevant', child.isRelevant);
        nodeElement.classList.toggle('non-relevant', !child.isRelevant);
        nodeElement.setAttribute('data-path', child.path);
        
        // Add spacing where toggle would be
        const spacerElement = document.createElement('div');
        spacerElement.style.width = '20px';
        nodeElement.appendChild(spacerElement);
        
        // File icon based on relevance
        const iconElement = document.createElement('i');
        iconElement.classList.add('fas', child.isRelevant ? 'fa-file-code' : 'fa-file', 'tree-icon');
        iconElement.style.color = child.isRelevant ? 'var(--primary)' : 'var(--secondary)';
        nodeElement.appendChild(iconElement);
        
        // Content container
        const contentElement = document.createElement('div');
        contentElement.classList.add('tree-content');
        
        // File name
        const nameElement = document.createElement('span');
        nameElement.classList.add('tree-name');
        nameElement.textContent = child.name;
        contentElement.appendChild(nameElement);
        
        // Show path for files not at root
        if (path) {
          const pathElement = document.createElement('span');
          pathElement.classList.add('tree-path');
          pathElement.textContent = `(${path})`;
          pathElement.title = path;
          contentElement.appendChild(pathElement);
        }
        
        nodeElement.appendChild(contentElement);
        
        // File actions
        const actionsElement = document.createElement('div');
        actionsElement.classList.add('tree-actions');
        
        // Preview button
        const previewBtn = document.createElement('button');
        previewBtn.classList.add('tree-action-btn', 'preview-btn');
        previewBtn.setAttribute('aria-label', `Preview ${child.path}`);
        previewBtn.innerHTML = '<i class="fas fa-eye"></i>';
        previewBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showPreview(child.path);
        });
        actionsElement.appendChild(previewBtn);
        
        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.classList.add('tree-action-btn', 'remove-btn');
        removeBtn.setAttribute('aria-label', `Remove ${child.path}`);
        removeBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeFile(child.path);
        });
        actionsElement.appendChild(removeBtn);
        
        nodeElement.appendChild(actionsElement);
        
        // Make the whole node clickable to show preview
        nodeElement.addEventListener('click', () => {
          this.showPreview(child.path);
        });
        
        parent.appendChild(nodeElement);
      }
    });
  },
  
  /**
   * Expand folders based on saved state
   * @param {Set} expandedFolders - Set of folder paths to expand
   */
  expandSavedFolders(expandedFolders) {
    // Get all folder nodes
    const folderNodes = document.querySelectorAll('.tree-node.folder');
    
    folderNodes.forEach(folderNode => {
      // Get the folder path
      let path = '';
      const folderName = folderNode.querySelector('.tree-name').textContent;
      
      // Start with just the current folder name
      path = folderName;
      
      // Check if this folder should be expanded
      if (expandedFolders.has(path)) {
        // Find the toggle element and children container
        const toggle = folderNode.querySelector('.tree-toggle');
        const childrenContainer = folderNode.nextElementSibling;
        
        if (toggle && childrenContainer) {
          // Expand this folder
          toggle.classList.add('open');
          childrenContainer.classList.add('visible');
          
          // Update folder icon
          const folderIcon = folderNode.querySelector('.fa-folder');
          if (folderIcon) {
            folderIcon.classList.remove('fa-folder');
            folderIcon.classList.add('fa-folder-open');
          }
        }
      }
    });
  },

  /**
   * Delete a folder and its contents
   * @param {string} folderPath - The folder path to delete
   */
  deleteFolder(folderPath) {
    if (confirm(`Are you sure you want to delete the folder "${folderPath}" and all its contents?`)) {
      // Remove from data store
      const removedFiles = FileHandlers.removeFolder(folderPath);
      
      // Update UI - preserve expanded folder state
      this.updateFileTree(Array.from(FileHandlers.allFilesMap.keys()), true);
      this.updateOutput();
      // Force update counts
      this.updateCounts();
      this.checkForNotebooks();
      
      if (FileHandlers.filesMap.size === 0 && FileHandlers.nonRelevantContent.size === 0) {
        this.showEmptyState();
        this.elements.clearButton.classList.add('hidden');
      }
      
      Utils.showNotification(`Deleted folder "${folderPath}" with ${removedFiles.length} files.`);
    }
  },

  /**
   * Remove a file from the project
   * @param {string} fileName - The file name/path to remove
   */
  removeFile(fileName) {
    // Remove from data store
    FileHandlers.removeFile(fileName);
    
    // Update UI - preserve expanded folder state
    this.updateFileTree(Array.from(FileHandlers.allFilesMap.keys()), true);
    this.updateOutput();
    // Force update counts regardless of what updateOutput does
    this.updateCounts();
    this.checkForNotebooks();
    
    if (FileHandlers.filesMap.size === 0 && FileHandlers.nonRelevantContent.size === 0) {
      this.showEmptyState();
      this.elements.clearButton.classList.add('hidden');
    }
    
    Utils.showNotification(`Removed file "${fileName}".`);
  },

  /**
   * Clear all files from the project
   */
  clearSelection() {
    if (confirm('Are you sure you want to clear all files?')) {
      // Reset file input
      this.elements.fileInput.value = '';
      
      // Clear data stores
      FileHandlers.clearAllFiles();
      
      // Reset UI
      this.elements.fileTree.innerHTML = '<div id="file-placeholder" class="file-placeholder">No files uploaded yet</div>';
      this.showEmptyState();
      this.elements.clearButton.classList.add('hidden');
      this.elements.searchInput.value = '';
      this.elements.notebookSettings.classList.add('hidden');
      
      // Reset counts
      this.updateCounts();
      
      Utils.showNotification('All files cleared.');
    }
  },

  /**
   * Update the output display with combined file contents
   */
  updateOutput() {
    const combinedContent = FileHandlers.getCombinedContent();
    
    if (!combinedContent) {
      this.showEmptyState();
      // Update counts even in empty state
      this.updateCounts();
      return;
    }
    
    this.elements.outputText.textContent = combinedContent;
    this.elements.outputText.classList.remove('hidden');
    this.elements.outputPlaceholder.classList.add('hidden');
    this.elements.outputContainer.classList.remove('empty');
    this.elements.copyButton.classList.remove('hidden');
    
    // Always update counts after updating output
    this.updateCounts();
  },

  /**
   * Show empty state for output
   * @param {string} message - Optional message to display
   */
  showEmptyState(message) {
    this.elements.outputText.textContent = '';
    this.elements.outputText.classList.add('hidden');
    this.elements.outputPlaceholder.classList.remove('hidden');
    this.elements.outputContainer.classList.add('empty');
    this.elements.copyButton.classList.add('hidden');
    
    if (message) {
      this.elements.outputPlaceholder.querySelector('p').textContent = message;
    } else {
      this.elements.outputPlaceholder.querySelector('p').textContent = 'File contents will appear here after uploading files.';
    }
  },

  /**
   * Copy output content to clipboard
   */
  copyOutputToClipboard() {
    const content = this.elements.outputText.textContent;
    
    Utils.copyToClipboard(
      content,
      // Success callback
      () => {
        this.elements.copyButton.innerHTML = '<i class="fas fa-check"></i>';
        this.elements.copyButton.classList.add('copied');
        
        setTimeout(() => {
          this.elements.copyButton.innerHTML = '<i class="fas fa-copy"></i>';
          this.elements.copyButton.classList.remove('copied');
        }, 2000);
        
        Utils.showNotification('Content copied to clipboard.');
      },
      // Error callback
      (error) => {
        console.error('Error copying to clipboard:', error);
        Utils.showNotification('Failed to copy content. Please try manually.', 'error');
      }
    );
  },

  /**
   * Update character, line, and token counts
   */
  updateCounts() {
    const text = this.elements.outputText.textContent || '';
    
    // Update character count
    const charCountNumber = text.length;
    this.elements.charCount.innerHTML = '<i class="fas fa-font count-icon"></i> Characters: ' + charCountNumber;
    
    // Update line count
    const lines = Utils.countLines(text);
    this.elements.lineCount.innerHTML = '<i class="fas fa-align-left count-icon"></i> Lines: ' + lines;
    
    // Update token count
    const tokens = Utils.countTokens(text);
    this.elements.tokenCount.innerHTML = '<i class="fas fa-code count-icon"></i> Tokens: ' + tokens;
  },

  /**
   * Show file preview modal
   * @param {string} fileName - The file name to preview
   */
  showPreview(fileName) {
    // Get content from either relevant or non-relevant files
    let content;
    if (FileHandlers.filesMap.has(fileName)) {
      content = FileHandlers.filesMap.get(fileName);
    } else if (FileHandlers.nonRelevantContent.has(fileName)) {
      content = FileHandlers.nonRelevantContent.get(fileName);
    } else {
      content = 'No content available.';
    }
    
    this.elements.modalTitle.textContent = fileName;
    this.elements.modalFileContent.textContent = content;
    this.elements.previewModal.classList.add('visible');
  },

  /**
   * Close file preview modal
   */
  closePreviewModal() {
    this.elements.previewModal.classList.remove('visible');
  },

  /**
   * Show progress indicator
   * @param {string} message - The message to display
   */
  showProgress(message) {
    this.elements.progressText.innerText = message;
    this.elements.progressContainer.classList.add('visible');
  },

  /**
   * Update progress message
   * @param {string} message - The new progress message
   */
  updateProgress(message) {
    this.elements.progressText.innerText = message;
  },

  /**
   * Hide progress indicator
   */
  hideProgress() {
    this.elements.progressContainer.classList.remove('visible');
  },

  /**
   * Add a new file extension
   */
  addExtension() {
    const newExt = this.elements.extensionInput.value.trim().toLowerCase();
    
    if (FileHandlers.addFileExtension(newExt)) {
      Utils.showNotification(`Added extension "${newExt}"`);
      this.elements.extensionInput.value = '';
      this.updateExtensionsUI();
      
      // Activate any newly relevant files
      this.showProgress('Checking for newly relevant files...');
      
      FileHandlers.activateNewlyRelevantFiles((fileName, extension) => {
        // Update UI for this file
        if (extension === '.ipynb') {
          this.checkForNotebooks();
        }
      });
      
      // Update file display with ALL files - preserve expanded folder state
      const allFiles = FileHandlers.getAllFiles();
      this.updateFileTree([...allFiles.relevant, ...allFiles.nonRelevant], true);
      
      // Update output
      this.updateOutput();
      // Force update counts
      this.updateCounts();
      
      this.hideProgress();
      this.elements.clearButton.classList.remove('hidden');
    } else {
      Utils.showNotification('Please enter a valid extension that starts with "." or it is already included.', 'error');
    }
  },

  /**
   * Remove a file extension
   * @param {string} ext - The extension to remove
   */
  removeExtension(ext) {
    const confirmRemove = confirm(`Are you sure you want to remove the extension "${ext}"?`);
    if (!confirmRemove) return;
    
    if (FileHandlers.removeFileExtension(ext)) {
      this.updateExtensionsUI();
      
      // Update file relevance
      const nowIrrelevantFiles = FileHandlers.updateFileRelevance();
      
      // Update UI with ALL files - preserve expanded folder state
      const allFiles = FileHandlers.getAllFiles();
      this.updateFileTree([...allFiles.relevant, ...allFiles.nonRelevant], true);
      
      // Update output
      this.updateOutput();
      // Force update counts
      this.updateCounts();
      this.checkForNotebooks();
      
      if (FileHandlers.filesMap.size === 0) {
        this.elements.clearButton.classList.add('hidden');
      }
      
      Utils.showNotification(`Removed extension "${ext}". ${nowIrrelevantFiles.length} files are now non-relevant.`);
    }
  },

  /**
   * Update the extensions list in the UI
   */
  updateExtensionsUI() {
    this.elements.extensionsList.innerHTML = '';
    
    FileHandlers.textFileExtensions.forEach(ext => {
      const extensionTag = document.createElement('div');
      extensionTag.classList.add('extension-tag');
      
      const extensionText = document.createElement('span');
      extensionText.textContent = ext;
      extensionTag.appendChild(extensionText);
      
      const removeBtn = document.createElement('button');
      removeBtn.classList.add('remove-extension-btn');
      removeBtn.setAttribute('aria-label', `Remove extension ${ext}`);
      removeBtn.innerHTML = '<i class="fas fa-times"></i>';
      removeBtn.addEventListener('click', () => this.removeExtension(ext));
      extensionTag.appendChild(removeBtn);
      
      this.elements.extensionsList.appendChild(extensionTag);
    });
  },

  /**
   * Check if there are any Jupyter notebooks and show settings if needed
   */
  checkForNotebooks() {
    const hasNotebooks = FileHandlers.hasNotebooks();
    
    // Make sure notebook settings element exists
    if (this.elements.notebookSettings) {
      this.elements.notebookSettings.classList.toggle('hidden', !hasNotebooks);
      
      // Show a notification when notebooks are detected
      if (hasNotebooks && this.elements.notebookSettings.classList.contains('hidden')) {
        Utils.showNotification('Jupyter notebook files detected. Notebook settings are now available.');
      }
      
      // Set toggle states
      if (this.elements.includeOutputToggle) {
        this.elements.includeOutputToggle.checked = FileHandlers.includeNotebookOutputs;
      }
      
      if (this.elements.includeImagesToggle) {
        this.elements.includeImagesToggle.checked = FileHandlers.includeNotebookImages;
      }
    } else {
      console.warn('Notebook settings element not found');
    }
  },

  /**
   * Filter files in the file tree based on search input
   */
  filterFileTree() {
    const filter = this.elements.searchInput.value.toLowerCase();
    
    // If empty filter, show everything and reset
    if (!filter) {
      this.resetFileTreeVisibility();
      return;
    }
    
    // First hide all nodes
    const allNodes = document.querySelectorAll('.tree-node');
    allNodes.forEach(node => {
      node.style.display = 'none';
    });
    
    // Find matching file nodes
    const fileNodes = document.querySelectorAll('.tree-node.file');
    const matchingFiles = new Set();
    
    fileNodes.forEach(node => {
      const filePath = node.getAttribute('data-path');
      
      if (filePath.toLowerCase().includes(filter)) {
        node.style.display = '';
        matchingFiles.add(filePath);
        
        // Show parent folders
        let parentNode = node.parentElement;
        while (parentNode && parentNode !== this.elements.fileTree) {
          if (parentNode.classList.contains('tree-children')) {
            parentNode.classList.add('visible');
            
            // Show and expand the folder node
            const folderNode = parentNode.previousElementSibling;
            if (folderNode && folderNode.classList.contains('folder')) {
              folderNode.style.display = '';
              const toggle = folderNode.querySelector('.tree-toggle');
              if (toggle) toggle.classList.add('open');
              
              // Update folder icon
              const folderIcon = folderNode.querySelector('.fa-folder');
              if (folderIcon) {
                folderIcon.classList.remove('fa-folder');
                folderIcon.classList.add('fa-folder-open');
              }
            }
          }
          parentNode = parentNode.parentElement;
        }
      }
    });
    
    // Check if we need to show empty state
    if (matchingFiles.size === 0) {
      const placeholder = document.getElementById('file-placeholder');
      if (!placeholder) {
        const newPlaceholder = document.createElement('div');
        newPlaceholder.id = 'file-placeholder';
        newPlaceholder.classList.add('file-placeholder');
        newPlaceholder.textContent = 'No matching files found';
        this.elements.fileTree.appendChild(newPlaceholder);
      } else {
        placeholder.textContent = 'No matching files found';
        placeholder.style.display = '';
      }
    }
  },
  
  /**
   * Reset the file tree to show all items
   */
  resetFileTreeVisibility() {
    // Show all nodes
    const allNodes = document.querySelectorAll('.tree-node');
    allNodes.forEach(node => {
      node.style.display = '';
    });
    
    // Reset folder children visibility
    const folderToggles = document.querySelectorAll('.tree-toggle');
    const treeChildren = document.querySelectorAll('.tree-children');
    
    folderToggles.forEach(toggle => {
      toggle.classList.remove('open');
    });
    
    treeChildren.forEach(child => {
      child.classList.remove('visible');
    });
    
    // Reset folder icons
    const folderIcons = document.querySelectorAll('.fa-folder-open');
    folderIcons.forEach(icon => {
      icon.classList.remove('fa-folder-open');
      icon.classList.add('fa-folder');
    });
    
    // Hide placeholder if it exists
    const placeholder = document.getElementById('file-placeholder');
    if (placeholder && placeholder.textContent === 'No matching files found') {
      placeholder.style.display = 'none';
    }
  }
};