// Firebase-ის საჭირო მოდულების იმპორტი
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";

// შენი Firebase კონფიგურაციის მონაცემები
const firebaseConfig = {
  apiKey: "YOUR_NEW_API_KEY_FROM_FIREBASE_CONSOLE", // <-- აქ ჩასვი ახალი, სწორი API Key
  authDomain: "courier-tracking-c36c5.firebaseapp.com",
  projectId: "courier-tracking-c36c5",
  storageBucket: "courier-tracking-c36c5.appspot.com",
  messagingSenderId: "19606482959",
  appId: "1:19606482959:web:1f3c22799f66b0cf17337a",
  measurementId: "G-R2MZV6GDXB"
};

// Firebase აპლიკაციის ინიციალიზაცია
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

let userId = null;

// ელემენტების მიღება HTML-იდან
const odometerForm = document.getElementById('odometerForm');
const currentDateInput = document.getElementById('currentDate');
const startOdometerInput = document.getElementById('startOdometer');
const endOdometerInput = document.getElementById('endOdometer');
const messageDiv = document.getElementById('message');
const userIdDisplay = document.getElementById('userIdDisplay');
const courierDataTableBody = document.getElementById('courierDataTableBody');

// მიმდინარე თარიღის დაყენება ინფუთ ველში
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
currentDateInput.value = `${year}-${month}-${day}`;

// ავტორიზაციის მდგომარეობის მონიტორინგი
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userId = user.uid;
        userIdDisplay.textContent = userId;
        console.log("მომხმარებელი შესულია ID-ით:", userId);
        loadCourierData(userId);
    } else {
        try {
            await signInAnonymously(auth);
            console.log("ანონიმური შესვლა წარმატებულია.");
        } catch (error) {
            console.error("ავტორიზაციის შეცდომა:", error);
            showMessage('ავტორიზაციის შეცდომა. სცადეთ გვერდის განახლება.', 'error');
        }
    }
});

// ფორმის გაგზავნისას
odometerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!userId) {
        showMessage('მომხმარებელი არ არის ავტორიზებული. გთხოვთ, დაელოდოთ.', 'error');
        return;
    }

    const date = currentDateInput.value;
    const startOdometer = parseFloat(startOdometerInput.value);
    const endOdometer = parseFloat(endOdometerInput.value);

    if (isNaN(startOdometer) || isNaN(endOdometer) || endOdometer < startOdometer) {
        showMessage('შეყვანილი მონაცემები არასწორია. საბოლოო ოდომეტრი არ უნდა იყოს საწყისზე ნაკლები.', 'error');
        return;
    }

    const dailyMileage = endOdometer - startOdometer;

    try {
        await addDoc(collection(db, `users/${userId}/dailyReadings`), {
            courierId: userId,
            date: date,
            startOdometer: startOdometer,
            endOdometer: endOdometer,
            dailyMileage: dailyMileage,
            timestamp: serverTimestamp()
        });

        showMessage('მონაცემები წარმატებით შეინახა!', 'success');
        odometerForm.reset();
        currentDateInput.value = `${year}-${month}-${day}`;
    } catch (error) {
        console.error("მონაცემების შენახვისას მოხდა შეცდომა: ", error);
        showMessage('მონაცემების შენახვისას მოხდა შეცდომა. სცადეთ მოგვიანებით.', 'error');
    }
});

// კურიერის მონაცემების ჩატვირთვა რეალურ დროში
function loadCourierData(currentUserId) {
    const q = query(
        collection(db, `users/${currentUserId}/dailyReadings`),
        where("courierId", "==", currentUserId)
    );

    onSnapshot(q, (snapshot) => {
        courierDataTableBody.innerHTML = '';
        const data = [];
        snapshot.forEach((doc) => {
            data.push({ id: doc.id, ...doc.data() });
        });

        data.sort((a, b) => new Date(b.date) - new Date(a.date));

        data.forEach((docData) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${docData.date}</td>
                <td>${docData.startOdometer}</td>
                <td>${docData.endOdometer}</td>
                <td>${docData.dailyMileage ? docData.dailyMileage.toFixed(2) : 'N/A'}</td>
            `;
            courierDataTableBody.appendChild(row);
        });
    }, (error) => {
        console.error("მონაცემების ჩატვირთვის შეცდომა:", error);
        showMessage('მონაცემების ჩატვირთვისას მოხდა შეცდომა.', 'error');
    });
}

// შეტყობინების ჩვენება
function showMessage(msg, type) {
    messageDiv.textContent = msg;
    messageDiv.className = 'message';
    messageDiv.classList.add(type);
    messageDiv.classList.remove('hidden');
}
