// Firebase-ის საჭირო მოდულების იმპორტი
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";

// შენი Firebase კონფიგურაციის მონაცემები
const firebaseConfig = {
  apiKey: "AIzaSyC5Nmsdmv6aRgXSZtasPHCba__AdlOb-uU",
  authDomain: "courier-tracking-c36c5.firebaseapp.com",
  projectId: "courier-tracking-c36c5",
  storageBucket: "courier-tracking-c36c5.firebasestorage.app",
  messagingSenderId: "19606482959",
  appId: "1:19606482959:web:1f3c22799f66b0cf17337a",
  measurementId: "G-R2MZV6GDXB"
};

// Firebase აპლიკაციის ინიციალიზაცია
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

let currentUserId = null;
let currentUserRole = null;

// HTML ელემენტების მიღება
const authSection = document.getElementById('authSection');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const authMessageDiv = document.getElementById('authMessage');
const logoutBtn = document.getElementById('logoutBtn');
const userRoleDisplay = document.getElementById('userRoleDisplay');
const userIdDisplay = document.getElementById('userIdDisplay');

const courierPanel = document.getElementById('courierPanel');
const odometerForm = document.getElementById('odometerForm');
const currentDateInput = document.getElementById('currentDate');
const startOdometerInput = document.getElementById('startOdometer');
const endOdometerInput = document.getElementById('endOdometer');
const courierMessageDiv = document.getElementById('courierMessage');
const courierDataTableBody = document.getElementById('courierDataTableBody');

const adminPanel = document.getElementById('adminPanel');
const adminDataTableBody = document.getElementById('adminDataTableBody');
const adminMessageDiv = document.getElementById('adminMessage');

// მიმდინარე თარიღის დაყენება ინფუთ ველში
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
currentDateInput.value = `${year}-${month}-${day}`;
// კურიერს მხოლოდ მიმდინარე თარიღის შეყვანა შეეძლოს
currentDateInput.setAttribute('max', currentDateInput.value);
currentDateInput.setAttribute('min', currentDateInput.value);


// --- ავტორიზაციის ლოგიკა ---

// შესვლა
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginEmail.value;
    const password = loginPassword.value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        showMessage(authMessageDiv, 'შესვლა წარმატებულია!', 'success');
        loginForm.reset();
    } catch (error) {
        console.error("შესვლის შეცდომა:", error);
        showMessage(authMessageDiv, 'შესვლის შეცდომა: ' + error.message, 'error');
    }
});

// რეგისტრაცია (ნაგულისხმევად კურიერი)
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = signupEmail.value;
    const password = signupPassword.value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // მომხმარებლის როლის შენახვა Firestore-ში
        await setDoc(doc(db, "users", user.uid), {
            email: user.email,
            role: 'courier', // ნაგულისხმევი როლი
            createdAt: serverTimestamp()
        });

        showMessage(authMessageDiv, 'რეგისტრაცია წარმატებულია! ახლა შეგიძლიათ შეხვიდეთ.', 'success');
        signupForm.reset();
    } catch (error) {
        console.error("რეგისტრაციის შეცდომა:", error);
        showMessage(authMessageDiv, 'რეგისტრაციის შეცდომა: ' + error.message, 'error');
    }
});

// გასვლა
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        showMessage(authMessageDiv, 'წარმატებით გამოხვედით სისტემიდან.', 'success');
    } catch (error) {
        console.error("გასვლის შეცდომა:", error);
        showMessage(authMessageDiv, 'გასვლის შეცდომა: ' + error.message, 'error');
    }
});

// ავტორიზაციის მდგომარეობის მონიტორინგი და UI-ის განახლება
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserId = user.uid;
        userIdDisplay.textContent = currentUserId;
        logoutBtn.classList.remove('hidden'); // გასვლის ღილაკის ჩვენება

        // მომხმარებლის როლის მიღება Firestore-დან
        const userDocRef = doc(db, "users", currentUserId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            currentUserRole = userDocSnap.data().role;
            userRoleDisplay.textContent = currentUserRole === 'admin' ? 'ადმინი' : 'კურიერი';
            renderUIForRole(currentUserRole);
        } else {
            // თუ მომხმარებელი არსებობს Auth-ში, მაგრამ არა Firestore-ში (შეიძლება ძველი ანონიმური მომხმარებელი იყოს)
            // ან თუ რეგისტრაციისას მოხდა შეცდომა როლის შენახვისას
            console.warn("მომხმარებლის პროფილი Firestore-ში არ მოიძებნა. ნაგულისხმევი როლი: კურიერი.");
            currentUserRole = 'courier';
            userRoleDisplay.textContent = 'კურიერი';
            renderUIForRole(currentUserRole);

            // შექმენი პროფილი ნაგულისხმევი როლით, თუ არ არსებობს
            await setDoc(userDocRef, {
                email: user.email || "anonymous@example.com", // თუ ანონიმურია, ელ.ფოსტა არ ექნება
                role: 'courier',
                createdAt: serverTimestamp()
            }, { merge: true }); // merge: true ნიშნავს, რომ თუ დოკუმენტი არსებობს, უბრალოდ განაახლებს
        }

    } else {
        // მომხმარებელი არ არის შესული
        currentUserId = null;
        currentUserRole = null;
        userRoleDisplay.textContent = 'არავინ';
        userIdDisplay.textContent = '';
        logoutBtn.classList.add('hidden'); // გასვლის ღილაკის დამალვა
        renderUIForRole(null); // აჩვენე ავტორიზაციის ფორმები
    }
});

