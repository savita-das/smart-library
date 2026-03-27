

// ================= 🔐 LOGIN =================
function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (username === "admin" && password === "s@vit@142002") {
        loginSuccess();
    } else {
        alert("Wrong login");
    }
}
window.login = login;

function loginSuccess() {
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("mainPage").style.display = "block";
    fetchBooks();
}


// ================= 🤖 FACE LOGIN =================
let labeledDescriptors = [];
let systemReady = false;


function loadSavedFaces() {
    const data = localStorage.getItem("faces");

    if (data) {
        const parsed = JSON.parse(data);

        labeledDescriptors = parsed.map(fd =>
            new faceapi.LabeledFaceDescriptors(
                fd.label,
                fd.descriptors.map(d => new Float32Array(d))
            )
        );

        console.log("✅ Faces Loaded from Storage");
    }
}

loadSavedFaces();

async function init() {
    const video = document.getElementById("video");

    try {
        console.log("Starting camera...");

        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;

        await new Promise(resolve => {
            video.onloadedmetadata = () => resolve();
        });

        console.log("Camera OK");

        const MODEL_URL = "/models"; 

        console.log("Loading models...");

        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

        console.log("Models Loaded ✅");

        systemReady = true;

    } catch (err) {
        console.error("FULL ERROR:", err);
        alert("Camera or model loading failed!");
    }
}

init();



// 📸 REGISTER FACE

async function registerFace() {

    if (!systemReady) {
        alert("⏳ System not ready");
        return;
    }

    const name = document.getElementById("faceName").value.trim();
    if (!name) {
        alert("Enter name first");
        return;
    }
    await new Promise(r => setTimeout(r, 300));

    const video = document.getElementById("video");

    const detection = await faceapi.detectSingleFace(
        video,
        new faceapi.TinyFaceDetectorOptions()
    ).withFaceLandmarks().withFaceDescriptor();

    if (!detection) {
        alert("❌ Face not detected");
        return;
    }

    labeledDescriptors.push(
        new faceapi.LabeledFaceDescriptors(name, [detection.descriptor])
    );

    // ✅ SAVE PROPERLY
    const data = labeledDescriptors.map(fd => ({
        label: fd.label,
        descriptors: fd.descriptors.map(d => Array.from(d))
    }));

    localStorage.setItem("faces", JSON.stringify(data));

    alert("✅ Face Registered");
}
// localStorage.setItem("faces", JSON.stringify(labeledDescriptors));
// {

//     const video = document.getElementById("video");

//     await new Promise(r => setTimeout(r, 500)); // wait camera

//     const detection = await faceapi.detectSingleFace(
//         video,
//         new faceapi.TinyFaceDetectorOptions({
//             inputSize: 416,
//             scoreThreshold: 0.5
//         })
//     ).withFaceLandmarks().withFaceDescriptor();

//     if (!detection) {
//         alert("❌ Face not detected");
//         return;
//     }

//     labeledDescriptors.push(
//         new faceapi.LabeledFaceDescriptors(name, [detection.descriptor])
//     );

//     alert("✅ Face registered for " + name);
// }


// 🔓 FACE LOGIN
async function loginWithFace() {

    if (!systemReady) {
        alert("⏳ System not ready");
        return;
    }

    if (labeledDescriptors.length === 0) {
        alert("⚠️ No face registered");
        return;
    }

    const video = document.getElementById("video");

    await new Promise(r => setTimeout(r, 500));

    const detection = await faceapi.detectSingleFace(
        video,
        new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.5
        })
    ).withFaceLandmarks().withFaceDescriptor();

    if (!detection) {
        alert("❌ No face detected");
        return;
    }

    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
    const match = faceMatcher.findBestMatch(detection.descriptor);

    if (match.label !== "unknown") {
        alert("✅ Welcome " + match.label);
        loginSuccess();
    } else {
        alert("❌ Face not recognized");
    }
}


// ================= 📚 BOOK SYSTEM =================

// 📚 FETCH BOOKS
async function fetchBooks() {
    const qs = await getDocs(collection(db, "books"));
    const bookList = document.getElementById("bookList");
    bookList.innerHTML = "";

    let total = 0, issued = 0, available = 0;

    qs.forEach(docSnap => {
        const b = docSnap.data();
        const id = docSnap.id;

        total++;

        if (b.status === "issued") issued++;
        else available++;

        const fine = calculateFine(b);

        const coverUrl = `https://covers.openlibrary.org/b/title/${encodeURIComponent(b.title)}-M.jpg`;

        const today = new Date();
        const due = b.dueDate ? new Date(b.dueDate) : null;

        let alertMsg = "";
        let cardStyle = "";

        if (b.status === "issued" && due && today > due) {
            alertMsg = "⚠️ Overdue!";
            cardStyle = "border:2px solid red;";
        }

        const li = document.createElement('li');

        li.innerHTML = `
        <img src="${coverUrl}" onerror="this.src='https://via.placeholder.com/200x150?text=No+Cover'">

        <h3 class="book-title">${b.title}</h3>
        <p>${b.author}</p>

        <p>Status: ${b.status}</p>
        ${b.student ? `<p>👨‍🎓 ${b.student}</p>` : ""}
        ${b.dueDate ? `<p>📅 Due: ${new Date(b.dueDate).toLocaleDateString()}</p>` : ""}

        <p>💰 Fine: ₹${fine}</p>
        <p style="color:red">${alertMsg}</p>

        <button onclick="issueBook('${id}')">Issue</button>
        <button onclick="returnBook('${id}')">Return</button>
        <button onclick="deleteBook('${id}')">Delete</button>
        `;

        li.style = cardStyle;

        bookList.appendChild(li);
    });

    updateChart(total, issued, available);

    document.getElementById('total').innerText = total;
    document.getElementById('issued').innerText = issued;
    document.getElementById('available').innerText = available;
}


