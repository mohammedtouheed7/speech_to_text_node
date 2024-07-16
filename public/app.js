const startButton = document.getElementById('start');
const stopButton = document.getElementById('stop');
const resultElement = document.getElementById('result');
let pollingInterval;

startButton.addEventListener('click', () => {
  fetch('/start-recording', { method: 'POST' })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to start recording');
      }
      startButton.disabled = true;
      stopButton.disabled = false;
      resultElement.textContent = 'Listening...';
      startPolling();
    })
    .catch(error => {
      console.error('Error starting recording:', error);
      resultElement.textContent = 'Error starting recording';
    });
});

stopButton.addEventListener('click', () => {
  fetch('/stop-recording', { method: 'POST' })
    .then(response => response.json())
    .then(data => {
      resultElement.textContent = data.transcription;
      startButton.disabled = false;
      stopButton.disabled = true;
      stopPolling();
    })
    .catch(error => {
      console.error('Error stopping recording:', error);
      resultElement.textContent = 'Error stopping recording';
    });
});

let finalTranscription = '';

function startPolling() {
  pollingInterval = setInterval(() => {
    fetch('/poll-interim')
      .then(response => response.json())
      .then(data => {
        resultElement.textContent = data.interimTranscription;
      })
      .catch(error => {
        console.error('Error polling interim transcription:', error);
      });
  }, 500); // Poll every 0.5 seconds
}

function stopPolling() {
  clearInterval(pollingInterval);
}
