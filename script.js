// Firebase-ის საჭირო მოდულების იმპორტი
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, doc, setDoc, getDoc, serverTimestamp, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// შენი Firebase კონფიგურაციის მონაცემები
const firebaseConfig = {
  apiKey: "AIzaSyB4X0i9h8dSgxuJxl9ld6S21JuRHezMA-w", // <-- აქ ჩასვი შენი ზუსტი API Key
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
const storage = getStorage(app);

let currentUserId = null;
let currentUserRole = null;
let allUsersData = {}; // ყველა მომხმარებლის სახელის და გვარის შესანახად

// კურიერის დღის მდგომარეობის ცვლადები
let currentCourierDailyEntryId = null; // მიმდინარე დღის ჩანაწერის ID
let isDayStarted = false; // აჩვენებს, დაიწყო თუ არა კურიერმა დღე


// HTML ელემენტების მიღება
const authContainer = document.getElementById('authContainer');
const loginSection = document.getElementById('loginSection');
const registerSection = document.getElementById('registerSection');
const showRegisterBtn = document.getElementById('showRegisterBtn');
const showLoginBtn = document.getElementById('showLoginBtn');

const loginForm = document.getElementById('loginForm');
const loginEmailInput = document.getElementById('loginEmail');
const loginPasswordInput = document.getElementById('loginPassword');

const signupForm = document.getElementById('signupForm');
const signupEmailInput = document.getElementById('signupEmail');
const signupPasswordInput = document.getElementById('signupPassword');
const signupFirstNameInput = document.getElementById('signupFirstName');
const signupLastNameInput = document.getElementById('signupLastName');

const authMessageDiv = document.getElementById('authMessage');
const logoutBtn = document.getElementById('logoutBtn');
const userRoleDisplay = document.getElementById('userRoleDisplay');
const userIdDisplay = document.getElementById('userIdDisplay');

const courierPanel = document.getElementById('courierPanel');
const odometerForm = document.getElementById('odometerForm');
const currentDateInput = document.getElementById('currentDate');
const startOdometerInput = document.getElementById('startOdometer');
const endOdometerInput = document.getElementById('endOdometer');
const odometerImageInput = document.getElementById('odometerImage');
const submitOdometerBtn = document.getElementById('submitOdometerBtn'); // ახალი ღილაკი
const startOdometerGroup = document.getElementById('startOdometerGroup'); // საწყისი ოდომეტრის ჯგუფი
const endOdometerGroup = document.getElementById('endOdometerGroup'); // საბოლოო ოდომეტრის ჯგუფი
const courierMessageDiv = document.getElementById('courierMessage');
const courierDataTableBody = document.getElementById('courierDataTableBody');

const adminPanel = document.getElementById('adminPanel');
const adminDataTableBody = document.getElementById('adminDataTableBody');
const adminMessageDiv = document.getElementById('adminMessage');
const filterCourierSelect = document.getElementById('filterCourier');
const filterStartDateInput = document.getElementById('filterStartDate');
const filterEndDateInput = document = document.getElementById('filterEndDate');
const applyFiltersBtn = document.getElementById('applyFiltersBtn');
const downloadExcelBtn = document.getElementById('downloadExcelBtn');
const clearDatabaseBtn = document.getElementById('clearDatabaseBtn');
const passwordModal = document.getElementById('passwordModal');
const passwordInput = document.getElementById('passwordInput');
const confirmClearBtn = document.getElementById('confirmClearBtn');
const cancelClearBtn = document.getElementById('cancelClearBtn');
const modalMessageDiv = document.getElementById('modalMessage');


// მიმდინარე თარიღის დაყენება ინფუთ ველში
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
currentDateInput.value = `${year}-${month}-${day}`;
currentDateInput.setAttribute('max', currentDateInput.value);
currentDateInput.setAttribute('min', currentDateInput.value);


// --- UI გადამრთველები შესვლა/რეგისტრაციას შორის ---
showRegisterBtn.addEventListener('click', () => {
    loginSection.classList.add('hidden');
    registerSection.classList.remove('hidden');
    authMessageDiv.classList.add('hidden');
});

showLoginBtn.addEventListener('click', () => {
    registerSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
    authMessageDiv.classList.add('hidden');
});


// --- ავტორიზაციის ლოგიკა ---

// შესვლა
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;

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
    const email = signupEmailInput.value;
    const password = signupPasswordInput.value;
    const firstName = signupFirstNameInput.value;
    const lastName = signupLastNameInput.value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // მომხმარებლის როლის, სახელის და გვარის შენახვა Firestore-ში
        await setDoc(doc(db, "users", user.uid), {
            email: user.email,
            firstName: firstName,
            lastName: lastName,
            role: 'courier', // ნაგულისხმევი როლი
            createdAt: serverTimestamp()
        });

        showMessage(authMessageDiv, 'რეგისტრაცია წარმატებულია! ახლა შეგიძლიათ შეხვიდეთ.', 'success');
        signupForm.reset();
        showLoginBtn.click();
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
        logoutBtn.classList.remove('hidden');

        // მომხმარებლის როლის მიღება Firestore-დან
        const userDocRef = doc(db, "users", currentUserId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            currentUserRole = userDocSnap.data().role;
            userRoleDisplay.textContent = currentUserRole === 'admin' ? 'ადმინი' : 'კურიერი';
            renderUIForRole(currentUserRole);
        } else {
            console.warn("მომხმარებლის პროფილი Firestore-ში არ მოიძებნა. ნაგულისხმევი როლი: კურიერი.");
            currentUserRole = 'courier';
            userRoleDisplay.textContent = 'კურიერი';
            renderUIForRole(currentUserRole);

            await setDoc(userDocRef, {
                email: user.email || "unknown@example.com",
                firstName: "უცნობი",
                lastName: "მომხმარებელი",
                role: 'courier',
                createdAt: serverTimestamp()
            }, { merge: true });
        }

    } else {
        currentUserId = null;
        currentUserRole = null;
        userRoleDisplay.textContent = 'არავინ';
        userIdDisplay.textContent = '';
        logoutBtn.classList.add('hidden');
        renderUIForRole(null);
    }
});