// ➕ ADD BOOK
async function addBook() {
    const title = document.getElementById("title").value;
    const author = document.getElementById("author").value;

    if (!title || !author) {
        alert("Enter details");
        return;
    }

    await addDoc(collection(db, "books"), {
        title,
        author,
        status: "available"
    });

    fetchBooks()
}


// 📖 ISSUE BOOK
async function issueBook(id) {
    const student = prompt("Enter Student Name:");
    if (!student) return;

    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(issueDate.getDate() + 7);

    await updateDoc(doc(db, "books", id), {
        status: "issued",
        student,
        issueDate: issueDate.toISOString(),
        dueDate: dueDate.toISOString()
    });

    fetchBooks();
}


// 🔁 RETURN BOOK
async function returnBook(id) {
    await updateDoc(doc(db, "books", id), {
        status: "available",
        student: "",
        issueDate: "",
        dueDate: ""
    });

    fetchBooks();
}


// 🗑 DELETE BOOK
async function deleteBook(id) {
    await deleteDoc(doc(db, "books", id));
    fetchBooks();
}


// 💰 FINE SYSTEM
function calculateFine(b) {
    if (!b.dueDate) return 0;

    const today = new Date();
    const due = new Date(b.dueDate);

    const lateDays = (today - due) / (1000 * 60 * 60 * 24);
    return lateDays > 0 ? Math.floor(lateDays) * 2 : 0;
}


// 🔍 SEARCH
function searchBooks() {
    const val = document.getElementById("search").value.toLowerCase();

    document.querySelectorAll("#bookList li").forEach(li => {
        li.style.display = li.innerText.toLowerCase().includes(val) ? "block" : "none";
    });
}


// 🌙 DARK MODE
function toggleDark() {
    document.body.classList.toggle("dark");
}


// 📊 CHART
let chart;

function updateChart(total, issued, available) {
    const ctx = document.getElementById('chart');

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Total', 'Issued', 'Available'],
            datasets: [{
                data: [total, issued, available]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}


// 🎤 VOICE SEARCH
function startVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert("Voice not supported");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.start();

    recognition.onresult = function(event) {
        let text = event.results[0][0].transcript;

        // 🔥 CLEAN TEXT
        text = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
        text = text.trim();

        document.getElementById("search").value = text;
        searchBooks();
    };
}



// 📷 QR SCANNER
let qr;

function startScanner() {
    qr = new Html5Qrcode("reader");

    qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },

        async (code) => {
            console.log("QR:", code);

            let title = "";
            let author = "";

            if (code.includes(",")) {
                const parts = code.split(",");
                title = parts[0];
                author = parts[1];
            } else {
                // 🔥 ISBN SUPPORT
                try {
                    const res = await fetch(`https://openlibrary.org/isbn/${code}.json`);
                    const data = await res.json();

                    title = data.title;

                    if (data.authors && data.authors.length > 0) {
                        const authorRes = await fetch(`https://openlibrary.org${data.authors[0].key}.json`);
                        const authorData = await authorRes.json();
                        author = authorData.name;
                    } else {
                        author = "Unknown";
                    }

                } catch {
                    alert("❌ ISBN not found");
                    return;
                }
            }

            await addDoc(collection(db, "books"), {
                title,
                author,
                status: "available"
            });

            alert("✅ Book Added: " + title);

            qr.stop();
            fetchBooks();
        }
    );
}
// function startScanner() {
//     const qr = new Html5Qrcode("reader");

//     qr.start(
//         { facingMode: "environment" },
//         { fps: 10, qrbox: 250 },

//         async (code) => {
//             try {
//                 const parts = code.split(",");

//                 if (parts.length >= 2) {
//                     await addDoc(collection(db, "books"), {
//                         title: parts[0],
//                         author: parts[1],
//                         status: "available"
//                     });

//                     alert("Book added from QR");
//                 }

//                 fetchBooks();
//                 qr.stop();

//             } catch {
//                 alert("Scan error");
//             }
//         }
//     );
// }


// 🌟 PARTICLES
particlesJS("particles-js", {
  particles: {
    number: { value: 60 },
    size: { value: 3 },
    move: { speed: 2 },
    line_linked: { enable: true },
  }
});