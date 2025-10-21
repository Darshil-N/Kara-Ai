import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import multer from "multer";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create videos folder if it doesn't exist
const videosDir = join(__dirname, 'videos');
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, videosDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const interviewId = req.body.interviewId || 'interview';
    cb(null, `${interviewId}_${timestamp}.webm`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// CORS for local dev
app.use(
  cors({
    origin: ["http://localhost:8080", "http://localhost:8081", "http://localhost:3000"],
    credentials: true
  })
);

// Webhook needs raw body
app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
    const signature = req.headers["stripe-signature"];

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.warn("STRIPE_WEBHOOK_SECRET not set; skipping signature verification.");
      return res.status(200).json({ received: true });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err?.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        console.log("Checkout completed:", session.id);
        // TODO: mark user as premium in your DB based on session.client_reference_id or customer email
        break;
      }
      default: {
        console.log(`Unhandled event type ${event.type}`);
      }
    }

    res.json({ received: true });
  }
);

// JSON parser for all other routes (must be after webhook raw handler)
app.use(express.json({ limit: '3mb' }));

// -------------------------------------------------------------
// Emotion Detection Python Service Integration
// -------------------------------------------------------------
let emotionProc = null;
let emotionReady = false;
let emotionDisabled = false;
let emotionDisabledReason = '';
const pendingResolvers = new Map(); // id -> {resolve, reject}
let idCounter = 0;
const modelPath = process.env.EMOTION_MODEL_PATH || join(__dirname, 'best.pt');

function startEmotionProcess() {
  if (emotionDisabled) return;
  // Check model presence once before spawning to avoid crash loop
  if (!fs.existsSync(modelPath)) {
    emotionDisabled = true;
    emotionDisabledReason = `Model file not found at ${modelPath}. Place best.pt there or set EMOTION_MODEL_PATH.`;
    console.warn('[emotion] Disabled:', emotionDisabledReason);
    return;
  }
  const pyPath = process.env.PYTHON_EXECUTABLE || 'python';
  const scriptPath = join(__dirname, 'emotion_service.py');
  emotionProc = spawn(pyPath, [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });

  emotionProc.on('error', (err) => {
    console.error('Failed to start emotion process. Set PYTHON_EXECUTABLE or install Python. Error:', err?.message);
    emotionProc = null;
    emotionReady = false;
    // Retry after delay (avoid rapid crash loop)
    setTimeout(() => {
      if (!emotionProc) startEmotionProcess();
    }, 10000);
  });

  emotionProc.stdout.setEncoding('utf8');
  let buffer = '';
  emotionProc.stdout.on('data', (data) => {
    buffer += data;
    let lines = buffer.split(/\r?\n/);
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      let parsed;
      try { parsed = JSON.parse(line); } catch { continue; }
      if (parsed.error && !parsed.id) {
        console.error('Emotion service error:', parsed.error);
        continue;
      }
      if (parsed.id && pendingResolvers.has(parsed.id)) {
        const { resolve } = pendingResolvers.get(parsed.id);
        pendingResolvers.delete(parsed.id);
        resolve(parsed);
      }
      emotionReady = true;
    }
  });

  emotionProc.stderr.on('data', d => {
    const msg = d.toString();
    if (msg.toLowerCase().includes('error')) {
      console.error('[emotion stderr]', msg);
    }
  });

  emotionProc.stdin.on('error', (e) => {
    console.error('[emotion stdin error]', e.message);
  });
  emotionProc.on('exit', (code) => {
    console.warn('Emotion process exited with code', code);
    emotionReady = false;
    if (emotionDisabled) return;
    // If model disappeared, disable; else retry
    if (!fs.existsSync(modelPath)) {
      emotionDisabled = true;
      emotionDisabledReason = `Model file missing after start at ${modelPath}.`;
      console.warn('[emotion] Disabled:', emotionDisabledReason);
      return;
    }
    setTimeout(() => startEmotionProcess(), 5000);
  });
}

startEmotionProcess();

function requestEmotionDetection(base64Image) {
  return new Promise((resolve, reject) => {
    if (emotionDisabled) {
      return resolve({ faces: [], dominantEmotion: null, error: emotionDisabledReason });
    }
    if (!emotionProc) {
      return resolve({ faces: [], dominantEmotion: null, error: 'Emotion process not started' });
    }
    const id = `req_${Date.now()}_${idCounter++}`;
    pendingResolvers.set(id, { resolve, reject });
    const payload = JSON.stringify({ id, image: base64Image }) + '\n';
    try {
      emotionProc.stdin.write(payload);
    } catch (e) {
      pendingResolvers.delete(id);
      resolve({ faces: [], dominantEmotion: null, error: e.message });
    }
    // Timeout safety
    setTimeout(() => {
      if (pendingResolvers.has(id)) {
        pendingResolvers.delete(id);
        resolve({ faces: [], dominantEmotion: null, error: 'Timeout' });
      }
    }, 6000);
  });
}

app.post('/api/emotion/frame', async (req, res) => {
  try {
    const { image } = req.body || {};
    if (!image) return res.status(400).json({ error: 'Missing image' });
    const result = await requestEmotionDetection(image);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/emotion/health', (_req, res) => {
  res.json({ process: !!emotionProc, ready: emotionReady, disabled: emotionDisabled, reason: emotionDisabledReason, modelPath });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

    const { priceId, plan } = req.body || {};
    const resolvedPriceId =
      priceId || (plan === "premium" ? process.env.STRIPE_PRICE_PREMIUM : undefined);

    if (!resolvedPriceId) {
      return res.status(400).json({ error: "Missing Stripe priceId" });
    }

    const clientUrl = process.env.CLIENT_URL || "http://localhost:8080";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: resolvedPriceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url: "http://localhost:8081/pricing?success=1",
      cancel_url: "http://localhost:8081/pricing?canceled=1",
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// Video upload endpoint
app.post("/api/interview/upload-video", upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file uploaded" });
    }

    const { interviewId, questionNumber, userId } = req.body;
    
    // Create a publicly accessible URL for the video
    const videoUrl = `http://localhost:8080/api/video/${req.file.filename}`;
    
    console.log(`Video uploaded successfully: ${req.file.filename}`);
    console.log(`Interview ID: ${interviewId}, Question: ${questionNumber}, User: ${userId}`);
    
    res.json({ 
      success: true, 
      filename: req.file.filename,
      path: req.file.path,
      videoUrl: videoUrl,
      interviewId,
      questionNumber,
      userId
    });
  } catch (error) {
    console.error("Error uploading video:", error);
    res.status(500).json({ error: "Failed to upload video" });
  }
});

// Serve video files
app.get("/api/video/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = join(videosDir, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Video not found" });
    }
    
    // Set appropriate headers for video streaming
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/webm',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/webm',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.error("Error serving video:", error);
    res.status(500).json({ error: "Failed to serve video" });
  }
});

// Get list of recorded videos
app.get("/api/interview/videos", (req, res) => {
  try {
    const files = fs.readdirSync(videosDir);
    const videos = files
      .filter(file => file.endsWith('.webm'))
      .map(file => {
        const stats = fs.statSync(join(videosDir, file));
        return {
          filename: file,
          size: stats.size,
          createdAt: stats.birthtime
        };
      });
    
    res.json({ videos });
  } catch (error) {
    console.error("Error reading videos directory:", error);
    res.status(500).json({ error: "Failed to read videos" });
  }
});

app.listen(port, () => {
  console.log(`Stripe test server running on http://localhost:${port}`);
});