// UI-ის რენდერირება როლის მიხედვით
function renderUIForRole(role) {
    authContainer.classList.add('hidden');
    courierPanel.classList.add('hidden');
    adminPanel.classList.add('hidden');

    if (role === 'courier') {
        courierPanel.classList.remove('hidden');
        checkCourierDayStatus(currentUserId); // შეამოწმე კურიერის დღის სტატუსი
        loadCourierData(currentUserId);
    } else if (role === 'admin') {
        adminPanel.classList.remove('hidden');
        loadAllUsersData();
        loadAdminData();
    } else {
        authContainer.classList.remove('hidden');
        loginSection.classList.remove('hidden');
        registerSection.classList.add('hidden');
    }
}

// --- ყველა მომხმარებლის მონაცემების ჩატვირთვა (სახელებისთვის) ---
async function loadAllUsersData() {
    const usersCollection = collection(db, "users");
    onSnapshot(usersCollection, (snapshot) => {
        allUsersData = {};
        snapshot.forEach(doc => {
            allUsersData[doc.id] = doc.data();
        });
        populateCourierFilter();
        if (currentUserRole === 'admin') {
            loadAdminData();
        }
    }, (error) => {
        console.error("ყველა მომხმარებლის მონაცემების ჩატვირთვის შეცდომა:", error);
    });
}