// UI-ის რენდერირება როლის მიხედვით
function renderUIForRole(role) {
    authSection.classList.add('hidden');
    courierPanel.classList.add('hidden');
    adminPanel.classList.add('hidden');

    if (role === 'courier') {
        courierPanel.classList.remove('hidden');
        loadCourierData(currentUserId); // კურიერის მონაცემების ჩატვირთვა
    } else if (role === 'admin') {
        adminPanel.classList.remove('hidden');
        loadAdminData(); // ადმინის მონაცემების ჩატვირთვა
    } else {
        authSection.classList.remove('hidden'); // აჩვენე შესვლა/რეგისტრაცია
    }
}

// --- კურიერის ლოგიკა ---

odometerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUserId || currentUserRole !== 'courier') {
        showMessage(courierMessageDiv, 'თქვენ არ გაქვთ უფლება ამ მოქმედების შესასრულებლად.', 'error');
        return;
    }

    const date = currentDateInput.value;
    const startOdometer = parseFloat(startOdometerInput.value);
    const endOdometer = parseFloat(endOdometerInput.value);

    if (isNaN(startOdometer) || isNaN(endOdometer) || endOdometer < startOdometer) {
        showMessage(courierMessageDiv, 'შეყვანილი მონაცემები არასწორია. საბოლოო ოდომეტრი არ უნდა იყოს საწყისზე ნაკლები.', 'error');
        return;
    }

    const dailyMileage = endOdometer - startOdometer;

    try {
        // მონაცემების შენახვა `dailyReadings` კოლექციაში
        await addDoc(collection(db, `dailyReadings`), {
            courierId: currentUserId, // კურიერის ID
            date: date, // თარიღი სტრიქონად
            startOdometer: startOdometer,
            endOdometer: endOdometer,
            dailyMileage: dailyMileage,
            fuelConsumed: null, // საწვავი თავიდან ცარიელია
            fuelCost: null,     // ღირებულება თავიდან ცარიელია
            timestamp: serverTimestamp() // ჩანაწერის დრო
        });

        showMessage(courierMessageDiv, 'მონაცემები წარმატებით შეინახა!', 'success');
        odometerForm.reset(); // ფორმის გასუფთავება
        currentDateInput.value = `${year}-${month}-${day}`; // თარიღის ხელახლა დაყენება
    } catch (error) {
        console.error("მონაცემების შენახვისას მოხდა შეცდომა: ", error);
        showMessage(courierMessageDiv, 'მონაცემების შენახვისას მოხდა შეცდომა. სცადეთ მოგვიანებით. ' + error.message, 'error');
    }
});

