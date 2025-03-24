/**
 * Utility functions for Codeigest application
 */
const Utils = {
  /**
   * Extract file extension from a filename
   * @param {string} filename - The filename to extract extension from
   * @return {string} The lowercase extension with dot (e.g. ".js")
   */
  getFileExtension(filename) {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.slice(lastDot).toLowerCase() : '';
  },

  /**
   * Show a notification message
   * @param {string} message - The message to display
   * @param {string} type - The notification type ('success' or 'error')
   * @param {number} duration - How long to show the notification in ms (default: 3000)
   */
  showNotification(message, type = 'success', duration = 3000) {
    // Create notification element if it doesn't exist already
    if (!document.querySelector('.notification')) {
      const notification = document.createElement('div');
      notification.classList.add('notification', `notification-${type}`);
      
      const icon = document.createElement('i');
      icon.classList.add('fas', type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle');
      notification.appendChild(icon);
      
      const text = document.createElement('span');
      text.textContent = message;
      notification.appendChild(text);
      
      document.body.appendChild(notification);
      
      // Small delay to trigger the animation
      setTimeout(() => {
        notification.classList.add('show');
      }, 10);
      
      // Remove notification after delay
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
          notification.remove();
        }, 300);
      }, duration);
    } else {
      // Update existing notification
      const notification = document.querySelector('.notification');
      notification.className = `notification notification-${type} show`;
      
      const icon = notification.querySelector('i');
      icon.className = `fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
      
      const text = notification.querySelector('span');
      text.textContent = message;
      
      // Reset the timeout for removal
      clearTimeout(notification.hideTimeout);
      notification.hideTimeout = setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
          notification.remove();
        }, 300);
      }, duration);
    }
  },

  /**
   * Estimate token count from character count
   * @param {string} text - The text to estimate tokens for
   * @return {number} Approximate token count
   */
  estimateTokenCount(text) {
    return Math.ceil(text.length / 4);
  },

  /**
   * Count the number of actual tokens using GPT-3 Encoder if available
   * @param {string} text - The text to count tokens for
   * @return {number} Actual token count or estimate if encoder not available
   */
  countTokens(text) {
    if (window.gpt3encoder && typeof window.gpt3encoder.encode === 'function') {
      try {
        return window.gpt3encoder.encode(text).length;
      } catch (error) {
        console.error('Error encoding tokens:', error);
        return this.estimateTokenCount(text);
      }
    }
    return this.estimateTokenCount(text);
  },

  /**
   * Count the number of non-empty lines in text
   * @param {string} text - The text to count lines for
   * @return {number} Number of non-empty lines
   */
  countLines(text) {
    return text.split(/\r?\n/).filter(line => line.trim() !== '').length;
  },

  /**
   * Prevent default browser events
   * @param {Event} e - The event to prevent default behavior for
   */
  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  },

  /**
   * Copy text to clipboard with fallback
   * @param {string} text - The text to copy
   * @param {function} onSuccess - Callback for successful copy
   * @param {function} onError - Callback for failed copy
   */
  async copyToClipboard(text, onSuccess, onError) {
    if (!text) return;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        if (onSuccess) onSuccess();
      } catch (err) {
        console.error('Error copying to clipboard:', err);
        this.fallbackCopy(text, onSuccess, onError);
      }
    } else {
      this.fallbackCopy(text, onSuccess, onError);
    }
  },

  /**
   * Fallback method to copy text using document.execCommand
   * @param {string} text - The text to copy
   * @param {function} onSuccess - Callback for successful copy
   * @param {function} onError - Callback for failed copy
   */
  fallbackCopy(text, onSuccess, onError) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        if (onSuccess) onSuccess();
      } else {
        if (onError) onError('execCommand was unsuccessful');
      }
    } catch (err) {
      console.error('Fallback: Unable to copy', err);
      if (onError) onError(err);
    }
    
    document.body.removeChild(textarea);
  }
};