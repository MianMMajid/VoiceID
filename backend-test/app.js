// Audio Recording State
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = null;
let timerInterval = null;
let audioContext = null;
let analyser = null;
let animationId = null;
let currentAudioBlob = null;

// DOM Elements
const recordBtn = document.getElementById('recordBtn');
const sendAudioBtn = document.getElementById('sendAudioBtn');
const createSessionBtn = document.getElementById('createSessionBtn');
const getResultBtn = document.getElementById('getResultBtn');
const audioFileInput = document.getElementById('audioFile');
const timer = document.getElementById('timer');
const visualizer = document.getElementById('visualizer');
const audioPreview = document.getElementById('audioPreview');
const fileName = document.getElementById('fileName');
const requestOutput = document.getElementById('requestOutput');
const responseOutput = document.getElementById('responseOutput');

// Session state
let currentSessionId = null;
let currentChallengePhrase = null;

// Helper function to toggle debug panel
window.toggleDebug = function() {
    const panel = document.getElementById('debugPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
};

// Helper function to enable a step
function enableStep(stepNumber) {
    const step = document.getElementById(`step${stepNumber}`);
    if (step) {
        step.classList.remove('disabled');
    }
}

// Helper function to show status in a specific element
function showStepStatus(elementId, message, type = 'info') {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<div class="status ${type}">${message}</div>`;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

function setupEventListeners() {
    createSessionBtn.addEventListener('click', createSession);
    recordBtn.addEventListener('click', toggleRecording);
    sendAudioBtn.addEventListener('click', submitAudio);
    getResultBtn.addEventListener('click', getResults);
    audioFileInput.addEventListener('change', handleFileUpload);
}

// Step 1: Create Session
async function createSession() {
    const apiUrl = document.getElementById('apiUrl').value;
    
    createSessionBtn.disabled = true;
    createSessionBtn.textContent = 'Creating...';
    
    try {
        const response = await fetch(`${apiUrl}/api/v1/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 'test-user-123' })
        });
        
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        
        requestOutput.textContent = JSON.stringify({
            method: 'POST',
            url: `${apiUrl}/api/v1/sessions`,
            body: { userId: 'test-user-123' }
        }, null, 2);
        
        responseOutput.textContent = JSON.stringify(data, null, 2);
        
        if (response.ok) {
            currentSessionId = data.sessionId;
            currentChallengePhrase = data.challengePhrase;
            
            // Update UI
            document.getElementById('displaySessionId').textContent = currentSessionId;
            document.getElementById('sessionInfo').style.display = 'block';
            document.getElementById('challengePhrase').textContent = currentChallengePhrase;
            
            createSessionBtn.textContent = '✓ Session Created';
            createSessionBtn.style.background = '#10b981';
            
            // Enable next steps
            enableStep(2);
            enableStep(3);
            
            console.log('✅ Session created:', currentSessionId);
            console.log('📝 Challenge phrase:', currentChallengePhrase);
        } else {
            throw new Error(data.message || 'Failed to create session');
        }
    } catch (error) {
        console.error('❌ Error creating session:', error);
        createSessionBtn.textContent = 'Create New Session';
        createSessionBtn.disabled = false;
        alert(`Error: ${error.message}`);
    }
}

// Recording Functions
async function toggleRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording();
    } else {
        await startRecording();
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100
            } 
        });
        
        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            currentAudioBlob = audioBlob;
            displayAudioPreview(audioBlob);
            sendAudioBtn.disabled = false;
            enableStep(4);
            
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
            
            console.log('✅ Recording saved:', (audioBlob.size / 1024).toFixed(2), 'KB');
        };
        
        mediaRecorder.start();
        recordingStartTime = Date.now();
        
        // Update UI
        recordBtn.textContent = '🛑 Stop Recording';
        recordBtn.classList.add('recording');
        startTimer();
        startVisualizer(stream);
        
        console.log('🎤 Recording started...');
    } catch (error) {
        alert(`Error accessing microphone: ${error.message}`);
        console.error('Recording error:', error);
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        recordBtn.textContent = '🎤 Start Recording';
        recordBtn.classList.remove('recording');
        stopTimer();
        stopVisualizer();
        console.log('🛑 Recording stopped');
    }
}

