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
        
        // --- Initial Message Overlay Logic ---
        this.initialMessageShown = false;
        this.initialMessageContainer = null;
        this.initialMessageFadeTimeout = null;
        this.unlockSequenceStarted = false;

        // Show initial message after 1000ms delay
        setTimeout(() => {
            this.showInitialMessage();
        }, 1000);

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

            // Preload all unlock images and store references
            this.unlockConfig.unlocks.forEach(unlock => {
                const img = new Image();
                img.onload = () => {
                    this.preloadedImages[unlock.image] = img;
                };
                img.src = unlock.image;
            });

            // Create overlay
            this.createOverlay();

            const canvas = this.gemPlayer.querySelector('canvas');
            // Listen for user interaction with the spline scene (rotationstart on canvas)
            if (canvas) {
                this._handleFirstInteraction = () => {
                    if (!this.initialMessageShown || this.unlockSequenceStarted) return;
                    this.unlockSequenceStarted = true;
                    this.fadeOutInitialMessage();
                    // After fade out (350ms), wait 2s, then start unlock sequence
                    setTimeout(() => {
                        this.startUnlockSequence();
                    }, 2350); // 350ms fade + 2000ms wait
                    canvas.removeEventListener('rotationstart', this._handleFirstInteraction);
                };
                canvas.addEventListener('rotationstart', this._handleFirstInteraction);
            }
        } catch (error) {
            console.error('Error loading unlock configuration:', error);
        }
    }

    showInitialMessage() {
        if (this.initialMessageShown) return;
        this.initialMessageShown = true;
        // Create container styled like unlock overlay
        this.initialMessageContainer = document.createElement('div');
        this.initialMessageContainer.classList.add('unlock-button-container');
        this.initialMessageContainer.style.opacity = '0';
        this.initialMessageContainer.style.display = 'flex';
        // Get dynamic font color from body element
        const bodyColor = getComputedStyle(document.body).color;
        
        // Message element
        const msg = document.createElement('div');
        msg.classList.add('unlock-message');
        msg.innerHTML = "Gems are interactive. Try <b><i>dragging</i></b> this one around.";
        // Apply dynamic font color from body element
        msg.style.color = bodyColor;
        this.initialMessageContainer.appendChild(msg);
        // Add to gem player
        this.gemPlayer.appendChild(this.initialMessageContainer);
        // Fade in with longer delay and animation
        setTimeout(() => {
            this.initialMessageContainer.style.transition = 'opacity 1.0s ease';
            this.initialMessageContainer.style.opacity = '1';
            msg.style.animation = 'flip-in-y 4s ease-in-out forwards';
        }, 2000);
    }

    fadeOutInitialMessage() {
        if (!this.initialMessageContainer) return;
        this.initialMessageContainer.style.transition = 'opacity 0.35s ease';
        this.initialMessageContainer.style.opacity = '0';
        // Remove from DOM after fade
        setTimeout(() => {
            if (this.initialMessageContainer && this.initialMessageContainer.parentNode) {
                this.initialMessageContainer.parentNode.removeChild(this.initialMessageContainer);
                this.initialMessageContainer = null;
            }
        }, 350);
    }

    // Helper to animate message and button in sequence (not for initial message)
    animateMessageAndButton() {
        if (!this.message || !this.button) return;
        // Reset animations
        this.message.style.animation = 'none';
        this.button.style.animation = 'none';
        // Animate message after 1s
        setTimeout(() => {
            this.message.style.animation = 'flip-in-y 4s ease-in-out forwards';
            // Animate button after message animation (4s)
            setTimeout(() => {
                this.button.style.animation = 'fade-in 1s ease-out forwards';
            }, 4000);
        }, 1000);
    }

    startUnlockSequence() {
        // Always show unlock message automatically after initial message fades out
        this.createButtonContainer();
        setTimeout(() => {
            this.fadeInButton();
            this.animateMessageAndButton();
        }, 500);
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

            this.button.style.opacity = '0';
            this.button.style.animation = 'none';

            // --- Force reflow ---
            void this.message.offsetWidth;
            void this.button.offsetWidth;

            // --- Start message animation ---
            this.message.style.animation = 'flip-in-y 4s ease-in-out forwards';

            // --- Start button animation after 4s ---
            setTimeout(() => {
                this.button.style.animation = 'fade-in 1s ease-out forwards';
            }, 4000);
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
        image.src = this.unlockConfig.unlocks[this.unlockState].image;
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
        if (title.includes("concert on")) {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const month = yesterday.toLocaleString('en-US', { month: 'long' });
            const day = yesterday.getDate();
            const suffix = this.getDaySuffix(day);
            title = title.replace(/on [A-Za-z]+ \d+(?:st|nd|rd|th)/, `on ${month} ${day}${suffix}`);
        }
        this.overlayContent.title.textContent = title;
        
        // Update description based on unlock type
        this.overlayContent.description.textContent = currentUnlock.url ? "Tap to visit" : currentUnlock.description;
        
        // Use preloaded image if available
        if (this.preloadedImages[currentUnlock.image]) {
            this.overlayContent.image.src = this.preloadedImages[currentUnlock.image].src;
            // Show immediately since it's already loaded
            this.overlayContent.image.style.opacity = '1';
            // Reset animation to ensure it starts from the beginning
            this.overlayContent.imageContainer.style.animation = 'none';
            this.overlayContent.imageContainer.offsetHeight; // Trigger reflow
            this.overlayContent.imageContainer.style.animation = 'sway 8s ease-in-out infinite';
            // Start particle animation
            if (this.overlayContent.particleSystem) {
                this.overlayContent.particleSystem.start();
            }
        } else {
            // Fallback to original behavior if preloaded image not ready
            this.overlayContent.image.src = currentUnlock.image;
            this.overlayContent.image.alt = currentUnlock.title;
            
            // Fade in the image after it loads
            this.overlayContent.image.onload = () => {
                this.overlayContent.image.style.opacity = '1';
                // Reset animation to ensure it starts from the beginning
                this.overlayContent.imageContainer.style.animation = 'none';
                this.overlayContent.imageContainer.offsetHeight; // Trigger reflow
                this.overlayContent.imageContainer.style.animation = 'sway 8s ease-in-out infinite';
                // Start particle animation
                if (this.overlayContent.particleSystem) {
                    this.overlayContent.particleSystem.start();
                }
            };
        }
    }

    handleUnlock() {
        // Update overlay content based on current state
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
        
        // Show overlay
        this.overlay.style.display = 'block';
        // Trigger reflow
        this.overlay.offsetHeight;
        this.overlay.style.opacity = '1';
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
            // Handle URL navigation if specified
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
                    
                    // Check if this is the final unlock (last one in the array)
                    const isFinalUnlock = this.unlockState === this.unlockConfig.unlocks.length - 1;
                    
                    // Use longer delay for final unlock, normal delay for others
                    const delay = isFinalUnlock ? 8000 : 500;
                    
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

        // Create button element
        this.button = document.createElement('button');
        this.button.textContent = this.unlockConfig.unlocks[this.unlockState].buttonLabel;
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
            // Handle URL navigation immediately if specified
            if (currentUnlock.url) {
                window.location.href = currentUnlock.url;
                return;
            }
            // Mixpanel event tracking for every unlock
            if (typeof mixpanel !== 'undefined' && mixpanel.track) {
                const eventName = `buttonclick${this.unlockState + 1}`;
                mixpanel.track(eventName);
            }
            this.handleUnlock();
        });
        // Add button to container
        this.buttonContainer.appendChild(this.button);
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
} 