// --- კურიერის დღის სტატუსის შემოწმება ---
async function checkCourierDayStatus(userId) {
    const todayDate = currentDateInput.value; // მიმდინარე თარიღი
    const q = query(
        collection(db, `dailyReadings`),
        where("courierId", "==", userId),
        where("date", "==", todayDate)
    );

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        // მოიძებნა ჩანაწერი მიმდინარე დღისთვის
        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();
        currentCourierDailyEntryId = docSnap.id;

        if (data.endOdometer === null || data.endOdometer === undefined) {
            // დღე დაწყებულია, მაგრამ არ დასრულებულა
            isDayStarted = true;
            startOdometerInput.value = data.startOdometer; // შეავსე საწყისი ოდომეტრი
            startOdometerInput.setAttribute('disabled', 'true'); // გათიშე საწყისი ოდომეტრი
            startOdometerGroup.classList.remove('hidden'); // დარწმუნდი რომ ჩანს
            endOdometerGroup.classList.remove('hidden'); // აჩვენე საბოლოო ოდომეტრის ველი
            submitOdometerBtn.textContent = 'დღის დასრულება';
        } else {
            // დღე დასრულებულია
            isDayStarted = false;
            currentCourierDailyEntryId = null;
            startOdometerInput.value = '';
            endOdometerInput.value = '';
            startOdometerInput.removeAttribute('disabled');
            startOdometerGroup.classList.remove('hidden'); // დარწმუნდი რომ ჩანს
            endOdometerGroup.classList.add('hidden'); // დამალე საბოლოო ოდომეტრის ველი
            submitOdometerBtn.textContent = 'დღის დაწყება';
        }
    } else {
        // დღე არ დაწყებულა
        isDayStarted = false;
        currentCourierDailyEntryId = null;
        startOdometerInput.value = '';
        endOdometerInput.value = '';
        startOdometerInput.removeAttribute('disabled');
        startOdometerGroup.classList.remove('hidden'); // დარწმუნდი რომ ჩანს
        endOdometerGroup.classList.add('hidden'); // დამალე საბოლოო ოდომეტრის ველი
        submitOdometerBtn.textContent = 'დღის დაწყება';
    }
    odometerForm.reset(); // ფორმის გასუფთავება
    currentDateInput.value = todayDate; // თარიღის ხელახლა დაყენება
}


// --- კურიერის ლოგიკა ---

odometerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUserId || currentUserRole !== 'courier') {
        showMessage(courierMessageDiv, 'თქვენ არ გაქვთ უფლება ამ მოქმედების შესასრულებლად.', 'error');
        return;
    }

    const date = currentDateInput.value;
    const odometerImageFile = odometerImageInput.files[0];
    let imageUrl = null;
    let imageUploadTimestamp = null;

    if (odometerImageFile) {
        try {
            const storageRef = ref(storage, `odometer_images/${currentUserId}/${Date.now()}_${odometerImageFile.name}`);
            const uploadResult = await uploadBytes(storageRef, odometerImageFile);
            imageUrl = await getDownloadURL(uploadResult.ref);
            imageUploadTimestamp = serverTimestamp();
        } catch (error) {
            console.error("სურათის ატვირთვის შეცდომა:", error);
            showMessage(courierMessageDiv, 'სურათის ატვირთვისას მოხდა შეცდომა: ' + error.message, 'error');
        }
    }

    if (!isDayStarted) {
        // დღის დაწყება
        const startOdometer = parseFloat(startOdometerInput.value);
        if (isNaN(startOdometer)) {
            showMessage(courierMessageDiv, 'შეიყვანეთ საწყისი ოდომეტრი.', 'error');
            return;
        }

        try {
            const docRef = await addDoc(collection(db, `dailyReadings`), {
                courierId: currentUserId,
                date: date,
                startOdometer: startOdometer,
                startImageUrl: imageUrl, // საწყისი სურათი
                startTimestamp: serverTimestamp(), // საწყისი დრო
                endOdometer: null,
                endImageUrl: null,
                endTimestamp: null,
                dailyMileage: null,
                fuelConsumed: null,
                fuelCost: null,
                createdAt: serverTimestamp() // ჩანაწერის შექმნის დრო
            });
            currentCourierDailyEntryId = docRef.id;
            isDayStarted = true;
            showMessage(courierMessageDiv, 'დღე წარმატებით დაიწყო!', 'success');
            checkCourierDayStatus(currentUserId); // განაახლე UI
        } catch (error) {
            console.error("დღის დაწყების შეცდომა: ", error);
            showMessage(courierMessageDiv, 'დღის დაწყებისას მოხდა შეცდომა. ' + error.message, 'error');
        }
    } else {
        // დღის დასრულება
        const endOdometer = parseFloat(endOdometerInput.value);
        if (isNaN(endOdometer)) {
            showMessage(courierMessageDiv, 'შეიყვანეთ საბოლოო ოდომეტრი.', 'error');
            return;
        }

        const docRef = doc(db, "dailyReadings", currentCourierDailyEntryId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            showMessage(courierMessageDiv, 'მიმდინარე დღის ჩანაწერი ვერ მოიძებნა.', 'error');
            return;
        }
        const startOdometer = docSnap.data().startOdometer;
        if (endOdometer < startOdometer) {
            showMessage(courierMessageDiv, 'საბოლოო ოდომეტრი არ უნდა იყოს საწყისზე ნაკლები.', 'error');
            return;
        }
        const dailyMileage = endOdometer - startOdometer;

        try {
            await setDoc(docRef, {
                endOdometer: endOdometer,
                endImageUrl: imageUrl, // საბოლოო სურათი
                endTimestamp: serverTimestamp(), // დასრულების დრო
                dailyMileage: dailyMileage
            }, { merge: true });

            isDayStarted = false;
            currentCourierDailyEntryId = null;
            showMessage(courierMessageDiv, 'დღე წარმატებით დასრულდა!', 'success');
            checkCourierDayStatus(currentUserId); // განაახლე UI
        } catch (error) {
            console.error("დღის დასრულების შეცდომა: ", error);
            showMessage(courierMessageDiv, 'დღის დასრულებისას მოხდა შეცდომა. ' + error.message, 'error');
        }
    }
    odometerForm.reset();
    currentDateInput.value = `${year}-${month}-${day}`;
    odometerImageInput.value = ''; // სურათის ველის გასუფთავება
    loadCourierData(currentUserId); // განაახლე კურიერის ცხრილი
});


