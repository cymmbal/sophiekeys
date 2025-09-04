// Particle system
class ParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.maxParticles = 100;
        this.animationFrame = null;
        
        // Set particle color with alpha
        this.particleColor = {
            r: 131,  // #838078
            g: 128,
            b: 120,
            a: 0.05  // Much lighter opacity
        };
        
        // Set canvas size to match container
        this.resize();
        
        // Handle window resize
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    createParticle() {
        const size = Math.random() * 24 + 12;
        const speed = Math.random() * 1 + 0.1;
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 200 + 100;
        
        // Calculate random starting position within the image bounds
        // Leave some padding from the edges (20px)
        const padding = 20;
        const startX = padding + Math.random() * (this.canvas.width - padding * 2);
        const startY = padding + Math.random() * (this.canvas.height - padding * 2);
        
        return {
            x: startX,
            y: startY,
            size,
            speed,
            angle,
            distance,
            currentDistance: 0,
            alpha: 0, // Start with 0 alpha
            fadeInProgress: 0, // Track fade-in progress
            fadeInSpeed: 0.02 + Math.random() * 0.03 // Random fade-in speed
        };
    }

    update() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add new particles more frequently
        if (this.particles.length < this.maxParticles && Math.random() < 0.5) {
            this.particles.push(this.createParticle());
        }

        // Update and draw particles
        this.particles = this.particles.filter(particle => {
            // Handle fade-in
            if (particle.fadeInProgress < 1) {
                particle.fadeInProgress += particle.fadeInSpeed;
                particle.alpha = this.particleColor.a * particle.fadeInProgress;
            } else {
                particle.currentDistance += particle.speed;
                particle.alpha = this.particleColor.a * (1 - (particle.currentDistance / particle.distance));
            }
            
            if (particle.alpha <= 0) return false;

            // Calculate new position based on angle and distance from start position
            const x = particle.x + Math.cos(particle.angle) * particle.currentDistance;
            const y = particle.y + Math.sin(particle.angle) * particle.currentDistance;

            // Apply blur effect
            this.ctx.filter = 'blur(2px)';
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, particle.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(${this.particleColor.r}, ${this.particleColor.g}, ${this.particleColor.b}, ${particle.alpha})`;
            this.ctx.fill();
            
            // Reset filter
            this.ctx.filter = 'none';

            return true;
        });

        this.animationFrame = requestAnimationFrame(() => this.update());
    }

    start() {
        this.resize(); // Ensure correct size when starting
        this.particles = []; // Clear existing particles
        this.update();
    }

    stop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        this.particles = [];
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

export class UnlockTest {
    constructor(gemPlayer) {
        this.gemPlayer = gemPlayer;
        this.buttonContainer = null;
        this.button = null;
        this.message = null;
        this.overlay = null;
        this.unlockState = 0;
        this.unlockConfig = null;
        this.preloadedImages = {};  // Store preloaded images
        
        // Animation timing configuration
        this.fadeInDuration = '1.0s';
        
        // Start unlock sequence immediately
        this.unlockSequenceStarted = true;

        // Add keyboard event listener for right arrow key navigation
        this.handleKeyDown = this.handleKeyDown.bind(this);
        document.addEventListener('keydown', this.handleKeyDown);

        // Initialize unlock configuration and overlay
        this.init();
    }

    async init() {
        // Load unlock configuration
        try {
            const response = await fetch(this.gemPlayer.getAttribute('unlockables'));
            this.unlockConfig = await response.json();
            
            if (!this.unlockConfig || !this.unlockConfig.unlocks || this.unlockConfig.unlocks.length === 0) {
                console.error('Invalid unlock configuration');
                return;
            }

                    // Preload all unlock images immediately
        console.log('🚀 Starting image preload for', this.unlockConfig.unlocks.length, 'images...');
        console.log('🌐 Browser:', navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other');
        
        // Force Chrome to be more aggressive about preloading
        const preloadPromises = this.unlockConfig.unlocks.map((unlock, index) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    this.preloadedImages[unlock.image] = img;
                    console.log(`✅ Preloaded ${index + 1}/${this.unlockConfig.unlocks.length}: ${unlock.image}`);
                    resolve(unlock.image);
                };
                img.onerror = () => {
                    console.error(`❌ Failed to preload: ${unlock.image}`);
                    reject(unlock.image);
                };
                // Start loading immediately
                img.src = unlock.image;
            });
        });
        
        // Wait for all images to preload and log completion
        Promise.allSettled(preloadPromises).then((results) => {
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            console.log(`🎉 Preloading complete: ${successful} successful, ${failed} failed`);
            
            // Chrome-specific: Force images to be cached by briefly displaying them
            if (navigator.userAgent.includes('Chrome')) {
                console.log('🔧 Chrome detected - forcing image cache...');
                const tempContainer = document.createElement('div');
                tempContainer.style.position = 'absolute';
                tempContainer.style.left = '-9999px';
                tempContainer.style.top = '-9999px';
                tempContainer.style.width = '1px';
                tempContainer.style.height = '1px';
                tempContainer.style.overflow = 'hidden';
                
                Object.values(this.preloadedImages).forEach(img => {
                    const clone = img.cloneNode();
                    clone.style.width = '1px';
                    clone.style.height = '1px';
                    tempContainer.appendChild(clone);
                });
                
                document.body.appendChild(tempContainer);
                setTimeout(() => {
                    document.body.removeChild(tempContainer);
                    console.log('✅ Chrome cache forcing complete');
                }, 100);
            }
        });

            // Create overlay
            this.createOverlay();

            // Start unlock sequence immediately after initialization
            setTimeout(() => {
                this.startUnlockSequence();
            }, 1000); // 1 second delay to let page load
        } catch (error) {
            console.error('Error loading unlock configuration:', error);
        }
    }



        // Helper to animate message and button in sequence (not for initial message)
    animateMessageAndButton() {
        if (!this.message || !this.button) return;
        // Reset animations
        this.message.style.animation = 'none';
        this.button.style.animation = 'none';
        
        // Check if this is the final unlock (last one in the array)
        const isFinalUnlock = this.unlockState === this.unlockConfig.unlocks.length - 1;
        
        // Use longer delay for final unlock button, normal delay for others
        const buttonDelay = isFinalUnlock ? 4000 : 4000;
        
        // Animate message after 0.8s (was 1s)
        setTimeout(() => {
            this.message.style.animation = 'flip-in-y 4s ease-in-out forwards';
            // Animate button after message animation
            setTimeout(() => {
                this.button.style.animation = 'fade-in 1s ease-out forwards';
            }, buttonDelay);
        }, 800);
    }

    startUnlockSequence() {
        // Always show unlock message automatically after initial message fades out
        this.createButtonContainer();
        setTimeout(() => {
            this.fadeInButton();
            this.animateMessageAndButton();
        }, 200);
    }

    fadeInButton() {
        if (this.buttonContainer) {
            this.buttonContainer.style.display = 'flex';
            this.buttonContainer.offsetHeight;
            this.buttonContainer.style.opacity = '1';

            // --- Force initial state for message and button ---
            this.message.style.opacity = '0';
            this.message.style.transform = 'rotateY(90deg)';
            this.message.style.animation = 'none';

            // --- Force reflow ---
            void this.message.offsetWidth;

            // --- Start message animation ---
            this.message.style.animation = 'flip-in-y 4s ease-in-out forwards';

            // Only animate button if it exists
            if (this.button) {
                this.button.style.opacity = '0';
                this.button.style.animation = 'none';
                
                // --- Force reflow for button ---
                void this.button.offsetWidth;

                // Check if this is the final unlock (last one in the array)
                const isFinalUnlock = this.unlockState === this.unlockConfig.unlocks.length - 1;
                
                // Use longer delay for final unlock button, normal delay for others
                const buttonDelay = isFinalUnlock ? 13000 : 4000;

                // --- Start button animation ---
                setTimeout(() => {
                    if (this.button) { // Check again in case button was removed
                        this.button.style.animation = 'fade-in 1s ease-out forwards';
                    }
                }, buttonDelay);
            }
        }
    }

    fadeOutButton() {
        if (this.buttonContainer) {
            this.buttonContainer.style.opacity = '0';
        }
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.classList.add('unlock-overlay');

        // Create content container
        const content = document.createElement('div');
        content.className = 'unlock-content';

        const heading = document.createElement('div');
        heading.className = 'unlock-heading';
        content.appendChild(heading);

        const imageContainer = document.createElement('div');
        imageContainer.className = 'unlock-image-container';
        
        const particleCanvas = document.createElement('canvas');
        particleCanvas.className = 'particle-canvas';
        
        const image = document.createElement('img');
        image.className = 'unlock-image';
        // Don't set src here - we'll set it when we're ready to display
        image.alt = this.unlockConfig.unlocks[this.unlockState].title;
        
        imageContainer.appendChild(particleCanvas);
        imageContainer.appendChild(image);

        const title = document.createElement('div');
        title.className = 'unlock-title';
        content.appendChild(title);

        const description = document.createElement('div');
        description.className = 'unlock-description';
        content.appendChild(description);

        this.overlayContent = {
            heading: heading,
            image: image,
            title: title,
            description: description,
            imageContainer: imageContainer,
            particleSystem: new ParticleSystem(particleCanvas)
        };

        // Assemble content
        content.appendChild(heading);
        content.appendChild(imageContainer);
        content.appendChild(title);
        content.appendChild(description);

        // Add content to overlay
        this.overlay.appendChild(content);

        // Add click handler to close overlay - using mousedown instead of click for better responsiveness
        this.overlay.addEventListener('mousedown', (e) => {
            // Only close if clicking directly on the overlay or its background
            if (e.target === this.overlay || e.target === content) {
                this.handleOverlayClose();
            }
        });

        // Add overlay to gem player
        this.gemPlayer.appendChild(this.overlay);
    }

    updateOverlayContent() {
        const currentUnlock = this.unlockConfig.unlocks[this.unlockState];
        this.overlayContent.heading.textContent = currentUnlock.heading;
        
        // Format yesterday's date
        let title = currentUnlock.title;
        if (title && title.includes("concert on")) {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const month = yesterday.toLocaleString('en-US', { month: 'long' });
            const day = yesterday.getDate();
            const suffix = this.getDaySuffix(day);
            title = title.replace(/on [A-Za-z]+ \d+(?:st|nd|rd|th)/, `on ${month} ${day}${suffix}`);
        }
        this.overlayContent.title.textContent = title;
        
        // Update description: if 'Next unlock', '✨ View full Gem', or 'See what you unlocked', style as fake button
        if (currentUnlock.description === 'Next unlock' || currentUnlock.description === '✨ View full Gem' || currentUnlock.description === ' ') {
            this.overlayContent.description.className = 'unlock-description unlock-fake-button';
            this.overlayContent.description.innerHTML = currentUnlock.description;
        } else {
            this.overlayContent.description.className = 'unlock-description';
            this.overlayContent.description.textContent = currentUnlock.url ? "Tap to visit" : currentUnlock.description;
        }
        
        // Update image - but don't set src yet, we'll do that in handleUnlock with proper loading control
        this.overlayContent.image.alt = currentUnlock.title;
        
        // Use preloaded image if available (for instant display)
        if (this.preloadedImages[currentUnlock.image]) {
            console.log('✅ Using preloaded image:', currentUnlock.image);
            this.overlayContent.image.style.opacity = '1';
        } else {
            console.log('⏳ Image not preloaded yet:', currentUnlock.image);
            // Keep image hidden until fully loaded
            this.overlayContent.image.style.opacity = '0';
        }
        
        // Start animations
        this.overlayContent.imageContainer.style.animation = 'sway 8s ease-in-out infinite';
        if (this.overlayContent.particleSystem) {
            this.overlayContent.particleSystem.start();
        }
    }

    handleUnlock() {
        // Update overlay content based on current state BEFORE showing the modal
        this.updateOverlayContent();
        
        // Remove button container when modal appears
        if (this.buttonContainer && this.buttonContainer.parentNode) {
            this.buttonContainer.parentNode.removeChild(this.buttonContainer);
            this.buttonContainer = null;
            this.button = null;
            this.message = null;
        }
        
        // Reset drift offset to center
        if (this.gemPlayer.driftControl) {
            // Force drift back to center (0,0)
            this.gemPlayer.driftControl.applyNormalizedRotations(0, 0);
        }

        // Reset GEM to front-facing position
        if (this.gemPlayer.rotationControl) {
            this.gemPlayer.rotationControl.resetToFront();
        }
        
        // IMPORTANT: Set image source BEFORE showing the overlay to prevent flash
        const currentUnlock = this.unlockConfig.unlocks[this.unlockState];
        this.overlayContent.image.src = currentUnlock.image;
        
        // Show overlay with a small delay to ensure content is fully updated
        this.overlay.style.display = 'block';
        
        // Small delay to ensure content is fully updated before showing
        setTimeout(() => {
            this.overlay.style.opacity = '1';
        }, 50);
        
        // Start with content transparent
        this.overlayContent.heading.style.opacity = '0';
        this.overlayContent.imageContainer.style.opacity = '0';
        this.overlayContent.title.style.opacity = '0';
        this.overlayContent.description.style.opacity = '0';
        
        // Trigger reflow
        this.overlay.offsetHeight;
        
        if (this.preloadedImages[currentUnlock.image]) {
            // Image is preloaded, start animation immediately
            console.log('✅ Using preloaded image, starting animation immediately');
            this.overlayContent.image.style.opacity = '1';
            this.startContentAnimation();
        } else {
            // Image not preloaded (shouldn't happen, but fallback)
            console.log('⚠️ Image not preloaded, waiting for load...');
            this.overlayContent.image.onload = () => {
                console.log('✅ Image loaded, starting animation');
                this.overlayContent.image.style.opacity = '1';
                this.startContentAnimation();
            };
        }
    }

    handleOverlayClose() {
        // Stop particle animation
        if (this.overlayContent.particleSystem) {
            this.overlayContent.particleSystem.stop();
        }
        // Fade out overlay
        this.overlay.style.opacity = '0';
        // After fade completes, hide overlay and trigger gem event or navigate to URL
        setTimeout(() => {
            this.overlay.style.display = 'none';
            const currentUnlock = this.unlockConfig.unlocks[this.unlockState];
            
            // Check if this is the final unlock step
            const isFinalUnlock = this.unlockState === this.unlockConfig.unlocks.length - 1;
            
            if (isFinalUnlock) {
                // Final step: restart the demo by reloading the page
                console.log('Final unlock reached - restarting demo...');
                setTimeout(() => {
                    window.location.reload();
                }, 1000); // 1 second delay before restart
                return;
            }
            
            // Handle URL navigation if specified (for non-final steps)
            if (currentUnlock.url) {
                window.location.href = currentUnlock.url;
                return;
            }
            
            // Otherwise handle gem animation as before
            if (this.gemPlayer.spline) {
                this.gemPlayer.spline.setVariable(currentUnlock.callback, true);
                // --- NEW: Resume auto-rotation after unlock callback ---
                if (this.gemPlayer.rotationControl && typeof this.gemPlayer.rotationControl.resumeAutoRotationAfterSceneChange === 'function') {
                    setTimeout(() => {
                        this.gemPlayer.rotationControl.resumeAutoRotationAfterSceneChange();
                    }, 1000);
                }
                // Move to next unlock or remove button
                this.unlockState++;
                if (this.unlockState < this.unlockConfig.unlocks.length) {
                    // Create new button container for next unlock
                    this.createButtonContainer();
                    
                    // Use same delay for all unlocks
                    const delay = 500;
                    
                    setTimeout(() => {
                        this.fadeInButton();
                        this.animateMessageAndButton();
                    }, delay);
                }
            }
        }, 300);
    }

    createButtonContainer() {
        // Create button container
        this.buttonContainer = document.createElement('div');
        this.buttonContainer.classList.add('unlock-button-container');
        this.buttonContainer.style.transition = 'none';
        this.buttonContainer.style.opacity = '1';
        this.buttonContainer.style.display = 'flex';

        // Get dynamic font color from body element
        const bodyColor = getComputedStyle(document.body).color;
        const bodyBackground = getComputedStyle(document.body).backgroundColor;
        const buttonBackground = this.calculateButtonBackground(bodyBackground);

        // Create message element
        this.message = document.createElement('div');
        this.message.classList.add('unlock-message');
        this.message.innerHTML = this.unlockConfig.unlocks[this.unlockState].message;
        // Set initial hidden state BEFORE appending
        this.message.style.opacity = '0';
        this.message.style.transform = 'rotateY(90deg)';
        this.message.style.animation = 'none';
        // Apply dynamic font color from body element
        this.message.style.color = bodyColor;
        this.buttonContainer.appendChild(this.message);

        // Only create button if there's a buttonLabel
        const buttonLabel = this.unlockConfig.unlocks[this.unlockState].buttonLabel;
        if (buttonLabel && buttonLabel.trim() !== '') {
            // Create button element
            this.button = document.createElement('button');
            this.button.textContent = buttonLabel;
            this.button.classList.add('unlock-button');
            // Set initial hidden state BEFORE appending
            this.button.style.opacity = '0';
            this.button.style.animation = 'none';
            // Apply dynamic font color and background from body element
            this.button.style.color = bodyColor;
            this.button.style.backgroundColor = buttonBackground;
            // Add click handler
            this.button.addEventListener('click', () => {
                const currentUnlock = this.unlockConfig.unlocks[this.unlockState];
                
                // Check if this is the final unlock step
                const isFinalUnlock = this.unlockState === this.unlockConfig.unlocks.length - 1;
                
                if (isFinalUnlock) {
                    // Final step: restart the demo by reloading the page
                    console.log('Final unlock reached via button click - restarting demo...');
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000); // 1 second delay before restart
                    return;
                }
                
                // Handle URL navigation if specified (for non-final steps)
                if (currentUnlock.url) {
                    window.location.href = currentUnlock.url;
                    return;
                }
                
                // Mixpanel event tracking for every unlock
                if (typeof mixpanel !== 'undefined' && mixpanel.track) {
                    const eventName = `sophie${this.unlockState + 1}`;
                    mixpanel.track(eventName);
                }
                this.handleUnlock();
            });
            // Add button to container
            this.buttonContainer.appendChild(this.button);
        } else {
            // No button label, so no button element
            this.button = null;
        }
        
        // Add container to the gem player
        this.gemPlayer.appendChild(this.buttonContainer);
    }

    cleanup() {
        // Remove button container if it exists
        if (this.buttonContainer && this.buttonContainer.parentNode) {
            this.buttonContainer.parentNode.removeChild(this.buttonContainer);
            this.buttonContainer = null;
            this.button = null;
            this.message = null;
        }
        // Remove overlay if it exists
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
            this.overlay = null;
        }
        
        // Remove keyboard event listener
        document.removeEventListener('keydown', this.handleKeyDown);
    }

    // Helper function to get day suffix (1st, 2nd, 3rd, etc)
    getDaySuffix(day) {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
            case 1:  return "st";
            case 2:  return "nd";
            case 3:  return "rd";
            default: return "th";
        }
    }

    /**
     * Start the fade-in animation on all content elements
     */
    startContentAnimation() {
        this.overlayContent.heading.style.animation = `fade-in ${this.fadeInDuration} ease-out forwards`;
        this.overlayContent.imageContainer.style.animation = `fade-in ${this.fadeInDuration} ease-out forwards`;
        this.overlayContent.title.style.animation = `fade-in ${this.fadeInDuration} ease-out forwards`;
        this.overlayContent.description.style.animation = `fade-in ${this.fadeInDuration} ease-out forwards`;
    }



    /**
     * Calculate button background color based on page background brightness
     */
    calculateButtonBackground(bodyBackground) {
        // Parse RGB values from background color
        const rgbMatch = bodyBackground.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!rgbMatch) {
            return 'rgba(255, 255, 255, 0.2)'; // Fallback
        }
        
        const r = parseInt(rgbMatch[1]);
        const g = parseInt(rgbMatch[2]);
        const b = parseInt(rgbMatch[3]);
        
        // Calculate brightness (0-1)
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        
        // For dark backgrounds, use a lighter button background
        if (brightness < 0.5) {
            return 'rgba(255, 255, 255, 0.1)'; // Light background for dark pages
        } else {
            return 'rgba(0, 0, 0, 0.1)'; // Dark background for light pages
        }
    }

    /**
     * Handle keyboard navigation - right arrow key moves to next unlock
     */
    handleKeyDown(event) {
        // Only respond to right arrow key
        if (event.key === 'ArrowRight') {
            console.log('Right arrow pressed - checking unlock state...');
            console.log('Overlay visible:', this.overlay && this.overlay.style.display === 'block');
            console.log('Button container visible:', this.buttonContainer && this.buttonContainer.style.display === 'flex');
            console.log('Button exists:', !!this.button);
            console.log('Current unlock state:', this.unlockState);
            console.log('Total unlocks:', this.unlockConfig ? this.unlockConfig.unlocks.length : 'N/A');
            
            // Check if we're currently showing an overlay (unlock modal)
            if (this.overlay && this.overlay.style.display === 'block') {
                console.log('Closing overlay with keyboard...');
                // Close the current overlay to move to next unlock
                this.handleOverlayClose();
            } else if (this.buttonContainer && this.buttonContainer.style.display === 'flex') {
                // If button container is visible, trigger the unlock
                // This works whether there's a visible button or not
                console.log('Triggering unlock with keyboard...');
                
                // Check if this is the final unlock step
                const isFinalUnlock = this.unlockState === this.unlockConfig.unlocks.length - 1;
                
                if (isFinalUnlock) {
                    // Final step: restart the demo by reloading the page
                    console.log('Final unlock reached via keyboard - restarting demo...');
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000); // 1 second delay before restart
                } else {
                    // Normal unlock flow
                    this.handleUnlock();
                }
            } else {
                console.log('No action taken - neither overlay nor button is in actionable state');
            }
        }
    }
} 