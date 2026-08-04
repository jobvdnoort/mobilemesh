// app.js
document.addEventListener('DOMContentLoaded', () => {
    const cameraStream = document.getElementById('cameraStream');
    const requestPermissionsBtn = document.getElementById('requestPermissions');
    const startRecordingBtn = document.getElementById('startRecording');
    const stopAndUploadBtn = document.getElementById('stopAndUpload');
    const frameCounter = document.getElementById('frameCounter');

    let stream;
    let mediaRecorder;
    let recordedChunks = [];
    let framesCaptured = 0;

    requestPermissionsBtn.addEventListener('click', async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            cameraStream.srcObject = stream;
            startRecordingBtn.disabled = false;

            if (navigator.geolocation) {
                navigator.geolocation.requestPermission().then(response => {
                    if (response === 'granted') {
                        // Permission granted
                    }
                });
            }

            if (window.DeviceOrientationEvent && window.DeviceOrientationEvent.requestPermission) {
                window.DeviceOrientationEvent.requestPermission().then(response => {
                    if (response === 'granted') {
                        // Permission granted
                    }
                });
            }
        } catch (error) {
            alert('Camera access denied. Please allow camera permissions.');
        }
    });

    startRecordingBtn.addEventListener('click', () => {
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = event => recordedChunks.push(event.data);
        mediaRecorder.onstop = () => handleStop();
        mediaRecorder.start(1000); // Capture 1 frame per second
        stopAndUploadBtn.disabled = false;
    });

    stopAndUploadBtn.addEventListener('click', () => {
        mediaRecorder.stop();
    });

    async function handleStop() {
        const blob = new Blob(recordedChunks, { type: 'video/mp4' });
        recordedChunks = [];
        framesCaptured = 0;

        try {
            const zip = new JSZip();
            for (let i = 0; i < blob.size; i++) {
                const frameBlob = await getFrameAsBlob(blob, i);
                zip.file(`frame_${i}.jpg`, frameBlob);
            }

            const metadata = {
                frames: recordedChunks.length,
                timestamp: new Date().toISOString()
            };
            zip.file('metadata.json', JSON.stringify(metadata));

            const content = await zip.generateAsync({ type: 'blob' });
            const formData = new FormData();
            formData.append('file', content, 'scan_data.zip');

            try {
                const response = await fetch('https://api.yourbackend.com/upload-scan', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    alert('Data uploaded successfully!');
                } else {
                    alert('Failed to upload data.');
                }
            } catch (error) {
                console.error('Error uploading data:', error);
                alert('An error occurred while uploading the data.');
            }
        } catch (error) {
            console.error('Error processing frames:', error);
            alert('An error occurred while processing the frames.');
        }
    }

    async function getFrameAsBlob(blob, index) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob.slice(index * 1024, (index + 1) * 1024));
        });
    }
});