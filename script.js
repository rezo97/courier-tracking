// Firebase-ის საჭირო მოდულების იმპორტი
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js"; // Firebase Storage-ის იმპორტი

// შენი Firebase კონფიგურაციის მონაცემები
const firebaseConfig = {
  apiKey: "AIzaSyB4X0i9h8dSgxuJxl9ld6S21JuRHezMA-w", // <-- აქ ჩასვი შენი ზუსტი API Key
  authDomain: "courier-tracking-c36c5.firebaseapp.com",
  projectId: "courier-tracking-c36c5",
  storageBucket: "courier-tracking-c36c5.appspot.com", // storageBucket-ის შეცვლა .firebasestorage.app-დან .appspot.com-ზე
  messagingSenderId: "19606482959",
  appId: "1:19606482959:web:1f3c22799f66b0cf17337a",
  measurementId: "G-R2MZV6GDXB"
};

// Firebase აპლიკაციის ინიციალიზაცია
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);
const storage = getStorage(app); // Firebase Storage-ის ინიციალიზაცია

let currentUserId = null;
let currentUserRole = null;
let allUsersData = {}; // ყველა მომხმარებლის სახელის და გვარის შესანახად

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
const odometerImageInput = document.getElementById('odometerImage'); // სურათის input
const courierMessageDiv = document.getElementById('courierMessage');
const courierDataTableBody = document.getElementById('courierDataTableBody');

const adminPanel = document.getElementById('adminPanel');
const adminDataTableBody = document.getElementById('adminDataTableBody');
const adminMessageDiv = document.getElementById('adminMessage');
const filterCourierSelect = document.getElementById('filterCourier');
const filterStartDateInput = document.getElementById('filterStartDate');
const filterEndDateInput = document.getElementById('filterEndDate');
const applyFiltersBtn = document.getElementById('applyFiltersBtn');
const downloadExcelBtn = document.getElementById('downloadExcelBtn');


// მიმდინარე თარიღის დაყენება ინფუთ ველში
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
currentDateInput.value = `${year}-${month}-${day}`;
currentDateInput.setAttribute('max', currentDateInput.value); // კურიერს მხოლოდ მიმდინარე თარიღის შეყვანა შეეძლოს
currentDateInput.setAttribute('min', currentDateInput.value);


// --- UI გადამრთველები შესვლა/რეგისტრაციას შორის ---
showRegisterBtn.addEventListener('click', () => {
    loginSection.classList.add('hidden');
    registerSection.classList.remove('hidden');
    authMessageDiv.classList.add('hidden'); // შეტყობინების დამალვა
});

