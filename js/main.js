/**
 * Main application entry point
 * Initializes and coordinates all components of the Codeigest application
 */
// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI Controller
  UIController.init();
  
  // Display version information in console
  console.log('Codeigest - Project File Reader');
  console.log('Version: 2.0.0');
  console.log('Running in privacy-first client-side mode');
  
  // Load saved file extensions from localStorage
  FileHandlers.loadExtensionsFromLocalStorage();
  
  // Update UI to reflect loaded extensions
  UIController.updateExtensionsUI();
  
  // Check for saved theme preference
  const savedTheme = localStorage.getItem('codeigest-theme');
  const prefersDarkMode = savedTheme === 'dark' || 
                         (savedTheme !== 'light' && 
                          window.matchMedia && 
                          window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  if (prefersDarkMode) {
    document.body.classList.add('dark-mode');
    
    // Update theme toggle icon
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      const icon = themeToggle.querySelector('i');
      if (icon) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
      }
    }
  }
  
  // Load notebook settings preferences from localStorage
  const savedOutputToggle = localStorage.getItem('codeigest-notebook-outputs');
  const savedImagesToggle = localStorage.getItem('codeigest-notebook-images');
  
  FileHandlers.includeNotebookOutputs = savedOutputToggle === 'true';
  FileHandlers.includeNotebookImages = savedImagesToggle === 'true';
  
  const includeOutputToggle = document.getElementById('include-output-toggle');
  const includeImagesToggle = document.getElementById('include-images-toggle');
  
  if (includeOutputToggle) {
    includeOutputToggle.checked = FileHandlers.includeNotebookOutputs;
  }
  
  if (includeImagesToggle) {
    includeImagesToggle.checked = FileHandlers.includeNotebookImages;
  }
  
  // Show privacy notice if it's the first visit
  if (!localStorage.getItem('codeigest-privacy-notice-shown')) {
    setTimeout(() => {
      Utils.showNotification('Codeigest processes all files locally - your data never leaves your device.', 'success', 8000);
      localStorage.setItem('codeigest-privacy-notice-shown', 'true');
    }, 2000);
  }
  
  // Display welcome message for first-time users (if no localStorage record)
  if (!localStorage.getItem('codeigest-welcomed')) {
    setTimeout(() => {
      Utils.showNotification('Welcome to Codeigest! Drag and drop your project files to get started.', 'success');
      localStorage.setItem('codeigest-welcomed', 'true');
    }, 1000);
  }
});
document.addEventListener('DOMContentLoaded', () => {
  // Only show hint for new users (or those who haven't dismissed it)
  if (!localStorage.getItem('codeigest-hint-dismissed')) {
    const helpHint = document.getElementById('help-hint');
    const dismissBtn = document.getElementById('dismiss-hint');
    
    // Show hint after 5 seconds
    setTimeout(() => {
      helpHint.classList.add('visible');
      
      // Auto-hide after 15 seconds
      setTimeout(() => {
        if (helpHint.classList.contains('visible')) {
          helpHint.classList.remove('visible');
        }
      }, 15000);
    }, 5000);
    
    // Dismiss button functionality
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        helpHint.classList.remove('visible');
        localStorage.setItem('codeigest-hint-dismissed', 'true');
      });
    }
    
    // Also dismiss when clicking on the link
    const hintLink = helpHint.querySelector('a');
    if (hintLink) {
      hintLink.addEventListener('click', () => {
        localStorage.setItem('codeigest-hint-dismissed', 'true');
      });
    }
  }
});