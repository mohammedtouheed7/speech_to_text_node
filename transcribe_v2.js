const recorder = require('node-record-lpcm16');
//const speech = require('@google-cloud/speech');
const { v2 } = require('@google-cloud/speech');
const fs = require('fs');


const client = new v2.SpeechClient({
    keyFilename: 'key.json'
  });

// Configure the request
const encoding = 'LINEAR16';
const sampleRateHertz = 16000;
const languageCode = 'en-US';

const request = {
    recognizer: 'projects/speech-project-427405/locations/global/recognizers/_', // Add recognizer field
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
//   config: {
//     encoding: encoding,
//     sampleRateHertz: sampleRateHertz,
//     languageCode: languageCode,
//   },
  //interimResults: false, // If you want interim results, set this to true
};

// Create a recognize stream
const recognizeStream = client
  .streamingRecognize(request)
  .on('error', console.error)
  .on('data', data =>
    process.stdout.write(
      data.results[0] && data.results[0].alternatives[0]
        ? `Transcription: ${data.results[0].alternatives[0].transcript}\n`
        : '\n\nReached transcription time limit, press Ctrl+C\n'
    )
  );

// Start recording and send the microphone input to the Speech API
const recording = recorder
  .record({
    sampleRateHertz: sampleRateHertz,
    threshold: 0,
    verbose: false,
    recordProgram: 'rec', // Try also "arecord" or "sox"
    silence: '5.0',
  })
  .stream()
  .on('error', console.error)
  .pipe(recognizeStream);

// Stop recording after 60 seconds
setTimeout(() => {
  recording.end();
  console.log('Stopped recording after 60 seconds');
}, 60000);

console.log('Listening, press Ctrl+C to stop.');