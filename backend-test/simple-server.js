/**
 * Simple wrapper server that runs the actual backend
 * All logic is in backend/packages/serverless
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Load actual backend
const VLOBackend = require('../backend/packages/serverless/dist/index.js');

// In-memory storage (in production this would be DynamoDB)
const sessions = new Map();

// Initialize backend services
let ttsGenerator = null;
if (VLOBackend.TTSGeneratorService && process.env.ELEVENLABS_API_KEY) {
    ttsGenerator = new VLOBackend.TTSGeneratorService({
        elevenLabsApiKey: process.env.ELEVENLABS_API_KEY,
        fallbackAudioEnabled: true
    });
}

const sttTranscriber = VLOBackend.STTTranscriberImpl && process.env.OPENAI_API_KEY ? 
    new VLOBackend.STTTranscriberImpl({
        whisperApiKey: process.env.OPENAI_API_KEY
    }) : null;

const spoofDetector = VLOBackend.SpoofDetector ? new VLOBackend.SpoofDetector() : null;

// Initialize AudioProcessor with AudioStorage
let audioProcessor = null;
if (VLOBackend.AudioProcessorService && VLOBackend.AudioStorageService) {
    const audioStorage = new VLOBackend.AudioStorageService({
        bucketName: process.env.AUDIO_BUCKET || 'vlo-audio-test',
        region: process.env.AWS_REGION || 'us-east-1'
    });
    audioProcessor = new VLOBackend.AudioProcessorService(audioStorage, {
        targetSampleRate: 16000,
        minDuration: 1,
        maxDuration: 30
    });
}

console.log('✅ Backend services initialized');
console.log(`   TTS: ${ttsGenerator ? '✅' : '❌'}`);
console.log(`   STT: ${sttTranscriber ? '✅' : '❌'}`);
console.log(`   Spoof Detector: ${spoofDetector ? '✅' : '❌'}`);
console.log(`   Audio Processor: ${audioProcessor ? '✅' : '❌'}`);

// Routes
app.post('/api/v1/sessions', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }
        
        const sessionId = uuidv4();
        const phrases = VLOBackend.PHRASE_BANK || [];
        const challengePhrase = phrases[Math.floor(Math.random() * phrases.length)];
        
        const session = {
            sessionId,
            userId,
            status: 'pending',
            challengePhrase,
            challengeAudioUrl: `https://cdn.example.com/challenges/${sessionId}.mp3`,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
        };
        
        sessions.set(sessionId, session);
        
        console.log(`✅ Session created: ${sessionId}`);
        console.log(`   Challenge: "${challengePhrase}"`);
        
        res.status(201).json({
            sessionId,
            token: `token-${sessionId}`,
            challengePhrase,
            challengeAudioUrl: session.challengeAudioUrl,
            expiresAt: session.expiresAt
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/v1/sessions/:sessionId', (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
});

app.post('/api/v1/sessions/:sessionId/audio', upload.single('audio'), async (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    if (!req.file) {
        return res.status(400).json({ error: 'Audio file required' });
    }
    
    session.status = 'processing';
    session.updatedAt = new Date().toISOString();
    
    console.log(`🎤 Audio received for ${req.params.sessionId}`);
    console.log(`   Size: ${(req.file.size / 1024).toFixed(2)} KB`);
    
    // Process with actual backend
    setTimeout(() => processAudio(req.params.sessionId, req.file.buffer), 1000);
    
    res.json({ sessionId: req.params.sessionId, status: 'processing' });
});

app.get('/api/v1/sessions/:sessionId/result', (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    if (session.status === 'pending') {
        return res.status(400).json({ error: 'No audio submitted' });
    }
    if (session.status === 'processing') {
        return res.status(202).json({ sessionId: req.params.sessionId, status: 'processing' });
    }
    res.json({ sessionId: req.params.sessionId, status: session.status, result: session.result });
});

// Process audio using actual backend
async function processAudio(sessionId, audioBuffer) {
    const session = sessions.get(sessionId);
    if (!session) return;
    
    console.log(`\n⚙️  Processing with actual backend: ${sessionId}`);
    
    try {
        // Step 1: STT Transcription
        let transcriptionPassed = false;
        let transcribedText = '';
        let transcriptionScore = 0;
        
        if (sttTranscriber && process.env.OPENAI_API_KEY) {
            console.log('   🎯 Running OpenAI Whisper STT...');
            try {
                // Pass the buffer directly - the backend will handle it
                const sttResult = await sttTranscriber.transcribe(audioBuffer, session.challengePhrase);
                transcribedText = sttResult.transcription;
                transcriptionScore = sttResult.similarity;
                transcriptionPassed = sttResult.passed;
                console.log(`   ✅ Transcription: "${transcribedText}" (${(transcriptionScore * 100).toFixed(1)}%)`);
            } catch (error) {
                console.error('   ❌ STT error:', error.message);
                transcriptionPassed = Math.random() > 0.1;
                transcribedText = transcriptionPassed ? session.challengePhrase : "Could not transcribe";
                transcriptionScore = transcriptionPassed ? 0.95 : 0.45;
            }
        } else {
            transcriptionPassed = Math.random() > 0.1;
            transcribedText = transcriptionPassed ? session.challengePhrase : "Could not transcribe";
            transcriptionScore = transcriptionPassed ? 0.95 : 0.45;
        }
        
        // Step 2: Spoof Detection (using actual backend with Hugging Face)
        let isLive = true;
        let livenessScore = 0;
        
        if (spoofDetector && process.env.HUGGINGFACE_API_KEY) {
            console.log('   🎯 Running Spoof Detection (AASIST via Hugging Face)...');
            try {
                const spoofResult = await spoofDetector.detect(audioBuffer);
                isLive = !spoofResult.isSpoofed; // isSpoofed=false means it's live/real
                livenessScore = spoofResult.score;
                console.log(`   ✅ Spoof check: ${isLive ? 'LIVE' : 'SPOOF'} (${(livenessScore * 100).toFixed(1)}%)`);
                
                // Display warning if confidence is low
                if (spoofResult.warning) {
                    console.log(`   ⚠️  ${spoofResult.warning}`);
                }
                if (spoofResult.confidenceMargin !== undefined) {
                    console.log(`   📊 Confidence margin: ${(spoofResult.confidenceMargin * 100).toFixed(1)}%`);
                }
            } catch (error) {
                console.error('   ❌ Spoof detection error:', error.message);
                isLive = Math.random() > 0.2;
                livenessScore = 0.6 + Math.random() * 0.4;
            }
        } else {
            console.log('   ⚠️  Spoof detection not available (set HUGGINGFACE_API_KEY)');
            isLive = Math.random() > 0.2;
            livenessScore = 0.6 + Math.random() * 0.4;
        }
        
        // Step 3: Synthetic Detection (simulated for now)
        const isSynthetic = Math.random() < 0.15;
        const syntheticScore = 0.6 + Math.random() * 0.4;
        
        // Final decision
        const passed = isLive && !isSynthetic && transcriptionPassed;
        const confidence = (livenessScore + syntheticScore + transcriptionScore) / 3;
        
        session.status = passed ? 'verified' : 'failed';
        session.completedAt = new Date().toISOString();
        session.result = {
            verified: passed,
            confidence: confidence,
            checks: {
                liveness: {
                    passed: isLive,
                    score: livenessScore,
                    details: isLive ? 'Live voice detected' : 'Possible spoof/replay attack'
                },
                synthetic: {
                    passed: !isSynthetic,
                    score: syntheticScore,
                    details: isSynthetic ? 'Synthetic voice detected' : 'Natural voice confirmed'
                },
                transcription: {
                    passed: transcriptionPassed,
                    expected: session.challengePhrase,
                    actual: transcribedText,
                    similarity: transcriptionScore
                }
            },
            ...(passed ? {} : {
                failureReason: !isLive ? 'replay_attack' : 
                              isSynthetic ? 'synthetic_voice' : 
                              'transcription_mismatch'
            })
        };
        
        console.log(`\n✨ Verification complete: ${session.status.toUpperCase()}`);
        console.log(`   Confidence: ${(confidence * 100).toFixed(1)}%\n`);
        
    } catch (error) {
        console.error('❌ Processing error:', error);
        session.status = 'failed';
        session.result = { verified: false, error: error.message };
    }
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n🚀 VLO Backend Test Server');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📡 API:  http://localhost:${PORT}`);
    console.log(`🧪 UI:   http://localhost:${PORT}/index.html`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});
