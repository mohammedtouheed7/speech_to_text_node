const express = require('express');
const rateLimit = require('express-rate-limit');
const startRecordingRateLimit = require('./rateLimitMiddleware'); // Import your rate limit middleware
const fs = require('fs');
const { SpeechClient } = require('@google-cloud/speech');
const recorder = require('node-record-lpcm16');
const cors = require('cors');

const app = express();

const clientEmail = "myservices@speech-project-427405.iam.gserviceaccount.com";
// const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
console.log("clientEmail: "+clientEmail);

// const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
//console.log("clientEmail: "+clientEmail);

const privateKey = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDj7DYWsSs7a10C\n3LCA25FZeJKOzMu9A+V7gjvUmERr5rEFrZbaQfDyttq/an09MG5ataVcBavZd2JY\nnV/yCbyHxKZrdYdSgMNm3NF8NE87mAtwzvxa6Lwrk4d8VCKA9dARJX4+2ZofihBw\nkBfS2nFY3qIlH4PoT+xetNrGBp3RAdOgRFJrqgvSDvc/KGuqsq4skrAX9mpJTaKh\n9HCrH0L0AVocCGy3yLEHJDk6c94TcQor+0ySY8D+Dl7iXaGOIZROq2vZVyZBlAyH\nFmS9qKdeYD2wgAJ9oOrgVtqIDDJbplEyfDbB/ImOQ+fVgNQh1SWJ78rictv4Jfrr\nfB3bl6H1AgMBAAECggEAY1l4bkXF+X2gKno2OcT7w4tKHxLoEDkdk8u99rp0wK/r\nI/V51yN9Ot831M4/TyfIQqQBM26JbR6b8NKQmvlhg7DVdeviE7Vq93Bzo/dNPkXV\nXtPqrlnahAgnu6sU6y+7BW5ZbF3/z5Wn+tjkeZWcaMeK2DG3ltEX0GR3JHCH5C1c\nEKQWxbyhdNQHf4xdtFsLMx1XHHj5fuNELaAdI6sABUDl+SXSP7D6lvi0b8OjUjvn\npkqz2TAr9h/xTuXEy05avsA5NC8pIiPMjyRijdO2Sr2vw07bwumWDGIVNWf7bhpc\nOzaLlzaHWKIiH0DGXcMjofIPHFi/BcV+GtJ1mnnKVQKBgQDz21tpUEDldWeQmzZk\nEczzUQIcoZTSqD0nvfP1k62zX6VuGIbNFtfhpD8rXP4B5nPyaCQrFtIZsaeoU42o\nKxEUHZ5wW2upFa9xHYf700Gm4kXM4zM45d114WzeFyXlUubZxW7iDZhZQFGXnyN8\ny6riiDhMknz6s7C2F2UsRRoSBwKBgQDvRbp4DT+FwHYlbqKlvcsuadJsGw4QQC0M\nYTd86aZPdWFZukH+f5EAWg5hY9Xzx/uY6i7X9uU54JHXJJVZ/XV6KynSD0nLtyBv\nnlksRaLIQchiuUG4M2knSGoFaC/7oM6AL2G9bfsMdRzK4aBrqkf3GBG5ohMwePVP\nb5m7Ooi9IwKBgQCS0rkoIITiYxz3CSzndXxD57twx6zWZStlGU6gxsjn3ie5sRTA\nuQdEOWM7VaMuO7YF9sQIGZZol/mNNLluznda+DZkCfc5d/AJGDG+4sR9mXFTWlyF\n3ojHp/GniqJrf820wtXvTyYyXrKBqvRv+CSsfj3/hJexTq2QBWgKDpUS0wKBgEkM\nWKleIg6Le4ZiCHXhQ66f0AYBHIIJlbc51t7j1kpb46SpIIy6FWKuG8XP3PnYDA/b\nLwHv9nt8/Alaud4Ha14o31OqJzVyawyoo0DI4bGRo8PAGzhJOcksanHMJRoFNgYc\ncRKMCSD8gBXQXFGCYwYk6wRpXsJlqz7dK2nlrOlRAoGAHgMsFfuw3xw+r+wOr4F7\nFr9QmFqwA3Ve9qjtaFWiZCwmV/l+jBjP6gBJSWux6BjZKLQP/LG2VZA/A62ISRXv\nGKGoTHwwHsY1yne7S59+cUCKxTRoH6M00IupvMkRuEx+OMtf/5KGEiL9t/8JhWAB\n+bkKDY+9yDPSziIhDB/ELrI=\n-----END PRIVATE KEY-----\n";
console.log("private: "+privateKey);
const speechClient = new SpeechClient({
  //keyFilename: filePath5
  credentials: {
    client_email: clientEmail,
    private_key: privateKey
  },
});
// const speechClient = new SpeechClient({
//   keyFilename: 'key.json'
// });
app.use(cors()); // Enable CORS for all routes
app.use(express.json());
app.use(express.static('public'));


let recognizeStream = null;
let transcription = '';

app.post('/start-recording',startRecordingRateLimit, (req, res) => {
  if (recognizeStream) {
    return res.status(400).send('Already recording');
  }

  const request = {
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      //languageCode: 'ja',
      languageCode: 'en',
      //languageCode: 'nl-BE',
      //languageCode: 'en-US',
    },
    interimResults: true,
  };

  recognizeStream = speechClient
    .streamingRecognize(request)
    .on('error', err => {
      console.error('Error with Speech API streaming:', err);
      recognizeStream.end(); // End the stream on error
      res.status(500).send('Speech API streaming error');
    })
 .on('data', data => {
  if (data.results[0] && data.results[0].alternatives[0]) {
    if (data.results[0].isFinal) {
      transcription += data.results[0].alternatives[0].transcript + ' ';
      app.locals.interimTranscription = ''; // Clear interim transcription on final result
    } else {
      // Emit interim results for live update
      app.locals.interimTranscription = transcription + data.results[0].alternatives[0].transcript;
    }
  }
});

  recorder
    .record({
      sampleRateHertz: 16000,
      threshold: 0,
      verbose: false,
      recordProgram: 'rec', // or 'sox'
      silence: '5.0',
    })
    .stream()
    .on('error', err => {
      console.error('Error with recording:', err);
      recognizeStream.end(); // End the stream on error
      res.status(500).send('Recording error');
    })
    .pipe(recognizeStream);

  res.sendStatus(200);
});

app.get('/poll-interim', (req, res) => {
    res.json({ interimTranscription: app.locals.interimTranscription || transcription });
  });

  app.post('/stop-recording', (req, res) => {
    if (!recognizeStream) {
      return res.status(400).send('Not recording');
    }
  
    recognizeStream.end();
    const finalTranscription = transcription.trim();
    res.json({ transcription: finalTranscription });
  
    recognizeStream = null;
    transcription = '';
    app.locals.interimTranscription = ''; // Reset interim transcription
  });

  

const PORT = process.env.PORT || 3009;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