// კურიერის მონაცემების ჩატვირთვა რეალურ დროში
function loadCourierData(userIdToLoad) {
    const q = query(
        collection(db, `dailyReadings`),
        where("courierId", "==", userIdToLoad)
    );

    onSnapshot(q, (snapshot) => {
        courierDataTableBody.innerHTML = '';
        const data = [];
        snapshot.forEach((doc) => {
            data.push({ id: doc.id, ...doc.data() });
        });

        data.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (data.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="8" class="text-center text-gray-500 py-4">მონაცემები არ მოიძებნა.</td>`;
            courierDataTableBody.appendChild(row);
        } else {
            data.forEach((docData) => {
                const startDisplayTime = docData.startTimestamp ? new Date(docData.startTimestamp.toDate()).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';
                const endDisplayTime = docData.endTimestamp ? new Date(docData.endTimestamp.toDate()).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${docData.date}</td>
                    <td>${docData.startOdometer}</td>
                    <td>${docData.endOdometer !== null ? docData.endOdometer : 'N/A'}</td>
                    <td>${docData.dailyMileage !== null ? docData.dailyMileage.toFixed(2) : 'N/A'}</td>
                    <td>${docData.startImageUrl ? `<a href="${docData.startImageUrl}" target="_blank"><img src="${docData.startImageUrl}" alt="Start Odometer Image" class="w-20 h-12 object-cover rounded"></a>` : 'არ არის'}</td>
                    <td>${docData.endImageUrl ? `<a href="${docData.endImageUrl}" target="_blank"><img src="${docData.endImageUrl}" alt="End Odometer Image" class="w-20 h-12 object-cover rounded"></a>` : 'არ არის'}</td>
                    <td>${startDisplayTime}</td>
                    <td>${endDisplayTime}</td>
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

// კურიერების ფილტრის შევსება
function populateCourierFilter() {
    filterCourierSelect.innerHTML = '<option value="">ყველა კურიერი</option>';
    for (const userId in allUsersData) {
        const user = allUsersData[userId];
        const option = document.createElement('option');
        option.value = userId;
        option.textContent = `${user.firstName} ${user.lastName} (${userId})`;
        filterCourierSelect.appendChild(option);
    }
}

// ფილტრების გამოყენება
applyFiltersBtn.addEventListener('click', () => {
    loadAdminData();
});

// ექსელში ჩამოტვირთვა
downloadExcelBtn.addEventListener('click', async () => {
    const table = document.getElementById('adminDataTableBody');
    let csv = [];
    
    // Header row - ქართული სათაურები
    const headers = [
        "კურიერის სახელი",
        "თარიღი",
        "საწყისი ოდომეტრი",
        "საბოლოო ოდომეტრი",
        "გავლილი მანძილი",
        "საწვავი (ლიტრი)",
        "საწვავის ღირებულება",
        "საწყისი სურათის URL",
        "დასრულების სურათის URL",
        "დაწყების დრო",
        "დასრულების დრო",
        "მოქმედება"
    ].join(',');
    csv.push(headers);

    // Data rows
    Array.from(table.rows).forEach(row => {
        const rowData = Array.from(row.cells).map((cell, index) => {
            if (index === 0) { // კურიერის სახელი
                return cell.innerText.split('(')[0].trim();
            } else if (index === 5 || index === 6) { // Fuel Consumed and Fuel Cost columns
                const input = cell.querySelector('input');
                return input ? input.value : '';
            } else if (index === 7 || index === 8) { // Image columns
                const imgLink = cell.querySelector('a');
                return imgLink ? imgLink.href : 'არ არის';
            } else if (index === 11) { // "მოქმედება" სვეტი
                return '';
            }
            return cell.innerText;
        }).join(',');
        csv.push(rowData);
    });

    const csvFile = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(csvFile);
    downloadLink.download = 'courier_data.csv';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    showMessage(adminMessageDiv, 'მონაცემები ჩამოიტვირთა ექსელში!', 'success');
});


function loadAdminData() {
    adminDataTableBody.innerHTML = '';
    let q = collection(db, `dailyReadings`);

    const selectedCourierId = filterCourierSelect.value;
    const startDate = filterStartDateInput.value;
    const endDate = filterEndDateInput.value;

    if (selectedCourierId) {
        q = query(q, where("courierId", "==", selectedCourierId));
    }

    if (startDate) {
        q = query(q, where("date", ">=", startDate));
    }
    if (endDate) {
        q = query(q, where("date", "<=", endDate));
    }

    onSnapshot(q, (snapshot) => {
        adminDataTableBody.innerHTML = '';
        const data = [];
        snapshot.forEach((doc) => {
            data.push({ id: doc.id, ...doc.data() });
        });

        data.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (data.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="12" class="text-center text-gray-500 py-4">მონაცემები არ მოიძებნა.</td>`;
            adminDataTableBody.appendChild(row);
        } else {
            data.forEach((docData) => {
                const user = allUsersData[docData.courierId];
                const courierName = user ? `${user.firstName} ${user.lastName}` : docData.courierId;
                const startDisplayTime = docData.startTimestamp ? new Date(docData.startTimestamp.toDate()).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';
                const endDisplayTime = docData.endTimestamp ? new Date(docData.endTimestamp.toDate()).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${courierName}</td>
                    <td>${docData.date}</td>
                    <td>${docData.startOdometer}</td>
                    <td>${docData.endOdometer !== null ? docData.endOdometer : 'N/A'}</td>
                    <td>${docData.dailyMileage !== null ? docData.dailyMileage.toFixed(2) : 'N/A'}</td>
                    <td>
                        <input type="number" step="0.01" value="${docData.fuelConsumed !== null ? docData.fuelConsumed : ''}"
                               class="w-20 p-1 border rounded" data-field="fuelConsumed" data-doc-id="${docData.id}">
                    </td>
                    <td>
                        <input type="number" step="0.01" value="${docData.fuelCost !== null ? docData.fuelCost : ''}"
                               class="w-20 p-1 border rounded" data-field="fuelCost" data-doc-id="${docData.id}">
                    </td>
                    <td>${docData.startImageUrl ? `<a href="${docData.startImageUrl}" target="_blank"><img src="${docData.startImageUrl}" alt="Start Odometer Image" class="w-20 h-12 object-cover rounded"></a>` : 'არ არის'}</td>
                    <td>${docData.endImageUrl ? `<a href="${docData.endImageUrl}" target="_blank"><img src="${docData.endImageUrl}" alt="End Odometer Image" class="w-20 h-12 object-cover rounded"></a>` : 'არ არის'}</td>
                    <td>${startDisplayTime}</td>
                    <td>${endDisplayTime}</td>
                    <td>
                        <button class="save-fuel-btn bg-green-500 hover:bg-green-600 text-white text-sm py-1 px-2 rounded"
                                data-doc-id="${docData.id}">შენახვა</button>
                    </td>
                `;
                adminDataTableBody.appendChild(row);
            });

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
                        }, { merge: true });

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
    element.className = 'message';
    element.classList.add(type);
    element.classList.remove('hidden');
    setTimeout(() => {
        element.classList.add('hidden');
    }, 5000);
}

// --- ბაზის გასუფთავების ლოგიკა ---

clearDatabaseBtn.addEventListener('click', () => {
    if (currentUserRole === 'admin') {
        passwordModal.classList.remove('hidden');
        passwordInput.value = '';
        modalMessageDiv.classList.add('hidden');
    } else {
        showMessage(adminMessageDiv, 'თქვენ არ გაქვთ უფლება ამ მოქმედების შესასრულებლად.', 'error');
    }
});

confirmClearBtn.addEventListener('click', async () => {
    const enteredPassword = passwordInput.value;
    const correctPassword = "12345678";

    if (enteredPassword === correctPassword) {
        modalMessageDiv.classList.add('hidden');
        passwordModal.classList.add('hidden');
        showMessage(adminMessageDiv, 'ბაზის გასუფთავება იწყება...', 'success');
        await clearDatabase();
    } else {
        showMessage(modalMessageDiv, 'არასწორი პაროლი!', 'error');
    }
});

cancelClearBtn.addEventListener('click', () => {
    passwordModal.classList.add('hidden');
    modalMessageDiv.classList.add('hidden');
});


async function clearDatabase() {
    try {
        const dailyReadingsRef = collection(db, "dailyReadings");
        const q = query(dailyReadingsRef);
        const snapshot = await getDocs(q);

        const deletePromises = [];
        const imageDeletePromises = [];

        snapshot.forEach(docItem => {
            const startImageUrl = docItem.data().startImageUrl;
            const endImageUrl = docItem.data().endImageUrl;

            if (startImageUrl) {
                const imageRef = ref(storage, startImageUrl);
                imageDeletePromises.push(deleteObject(imageRef).catch(error => {
                    console.warn(`სურათის წაშლის შეცდომა Storage-დან (${startImageUrl}):`, error);
                }));
            }
            if (endImageUrl) {
                const imageRef = ref(storage, endImageUrl);
                imageDeletePromises.push(deleteObject(imageRef).catch(error => {
                    console.warn(`სურათის წაშლის შეცდომა Storage-დან (${endImageUrl}):`, error);
                }));
            }
            deletePromises.push(deleteDoc(doc(db, "dailyReadings", docItem.id)));
        });

        await Promise.all(imageDeletePromises);
        await Promise.all(deletePromises);

        showMessage(adminMessageDiv, 'ბაზა წარმატებით გასუფთავდა!', 'success');
        loadAdminData();
    } catch (error) {
        console.error("ბაზის გასუფთავების შეცდომა:", error);
        showMessage(adminMessageDiv, 'ბაზის გასუფთავებისას მოხდა შეცდომა: ' + error.message, 'error');
    }
}
