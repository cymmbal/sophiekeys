// Import from local file instead of CDN
import { Application } from './runtime.js';
import { CameraViewModel } from './CameraViewModel.js';
import { GemViewModel } from './GemViewModel.js';
import { ViewState } from './ViewState.js';
import { ZoomControl } from './ZoomControl.js';
import { DriftControl } from './DriftControl.js';
import { RotationControl } from './RotationControl.js';
import { ThemeColor } from './ThemeColor.js';
import { ThemeContent } from './ThemeContent.js';
import { UnlockTest } from './UnlockTest.js';

/**
 * GemPlayer - Custom Element for embedding Gems
 * Usage: <gem-player url="path/to/file.gem"></gem-player>
 * Style with standard CSS: width, height, background-color
 */
export class GemPlayer extends HTMLElement {

    // Static constants
    static Constants = {

		// Responsive layout values

		// Breakpoint for mobile device properties to be applied when window width is less than this value
        MOBILE_WIDTH: 1024,
        
        // Distance of camera from origin (orbit radius) for desktop breakpoint
        DESKTOP_POSITION: 800,

		// Distance of camera from origin (orbit radius) for mobile breakpoint
        MOBILE_POSITION: 1000,

		// Maximum zoom value (magnification scale, e.g. 2 = 2x zoom)
		MAX_ZOOM: 2,

		// General timing values

		// Time to wait between when the scene starts and when the fade-in starts in milliseconds
        FADE_IN_DELAY: 1000,

		// Time to wait to commit browser resize to layout values in milliseconds
        DEBOUNCE_DELAY: 100,
        
		// General animation values
		
		// General easing amount (applied to linear interpolation of view state properties)
		EASING_AMOUNT: 0.15,
		
		// Min delta to target value to consider easing at rest
		EASING_THRESHOLD: 0.001,
        
		// RotationControl values

		// Sensitivity of rotation control amount to mouse movement
        ROTATION_SENSITIVITY: 1.0,

		// Vertical (up or down) limit on rotation control in degrees
        VERTICAL_ROTATION_LIMIT: 45,

		// Auto-rotation (of RotationControl) values

		// Delay from rotation control restitution to auto-orientation start in milliseconds
        AUTO_ORIENTATION_DELAY: 2000,

		// Duration of auto-orientation animation in milliseconds
        AUTO_ORIENTATION_DURATION: 1600,

		// Delay from app start or controls restitution to auto-rotation start in milliseconds
		AUTO_ROTATION_DELAY: 4500,

		// Speed of auto-rotation (if 0, auto-rotation is disabled)
		AUTO_ROTATION_SPEED: -0.0008,
		
		// Speed of auto-rotation for mobile devices (if 0, auto-rotation is disabled)
		MOBILE_AUTO_ROTATION_SPEED: -0.0016,

		// DriftControl values

		// Maximum rotation amount in all directions for drift contro, in degrees
		MAX_ROTATION_DRIFT: 8,

		// Whether to invert the direction of drift control
		INVERT_ROTATION_DRIFT: true,
    };
    
    // Define observed attributes
    static get observedAttributes() {
        return ['url', 'unlockables'];
    }
    
    constructor() {
        
        super();
        
        // Create scene object to store references
        this.scene = {
            all: null,
            camera: null,
            gem: null
        };
        
        // Canvas and Spline references
        this.canvas = null;
        this.spline = null;

		// Set up state models for views
        this.cameraViewModel = null;
		this.gemViewModel = null;

        // Control references
        this.zoomControl = null;
        this.driftControl = null;
        this.rotationControl = null;

        // Theme color control
        this.themeColor = new ThemeColor();

        // Theme content control
        this.themeContent = new ThemeContent();

        // Fade-in condition tracking
        this.safetyTimerComplete = false;
        this.sceneStarted = false;

        // Unlock test reference
        this.unlockTest = null;
    }
    