// კურიერის მონაცემების ჩატვირთვა რეალურ დროში
function loadCourierData(userIdToLoad) {
    // ქმნის Firestore query-ს, რომელიც იღებს მხოლოდ მიმდინარე მომხმარებლის მონაცემებს
    const q = query(
        collection(db, `dailyReadings`),
        where("courierId", "==", userIdToLoad)
        // orderBy("timestamp", "desc") // orderBy-ს გამოყენება შეიძლება მოითხოვდეს ინდექსებს Firebase-ში
                                    // ამიტომ ჯობია მონაცემები JavaScript-ში დავალაგოთ
    );

    onSnapshot(q, (snapshot) => {
        courierDataTableBody.innerHTML = ''; // ცხრილის გასუფთავება
        const data = [];
        snapshot.forEach((doc) => {
            data.push({ id: doc.id, ...doc.data() });
        });

        // მონაცემების დალაგება თარიღის მიხედვით (უახლესი პირველი)
        data.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (data.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="4" class="text-center text-gray-500 py-4">მონაცემები არ მოიძებნა.</td>`;
            courierDataTableBody.appendChild(row);
        } else {
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
        }
    }, (error) => {
        console.error("კურიერის მონაცემების ჩატვირთვის შეცდომა:", error);
        showMessage(courierMessageDiv, 'მონაცემების ჩატვირთვისას მოხდა შეცდომა.', 'error');
    });
}

// --- ადმინის ლოგიკა ---

function loadAdminData() {
    // ადმინი კითხულობს ყველა მონაცემს `dailyReadings` კოლექციიდან
    const q = query(
        collection(db, `dailyReadings`)
        // orderBy("timestamp", "desc") // orderBy-ს გამოყენება შეიძლება მოითხოვდეს ინდექსებს Firebase-ში
    );

    onSnapshot(q, (snapshot) => {
        adminDataTableBody.innerHTML = ''; // ცხრილის გასუფთავება
        const data = [];
        snapshot.forEach((doc) => {
            data.push({ id: doc.id, ...doc.data() });
        });

        // მონაცემების დალაგება თარიღის მიხედვით (უახლესი პირველი)
        data.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (data.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="8" class="text-center text-gray-500 py-4">მონაცემები არ მოიძებნა.</td>`;
            adminDataTableBody.appendChild(row);
        } else {
            data.forEach((docData) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${docData.courierId}</td>
                    <td>${docData.date}</td>
                    <td>${docData.startOdometer}</td>
                    <td>${docData.endOdometer}</td>
                    <td>${docData.dailyMileage ? docData.dailyMileage.toFixed(2) : 'N/A'}</td>
                    <td>
                        <input type="number" step="0.01" value="${docData.fuelConsumed !== null ? docData.fuelConsumed : ''}"
                               class="w-20 p-1 border rounded" data-field="fuelConsumed" data-doc-id="${docData.id}">
                    </td>
                    <td>
                        <input type="number" step="0.01" value="${docData.fuelCost !== null ? docData.fuelCost : ''}"
                               class="w-20 p-1 border rounded" data-field="fuelCost" data-doc-id="${docData.id}">
                    </td>
                    <td>
                        <button class="save-fuel-btn bg-green-500 hover:bg-green-600 text-white text-sm py-1 px-2 rounded"
                                data-doc-id="${docData.id}">შენახვა</button>
                    </td>
                `;
                adminDataTableBody.appendChild(row);
            });

            // საწვავის შენახვის ღილაკების ლოგიკა
            document.querySelectorAll('.save-fuel-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const docId = e.target.dataset.docId;
                    const row = e.target.closest('tr');
                    const fuelConsumedInput = row.querySelector(`input[data-doc-id="${docId}"][data-field="fuelConsumed"]`);
                    const fuelCostInput = row.querySelector(`input[data-doc-id="${docId}"][data-field="fuelCost"]`);

                    const fuelConsumed = fuelConsumedInput.value !== '' ? parseFloat(fuelConsumedInput.value) : null;
                    const fuelCost = fuelCostInput.value !== '' ? parseFloat(fuelCostInput.value) : null;

                    if (isNaN(fuelConsumed) && fuelConsumed !== null) {
                        showMessage(adminMessageDiv, 'საწვავის მოხმარება უნდა იყოს რიცხვი.', 'error');
                        return;
                    }
                    if (isNaN(fuelCost) && fuelCost !== null) {
                        showMessage(adminMessageDiv, 'საწვავის ღირებულება უნდა იყოს რიცხვი.', 'error');
                        return;
                    }

                    try {
                        await setDoc(doc(db, "dailyReadings", docId), {
                            fuelConsumed: fuelConsumed,
                            fuelCost: fuelCost
                        }, { merge: true }); // merge: true განაახლებს მხოლოდ ამ ველებს

                        showMessage(adminMessageDiv, 'საწვავის მონაცემები განახლდა!', 'success');
                    } catch (error) {
                        console.error("საწვავის განახლების შეცდომა:", error);
                        showMessage(adminMessageDiv, 'საწვავის მონაცემების განახლებისას მოხდა შეცდომა: ' + error.message, 'error');
                    }
                });
            });
        }
    }, (error) => {
        console.error("ადმინის მონაცემების ჩატვირთვის შეცდომა:", error);
        showMessage(adminMessageDiv, 'მონაცემების ჩატვირთვისას მოხდა შეცდომა.', 'error');
    });
}


// შეტყობინების ჩვენება
function showMessage(element, msg, type) {
    element.textContent = msg;
    element.className = 'message'; // კლასების გასუფთავება და ძირითადი კლასის დამატება
    element.classList.add(type); // 'success' ან 'error'
    element.classList.remove('hidden'); // ჩვენება
    setTimeout(() => {
        element.classList.add('hidden'); // დამალვა 5 წამის შემდეგ
    }, 5000);
}