function startTimer() {
    timerInterval = setInterval(() => {
        const elapsed = Date.now() - recordingStartTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const displaySeconds = seconds % 60;
        timer.textContent = `${String(minutes).padStart(2, '0')}:${String(displaySeconds).padStart(2, '0')}`;
    }, 100);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function startVisualizer(stream) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;
    
    const canvas = visualizer;
    const canvasCtx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    function draw() {
        animationId = requestAnimationFrame(draw);
        
        analyser.getByteFrequencyData(dataArray);
        
        canvasCtx.fillStyle = '#f3f4f6';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            barHeight = (dataArray[i] / 255) * canvas.height;
            
            const gradient = canvasCtx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            
            canvasCtx.fillStyle = gradient;
            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
        }
    }
    
    draw();
}

function stopVisualizer() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    
    // Clear canvas
    const canvas = visualizer;
    const canvasCtx = canvas.getContext('2d');
    canvasCtx.fillStyle = '#f3f4f6';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
}

function displayAudioPreview(blob) {
    const url = URL.createObjectURL(blob);
    audioPreview.innerHTML = `
        <audio controls src="${url}"></audio>
        <p style="margin-top: 10px; color: #666; font-size: 14px;">
            Size: ${(blob.size / 1024).toFixed(2)} KB | Type: ${blob.type}
        </p>
    `;
}

// File Upload
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        currentAudioBlob = file;
        fileName.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
        fileName.style.display = 'block';
        displayAudioPreview(file);
        sendAudioBtn.disabled = false;
        enableStep(4);
        console.log(`📁 File selected: ${file.name}`);
    }
}

// Step 4: Submit Audio
async function submitAudio() {
    if (!currentAudioBlob) {
        alert('No audio to send. Please record or upload audio first.');
        return;
    }
    
    if (!currentSessionId) {
        alert('No session ID. Please create a session first.');
        return;
    }
    
    const apiUrl = document.getElementById('apiUrl').value;
    const url = `${apiUrl}/api/v1/sessions/${currentSessionId}/audio`;
    
    sendAudioBtn.disabled = true;
    sendAudioBtn.textContent = 'Uploading...';
    showStepStatus('uploadStatus', 'Uploading audio...', 'info');
    
    const formData = new FormData();
    formData.append('audio', currentAudioBlob, 'recording.webm');
    
    requestOutput.textContent = JSON.stringify({
        method: 'POST',
        url: url,
        body: 'FormData with audio file',
        size: `${(currentAudioBlob.size / 1024).toFixed(2)} KB`
    }, null, 2);
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        
        responseOutput.textContent = JSON.stringify(data, null, 2);
        
        if (response.ok) {
            sendAudioBtn.textContent = '✓ Audio Submitted';
            sendAudioBtn.style.background = '#10b981';
            showStepStatus('uploadStatus', '✅ Audio uploaded successfully! Processing...', 'success');
            
            document.getElementById('displayStatus').textContent = 'processing';
            
            // Enable results step
            enableStep(5);
            
            // Auto-check results after 3 seconds
            setTimeout(() => {
                showStepStatus('uploadStatus', '✅ Processing complete. Check results below!', 'success');
            }, 3000);
            
            console.log('✅ Audio submitted successfully');
        } else {
            throw new Error(data.message || 'Failed to submit audio');
        }
    } catch (error) {
        console.error('❌ Error submitting audio:', error);
        sendAudioBtn.textContent = '📤 Submit Audio';
        sendAudioBtn.disabled = false;
        showStepStatus('uploadStatus', `❌ Error: ${error.message}`, 'error');
    }
}

