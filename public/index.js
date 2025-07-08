// Import GemPlayer class to ensure it's registered
import './js/GemPlayer.js';

// No need for additional initialization, the custom element handles everything
document.addEventListener('DOMContentLoaded', () => {
    
    // Add event listeners to track the gem-player element events
    const player = document.querySelector('gem-player');
    
    if (player) {
        // Log when the scene starts loading
        player.addEventListener('scenestart', () => {
            //
        });
        
        // Log when the scene is fully loaded and faded in
        player.addEventListener('sceneloaded', () => {
            //
        });
        
        // Log any errors
        player.addEventListener('sceneerror', (event) => {
            //
        });
    }
}); 