    // Called when the element is added to the document
    connectedCallback() {
        
        // Apply default styling to the element itself if not set
        if (!this.style.display) {
            this.style.display = 'block';
        }
        
        this.init();
        
        // Start safety timer for fade-in
        setTimeout(() => {
            this.safetyTimerComplete = true;
            this.checkFadeInConditions();
        }, GemPlayer.Constants.FADE_IN_DELAY);

        // Test call to handleSplineStart after 1 second
        setTimeout(() => {
            this.handleSplineStart();
        }, 1000);
    }
    
    // Clean up when element is removed
    disconnectedCallback() {
        
        // Clean up all controls
        this.cleanup();
        
        // Clean up unlock test
        if (this.unlockTest) {
            this.unlockTest.cleanup();
            this.unlockTest = null;
        }
    }
    
    // Called when attributes change
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        
        if (name === 'url' && this.spline) {
            // Reset conditions when URL changes
            this.safetyTimerComplete = false;
            this.sceneStarted = false;
            this.loadScene(newValue);
        } else if (name === 'unlockables') {
            this.handleUnlockablesChange(newValue);
        }
    }
    
    // Getter for url attribute
    get url() {
        return this.getAttribute('url');
    }
    
    /**
     * Check if both fade-in conditions are met, and fade in if they are
     */
    checkFadeInConditions() {
        
        if (this.safetyTimerComplete && this.sceneStarted) {
            // Both conditions met, fade in the scene
            if (this.canvas && !this.canvas.classList.contains('loaded')) {
                
                this.canvas.classList.add('loaded');
                
                // Dispatch loaded event
                this.dispatchEvent(new CustomEvent('sceneloaded', { 
                    bubbles: true,
                    composed: true
                }));
            }
        }
    }
    
    /**
     * Check if current device is mobile
     */
    isMobile() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }

    /**
     * Initialize all controls (zoom, drift, orbit)
     */
    initControls() {
		
        // Initialize zoom control first since it sets initial camera position
        this.zoomControl = new ZoomControl(this.cameraViewModel, {
            mobileWidth: GemPlayer.Constants.MOBILE_WIDTH,
            mobilePosition: GemPlayer.Constants.MOBILE_POSITION,
			maxZoon: GemPlayer.Constants.MAX_ZOOM,
            desktopPosition: GemPlayer.Constants.DESKTOP_POSITION,
            debounceDelay: GemPlayer.Constants.DEBOUNCE_DELAY
        });
        

        // Initialize drift control for camera orbit
        this.driftControl = new DriftControl(this.cameraViewModel, this.canvas, {
            maxRotationDrift: GemPlayer.Constants.MAX_ROTATION_DRIFT,
            invertRotationDrift: GemPlayer.Constants.INVERT_ROTATION_DRIFT
        });

        // Initialize rotation control
        this.rotationControl = new RotationControl(this.gemViewModel, this.canvas, {
            sensitivity: GemPlayer.Constants.ROTATION_SENSITIVITY,
            dragEasing: GemPlayer.Constants.EASING_AMOUNT,
            verticalLimit: GemPlayer.Constants.VERTICAL_ROTATION_LIMIT,
            threshold: GemPlayer.Constants.EASING_THRESHOLD,
            autoOrientationDelay: GemPlayer.Constants.AUTO_ORIENTATION_DELAY,
            autoOrientationDuration: GemPlayer.Constants.AUTO_ORIENTATION_DURATION,
			autoRotationDelay: GemPlayer.Constants.AUTO_ROTATION_DELAY,
			autoRotationSpeed: this.isMobile() ? GemPlayer.Constants.MOBILE_AUTO_ROTATION_SPEED : GemPlayer.Constants.AUTO_ROTATION_SPEED
        });

    }

    /**
     * Clean up all controls and timers
     */
    cleanup() {
		
        // Clean up zoom control
        if (this.zoomControl) {
            this.zoomControl.cleanup();
            this.zoomControl = null;
        }

        // Clean up drift control
        if (this.driftControl) {
            this.driftControl.cleanup();
            this.driftControl = null;
        }

        // Clean up rotation control
        if (this.rotationControl) {
            this.rotationControl.cleanup();
            this.rotationControl = null;
        }

        // Clean up theme color
        this.themeColor.cleanup();
        
        // Clean up theme content
        this.themeContent.cleanup();
        
        // Clean up Spline
        if (this.spline) {
            this.spline.dispose();
        }
    }

    /**
     * Update theme colors across the document
     */
    updateThemeColors() {
        // Get the computed background color from the gem-player element
        const bgColor = getComputedStyle(this).backgroundColor;
        
        // Update all colors through ThemeColor
        this.themeColor.setColor(bgColor);
        
        // Update content from attributes
        this.themeContent.updateContent(this);
    }

    /**
     * Initialize the player
     */
    async init() {
        // Create canvas element programmatically
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'canvas3d';
        this.canvas.classList.add('gem-canvas');
        
        // Style the canvas to fill the component
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.display = 'block';
        
        // Add canvas to the component's DOM
        this.appendChild(this.canvas);
        
        // Update theme colors
        this.updateThemeColors();
        
        // Set up Spline
        this.spline = new Application(this.canvas);
        
        // Disable built-in wheel controls
        if (this.spline.eventManager?.controlsManager) {
            if (this.spline.eventManager.controlsManager.orbitControls) {
                this.spline.eventManager.controlsManager.orbitControls.enabled = false;
            }
            if (this.spline.eventManager.controlsManager.panControls) {
                this.spline.eventManager.controlsManager.panControls.enabled = false;
            }
            // Disable wheel controls
            if (this.spline.eventManager.controlsManager.orbitControls) {
                this.spline.eventManager.controlsManager.orbitControls.enableZoom = false;
                this.spline.eventManager.controlsManager.orbitControls.enablePan = false;
                this.spline.eventManager.controlsManager.orbitControls.enableWheel = false;
            }
        }
        
        // Add event listener for 'start' event
        this.spline.addEventListener('start', () => this.handleSplineStart());
        
        // Gem URL
        const loadUrl = this.url;
        console.log(`Loading Gem file: ${loadUrl}`);
        
        // Load the scene
        await this.spline.load(loadUrl);
        
        // Get the computed background color from CSS
        const bgColor = getComputedStyle(this).backgroundColor;
        this.spline.setBackgroundColor(bgColor);
        
        // Store all objects in the Scene object
        this.scene.all = this.spline.getAllObjects();
        
        // Assign camera and gem references
        this.scene.camera = this.scene.all.find(obj => obj.name === 'camera');
        this.scene.gem = this.scene.all.find(obj => obj.name === 'gem');

        // Initialize camera view model
        if (this.scene.camera) {

            // Initialize camera view model with ViewState
            this.cameraViewModel = new CameraViewModel(
                this.scene.camera,
                new ViewState(
                    { x: 0, y: 0, z: GemPlayer.Constants.DESKTOP_POSITION },
                    { x: Math.PI/2, y: 0, z: 0 }
                ),
                GemPlayer.Constants.EASING_AMOUNT,
                GemPlayer.Constants.EASING_THRESHOLD
            );
        }

		// Initialize gem view model 
        if (this.scene.gem) {
            this.gemViewModel = new GemViewModel(
				this.scene.gem,
				new ViewState(
					{ x: 0, y: 0, z: 0 },
					{ x: 0, y: 0, z: 0 }
				),
				GemPlayer.Constants.EASING_AMOUNT,
				GemPlayer.Constants.EASING_THRESHOLD
			);
        }
		
        // Initialize all controls
        this.initControls();
        // Start initial auto-rotation if rotation control is initialized, after 1s delay
        if (this.rotationControl) {
            setTimeout(() => {
                this.rotationControl.startInitialAutoRotation();
            }, 1000);
        }
    }
    
    /**
     * Reload the scene with a new URL
     */
    async loadScene(url) {
        try {
            // Remove loaded class before reloading
            this.canvas.classList.remove('loaded');
            
            // Reset conditions when loading a new scene
            this.safetyTimerComplete = false;
            this.sceneStarted = false;
            
            // Clean up existing controls
            this.cleanup();
            
            // Update theme colors
            this.updateThemeColors();
            
            // Start a new safety timer
            setTimeout(() => {
                this.safetyTimerComplete = true;
                this.checkFadeInConditions();
            }, GemPlayer.Constants.FADE_IN_DELAY);
            
            console.log(`Loading Gem file: ${url}`);
            await this.spline.load(url);
            
            // Apply current background color from CSS
            const bgColor = getComputedStyle(this).backgroundColor;
            this.spline.setBackgroundColor(bgColor);
            
            // Re-initialize scene objects
            this.scene.all = this.spline.getAllObjects();
            this.scene.camera = this.scene.all.find(obj => obj.name === 'camera');
            this.scene.gem = this.scene.all.find(obj => obj.name === 'gem');
            
            // Re-initialize camera view model
            if (this.scene.camera) {
                this.cameraViewModel = new CameraViewModel(
                    this.scene.camera,
                    new ViewState(
                        { x: 0, y: 0, z: GemPlayer.Constants.DESKTOP_POSITION },
                        { x: Math.PI/2, y: 0, z: 0 }
                    ),
                    GemPlayer.Constants.EASING_AMOUNT,
                    GemPlayer.Constants.EASING_THRESHOLD
                );
            }

            // Re-initialize gem view model
            if (this.scene.gem) {
                this.gemViewModel = new GemViewModel(
                    this.scene.gem,
                    new ViewState(
                        { x: 0, y: 0, z: 0 },
                        { x: 0, y: 0, z: 0 }
                    ),
                    GemPlayer.Constants.EASING_AMOUNT,
                    GemPlayer.Constants.EASING_THRESHOLD
                );
            }
            
            // Re-initialize all controls
            this.initControls();
            
        } catch (error) {
            console.error('Error loading Gem file:', error);
        }
    }

    // Handle Spline start event
    handleSplineStart() {
        
        // Disable built-in orbit and pan controls
        if (this.spline.eventManager?.controlsManager) {
            if (this.spline.eventManager.controlsManager.orbitControls) {
                this.spline.eventManager.controlsManager.orbitControls.enabled = false;
            }
            if (this.spline.eventManager.controlsManager.panControls) {
                this.spline.eventManager.controlsManager.panControls.enabled = false;
            }
        }
        
        // Add 1-second safety buffer before starting auto-rotation
        setTimeout(() => {
            this.delayedSceneStart();
        }, 1000);
    }

    // Handle delayed spline start after safety buffer
    delayedSceneStart() {

		// Dispatch a custom event when the scene starts
		this.dispatchEvent(new CustomEvent('scenestart', { 
			bubbles: true,
			composed: true
		}));
		
		// Mark scene as started for fade-in condition
		this.sceneStarted = true;
		this.checkFadeInConditions();

        // Start initial auto-rotation if rotation control is initialized
        if (this.rotationControl) {
            this.rotationControl.startInitialAutoRotation();
        }
    }

    handleUnlockablesChange(value) {
        // Clean up existing unlock test if it exists
        if (this.unlockTest) {
            this.unlockTest.cleanup();
            this.unlockTest = null;
        }

        // Initialize new unlock test if attribute is present
        if (value !== null) {
            this.unlockTest = new UnlockTest(this);
        }
        // Resume auto-rotation after unlocks change, after 1s delay
        if (this.rotationControl) {
            setTimeout(() => {
                this.rotationControl.resumeAutoRotationAfterSceneChange();
            }, 1000);
        }
    }

    /**
     * Parse RGB or hex color string into object
     */
    parseRGB(color) {
        // Try RGB format first
        const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
            return {
                r: parseInt(rgbMatch[1]),
                g: parseInt(rgbMatch[2]),
                b: parseInt(rgbMatch[3])
            };
        }

        // Try hex format
        const hexMatch = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
        if (hexMatch) {
            return {
                r: parseInt(hexMatch[1], 16),
                g: parseInt(hexMatch[2], 16),
                b: parseInt(hexMatch[3], 16)
            };
        }

        console.warn('Failed to parse color:', color);
        return { r: 0, g: 0, b: 0 };
    }
}

// Register the custom element
customElements.define('gem-player', GemPlayer); 