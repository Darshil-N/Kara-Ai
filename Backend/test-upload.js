import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test the video upload endpoint
async function testVideoUpload() {
  try {
    // Create a dummy video file for testing
    const testVideoPath = path.join(__dirname, 'test-video.webm');
    const dummyData = Buffer.alloc(1024); // 1KB dummy data
    fs.writeFileSync(testVideoPath, dummyData);
    
    console.log('Created test video file:', testVideoPath);
    
    // Test the upload endpoint
    const formData = new FormData();
    const videoBlob = new Blob([dummyData], { type: 'video/webm' });
    formData.append('video', videoBlob, 'test-video.webm');
    formData.append('interviewId', 'test_interview_123');
    formData.append('questionNumber', '1');
    
    const response = await fetch('http://localhost:8080/api/interview/upload-video', {
      method: 'POST',
      body: formData,
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Upload successful:', result);
    } else {
      console.error('❌ Upload failed:', response.statusText);
    }
    
    // Clean up test file
    fs.unlinkSync(testVideoPath);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testVideoUpload();