showLoginBtn.addEventListener('click', () => {
    registerSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
    authMessageDiv.classList.add('hidden'); // შეტყობინების დამალვა
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
        showLoginBtn.click(); // რეგისტრაციის შემდეგ შესვლის ფორმაზე გადასვლა
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
            // თუ მომხმარებელი არსებობს Auth-ში, მაგრამ არა Firestore-ში (ახალი რეგისტრირებული მომხმარებელი)
            // ეს მოხდება თუ რეგისტრაციისას მოხდა შეცდომა როლის შენახვისას
            console.warn("მომხმარებლის პროფილი Firestore-ში არ მოიძებნა. ნაგულისხმევი როლი: კურიერი.");
            currentUserRole = 'courier';
            userRoleDisplay.textContent = 'კურიერი';
            renderUIForRole(currentUserRole);

            // შექმენი პროფილი ნაგულისხმევი როლით, თუ არ არსებობს
            await setDoc(userDocRef, {
                email: user.email || "unknown@example.com",
                firstName: "უცნობი",
                lastName: "მომხმარებელი",
                role: 'courier',
                createdAt: serverTimestamp()
            }, { merge: true });
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
    authContainer.classList.add('hidden');
    courierPanel.classList.add('hidden');
    adminPanel.classList.add('hidden');

    if (role === 'courier') {
        courierPanel.classList.remove('hidden');
        loadCourierData(currentUserId); // კურიერის მონაცემების ჩატვირთვა
    } else if (role === 'admin') {
        adminPanel.classList.remove('hidden');
        loadAllUsersData(); // ყველა მომხმარებლის მონაცემების ჩატვირთვა (სახელებისთვის)
        loadAdminData(); // ადმინის მონაცემების ჩატვირთვა
    } else {
        authContainer.classList.remove('hidden'); // აჩვენე შესვლა/რეგისტრაცია
        loginSection.classList.remove('hidden'); // ნაგულისხმევად შესვლის ფორმა
        registerSection.classList.add('hidden');
    }
}

// --- ყველა მომხმარებლის მონაცემების ჩატვირთვა (სახელებისთვის) ---
async function loadAllUsersData() {
    const usersCollection = collection(db, "users");
    onSnapshot(usersCollection, (snapshot) => {
        allUsersData = {}; // გასუფთავება
        snapshot.forEach(doc => {
            allUsersData[doc.id] = doc.data();
        });
        populateCourierFilter(); // განაახლე კურიერების ფილტრი
        if (currentUserRole === 'admin') {
            loadAdminData(); // განაახლე ადმინის ცხრილიც
        }
    }, (error) => {
        console.error("ყველა მომხმარებლის მონაცემების ჩატვირთვის შეცდომა:", error);
    });
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
    const odometerImageFile = odometerImageInput.files[0];

    if (isNaN(startOdometer) || isNaN(endOdometer) || endOdometer < startOdometer) {
        showMessage(courierMessageDiv, 'შეყვანილი მონაცემები არასწორია. საბოლოო ოდომეტრი არ უნდა იყოს საწყისზე ნაკლები.', 'error');
        return;
    }

    const dailyMileage = endOdometer - startOdometer;
    let imageUrl = null;
    let imageUploadTimestamp = null;

    if (odometerImageFile) {
        try {
            const storageRef = ref(storage, `odometer_images/${currentUserId}/${Date.now()}_${odometerImageFile.name}`);
            const uploadResult = await uploadBytes(storageRef, odometerImageFile);
            imageUrl = await getDownloadURL(uploadResult.ref);
            imageUploadTimestamp = serverTimestamp(); // სურათის ატვირთვის დრო
        } catch (error) {
            console.error("სურათის ატვირთვის შეცდომა:", error);
            showMessage(courierMessageDiv, 'სურათის ატვირთვისას მოხდა შეცდომა: ' + error.message, 'error');
            return; // შეაჩერე მონაცემების შენახვა, თუ სურათი ვერ აიტვირთა
        }
    }

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
            imageUrl: imageUrl, // სურათის URL
            imageUploadTimestamp: imageUploadTimestamp, // სურათის ატვირთვის დრო
            timestamp: serverTimestamp() // ჩანაწერის შექმნის დრო
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
        // orderBy("timestamp", "desc") // Firebase-ში ინდექსირებაა საჭირო orderBy-სთვის
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
            row.innerHTML = `<td colspan="6" class="text-center text-gray-500 py-4">მონაცემები არ მოიძებნა.</td>`;
            courierDataTableBody.appendChild(row);
        } else {
            data.forEach((docData) => {
                const row = document.createElement('tr');
                const displayTime = docData.timestamp ? new Date(docData.timestamp.toDate()).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';
                row.innerHTML = `
                    <td>${docData.date}</td>
                    <td>${docData.startOdometer}</td>
                    <td>${docData.endOdometer}</td>
                    <td>${docData.dailyMileage ? docData.dailyMileage.toFixed(2) : 'N/A'}</td>
                    <td>${docData.imageUrl ? `<a href="${docData.imageUrl}" target="_blank"><img src="${docData.imageUrl}" alt="Odometer Image" class="w-20 h-12 object-cover rounded"></a>` : 'არ არის'}</td>
                    <td>${displayTime}</td>
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
    
    // Header row
    const headers = Array.from(table.closest('table').querySelectorAll('thead th')).map(th => th.innerText).join(',');
    csv.push(headers);

    // Data rows
    Array.from(table.rows).forEach(row => {
        const rowData = Array.from(row.cells).map((cell, index) => {
            if (index === 5 || index === 6) { // Fuel Consumed and Fuel Cost columns
                const input = cell.querySelector('input');
                return input ? input.value : '';
            } else if (index === 7) { // Image column
                const imgLink = cell.querySelector('a');
                return imgLink ? imgLink.href : 'არ არის';
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

    // ფილტრაცია კურიერის მიხედვით
    if (selectedCourierId) {
        q = query(q, where("courierId", "==", selectedCourierId));
    }

    // ფილტრაცია თარიღის მიხედვით
    if (startDate) {
        // Firebase-ში Date ობიექტებთან მუშაობა query-ში
        q = query(q, where("date", ">=", startDate));
    }
    if (endDate) {
        q = query(q, where("date", "<=", endDate));
    }

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
            row.innerHTML = `<td colspan="10" class="text-center text-gray-500 py-4">მონაცემები არ მოიძებნა.</td>`;
            adminDataTableBody.appendChild(row);
        } else {
            data.forEach((docData) => {
                const user = allUsersData[docData.courierId];
                const courierName = user ? `${user.firstName} ${user.lastName}` : docData.courierId;
                const displayTime = docData.timestamp ? new Date(docData.timestamp.toDate()).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${courierName}</td>
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
                    <td>${docData.imageUrl ? `<a href="${docData.imageUrl}" target="_blank"><img src="${docData.imageUrl}" alt="Odometer Image" class="w-20 h-12 object-cover rounded"></a>` : 'არ არის'}</td>
                    <td>${displayTime}</td>
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