// Step 5: Get Results
async function getResults() {
    if (!currentSessionId) {
        alert('No session ID. Please create a session first.');
        return;
    }
    
    const apiUrl = document.getElementById('apiUrl').value;
    const url = `${apiUrl}/api/v1/sessions/${currentSessionId}/result`;
    
    getResultBtn.disabled = true;
    getResultBtn.textContent = 'Loading...';
    
    requestOutput.textContent = JSON.stringify({
        method: 'GET',
        url: url
    }, null, 2);
    
    try {
        const response = await fetch(url);
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        
        responseOutput.textContent = JSON.stringify(data, null, 2);
        
        const resultOutput = document.getElementById('resultOutput');
        resultOutput.style.display = 'block';
        
        if (response.status === 202) {
            // Still processing
            resultOutput.textContent = '⏳ Still processing... Please wait and try again.';
            getResultBtn.textContent = '🔍 Get Results';
            getResultBtn.disabled = false;
        } else if (response.ok) {
            // Format the results nicely
            const result = data.result;
            const verified = result.verified;
            
            resultOutput.innerHTML = `
                <div style="font-size: 18px; margin-bottom: 20px;">
                    <strong>Status:</strong> ${verified ? '✅ VERIFIED' : '❌ FAILED'}
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Confidence:</strong> ${(result.confidence * 100).toFixed(1)}%
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Liveness Check:</strong> ${result.checks.liveness.passed ? '✅' : '❌'} 
                    (Score: ${(result.checks.liveness.score * 100).toFixed(1)}%)
                    <br><small>${result.checks.liveness.details}</small>
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Synthetic Voice Check:</strong> ${result.checks.synthetic.passed ? '✅' : '❌'} 
                    (Score: ${(result.checks.synthetic.score * 100).toFixed(1)}%)
                    <br><small>${result.checks.synthetic.details}</small>
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Transcription Match:</strong> ${result.checks.transcription.passed ? '✅' : '❌'} 
                    (Similarity: ${(result.checks.transcription.similarity * 100).toFixed(1)}%)
                    <br><small>Expected: "${result.checks.transcription.expected}"</small>
                    <br><small>Got: "${result.checks.transcription.actual}"</small>
                </div>
                ${result.failureReason ? `<div style="color: #ef4444; margin-top: 20px;"><strong>Failure Reason:</strong> ${result.failureReason}</div>` : ''}
            `;
            
            document.getElementById('displayStatus').textContent = data.status;
            getResultBtn.textContent = '✓ Results Loaded';
            getResultBtn.style.background = verified ? '#10b981' : '#ef4444';
            
            console.log('✅ Results retrieved:', verified ? 'VERIFIED' : 'FAILED');
        } else {
            throw new Error(data.message || 'Failed to get results');
        }
    } catch (error) {
        console.error('❌ Error getting results:', error);
        getResultBtn.textContent = '🔍 Get Results';
        getResultBtn.disabled = false;
        alert(`Error: ${error.message}`);
    }
}

async function sendRequest() {
    const apiUrl = document.getElementById('apiUrl').value;
    const endpointValue = document.getElementById('endpoint').value;
    const sessionId = document.getElementById('sessionId').value;
    const authToken = document.getElementById('authToken').value;
    const requestBody = document.getElementById('requestBody').value;
    
    // Parse method and endpoint from value like "POST /api/v1/sessions"
    const parts = endpointValue.split(' ');
    const method = parts[0]; // GET or POST
    const endpoint = parts.slice(1).join(' '); // /api/v1/sessions
    
    // Build URL
    let url = apiUrl + endpoint;
    if (endpoint.includes('{id}') && sessionId) {
        url = url.replace('{id}', sessionId);
    }
    
    // Build headers
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (authToken) {
        headers['Authorization'] = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
    }
    
    // Build request options
    const options = {
        method: method,
        headers: headers
    };
    
    if (method === 'POST' && requestBody) {
        try {
            JSON.parse(requestBody); // Validate JSON
            options.body = requestBody;
        } catch (error) {
            showStatus('Invalid JSON in request body', 'error');
            return;
        }
    }
    
    // Display request
    requestOutput.textContent = JSON.stringify({
        method: method,
        url: url,
        headers: headers,
        body: options.body ? JSON.parse(options.body) : null
    }, null, 2);
    
    showStatus('Sending request...', 'info');
    
    try {
        const response = await fetch(url, options);
        
        // Get response text first, then try to parse as JSON
        const responseText = await response.text();
        let responseData;
        
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            responseData = { error: 'Invalid JSON response', rawResponse: responseText };
        }
        
        responseOutput.textContent = JSON.stringify({
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: responseData
        }, null, 2);
        
        if (response.ok) {
            showStatus('Request successful!', 'success');
            
            // Auto-fill session ID if this was a session creation
            if (endpoint.includes('sessions') && method === 'POST' && responseData.sessionId) {
                document.getElementById('sessionId').value = responseData.sessionId;
            }
        } else {
            showStatus(`Error: ${response.status} - ${responseData.message || response.statusText}`, 'error');
        }
    } catch (error) {
        showStatus(`Request failed: ${error.message}`, 'error');
        responseOutput.textContent = `Error: ${error.message}\n${error.stack}`;
    }
}

function showStatus(message, type) {
    statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`;
}
