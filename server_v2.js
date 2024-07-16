const express = require('express');
const fs = require('fs');
const { v2 } = require('@google-cloud/speech');
const recorder = require('node-record-lpcm16');

const app = express();

const speechClient = new v2.SpeechClient({
  keyFilename: 'key.json'
});

app.use(express.static('public'));

let recognizeStream = null;
let transcription = '';

app.post('/start-recording', (req, res) => {
  if (recognizeStream) {
    return res.status(400).send('Already recording');
  }

  const request = {
    // config: {
    //   encoding: 'LINEAR16',
    //   sampleRateHertz: 16000,
    //   //languageCode: 'ja',
    //   languageCode: 'en',
    //   //languageCode: 'nl-BE',
    //   //languageCode: 'en-US',
    // },
    // interimResults: true,
    // recognizer: 'projects/speech-project-427405/locations/global/recognizers/_', // Add recognizer field
    streaming_config: {
      config: {
        auto_decoding_config: {
          '@type': 'type.googleapis.com/google.cloud.speech.v2.AutoDetectDecodingConfig'
        },
        language_codes: ['en-US'],
        model: 'default',
      },
      interimResults: true,
    }
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
