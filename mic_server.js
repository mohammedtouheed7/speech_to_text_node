const express = require('express');
const { SpeechClient } = require('@google-cloud/speech');
const mic = require('mic');

const app = express();
const speechClient = new SpeechClient({
  keyFilename: 'key.json'
});

app.use(express.static('public'));

let recognizeStream = null;
let transcription = '';
let micInstance = null;

app.post('/start-recording', (req, res) => {
  if (recognizeStream) {
    return res.status(400).send('Already recording');
  }

  const request = {
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      // languageCode: 'en-US',
      languageCode: 'en',
    },
    interimResults: true,
  };

  transcription = ''; // Clear previous transcription

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

  micInstance = mic({
    rate: '16000',
    channels: '1',
    debug: false,
    exitOnSilence: 5,
  });

  const micInputStream = micInstance.getAudioStream();

  micInputStream.on('error', err => {
    console.error('Error in mic input stream:', err);
  });

  micInputStream.pipe(recognizeStream);

  micInstance.start();
  res.sendStatus(200);
});

app.post('/stop-recording', (req, res) => {
  if (!recognizeStream) {
    return res.status(400).send('Not recording');
  }

  micInstance.stop();
  recognizeStream.end();
  const finalTranscription = transcription.trim();
  res.json({ transcription: finalTranscription });

  recognizeStream = null;
  transcription = '';
  app.locals.interimTranscription = ''; // Reset interim transcription
});

app.get('/poll-interim', (req, res) => {
  res.json({ interimTranscription: app.locals.interimTranscription || transcription });
});

const PORT = process.env.PORT || 3009;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
