// script.js (稳定登录版)

// 1. 从 Firebase 的 CDN 引入我们需要的模块
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, getDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// 2. 你的 Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyAcFMwadXYhqWNegNDFNu6VDF554Da3ys8",
  authDomain: "project-473332034526737129.firebaseapp.com",
  projectId: "project-473332034526737129",
  storageBucket: "project-473332034526737129.firebasestorage.app",
  messagingSenderId: "595259703995",
  appId: "1:595259703995:web:a54f6957f35554ccf05f9e"
};

// 3. 初始化 Firebase 服务
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- DOM 元素获取 ---
const loginSection = document.getElementById('login-section');
const mainContent = document.getElementById('main-content');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('loginButton');
const loginError = document.getElementById('login-error');
const logoutButton = document.getElementById('logoutButton');
const welcomeUserSpan = document.getElementById('welcome-user');
const progressBarElement = document.getElementById('progressBar');
const timeRemainingElement = document.getElementById('time-remaining');
const currentYearSpan = document.getElementById('currentYear');
const memoryTextInput = document.getElementById('memoryText');
const shareButton = document.getElementById('shareButton');
const memoryFeed = document.getElementById('memory-feed');
const memoryImageInput = document.getElementById('memoryImage');

// --- 日期和进度条 ---
const startDate = new Date('2021-09-01');
const endDate = new Date('2026-07-01');

function updateProgressAndTime() {
    const now = new Date();
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsedDuration = now.getTime() - startDate.getTime();
    let progressPercentage = 0;
    if (totalDuration <= 0) { progressPercentage = 100; }
    else if (now >= endDate) { progressPercentage = 100; }
    else if (now > startDate) { progressPercentage = Math.min(100, (elapsedDuration / totalDuration) * 100); }
    if (progressBarElement) {
        progressBarElement.style.width = progressPercentage.toFixed(2) + '%';
        progressBarElement.textContent = progressPercentage.toFixed(1) + '%';
    }
    if (timeRemainingElement) {
        if (now >= endDate) { timeRemainingElement.textContent = "五年时光已圆满！"; }
        else if (now < startDate) { timeRemainingElement.textContent = "旅程即将开始..."; }
        else {
            const remainingDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            timeRemainingElement.textContent = `剩余约 ${remainingDays} 天，请珍惜！`;
        }
    }
}

function updateFooterYear() {
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }
}

// --- Firebase 核心功能 ---

// 1. 监听认证状态变化
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // 用户已登录
        loginSection.classList.add('hidden');
        mainContent.classList.remove('hidden');
        logoutButton.classList.remove('hidden');
        
        // 从 Firestore 获取学号来显示欢迎信息
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        const studentId = userDoc.exists() ? userDoc.data().studentId : user.email.split('@')[0];
        if (welcomeUserSpan) welcomeUserSpan.textContent = `欢迎，${studentId}`;

        // 初始化主页内容
        updateProgressAndTime();
        updateFooterYear();
        fetchMemories();
    } else {
        // 用户未登录或已登出
        mainContent.classList.add('hidden');
        loginSection.classList.remove('hidden');
        if (welcomeUserSpan) welcomeUserSpan.textContent = '';
        memoryFeed.innerHTML = '';
    }
});

// 2. 处理登录
async function handleLogin(event) {
    event.preventDefault();
    loginError.textContent = '';
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        loginError.textContent = '请输入学号和密码。';
        return;
    }

    // 将学号包装成Firebase认证需要的邮箱格式
    const email = `${username}@example.com`;

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error("登录失败:", error.code);
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            loginError.textContent = '学号或密码错误，请重试！';
        } else {
            loginError.textContent = '登录时发生未知错误。';
        }
    }
}

// 3. 处理登出
async function handleLogout() {
    try {
        await signOut(auth);
        usernameInput.value = '';
        passwordInput.value = '';
    } catch (error) {
        console.error("登出失败:", error);
    }
}

// 4. 处理发布分享 (保存到 Firestore)
async function handleShare(event) {
    event.preventDefault();
    const text = memoryTextInput.value.trim();
    const user = auth.currentUser;

    if (!text || !user) {
        alert('请输入内容后再发布！');
        return;
    }

    try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        const studentId = userDoc.exists() ? userDoc.data().studentId : user.email;

        await addDoc(collection(db, "memories"), {
            text: text,
            authorId: studentId,
            createdAt: new Date()
        });
        memoryTextInput.value = '';
        memoryImageInput.value = null;
    } catch (error) {
        console.error("发布失败: ", error);
        alert('发布失败，请检查网络后重试。');
    }
}

// 5. 从 Firestore 实时获取并显示分享
function fetchMemories() {
    const memoriesCollection = collection(db, "memories");
    const q = query(memoriesCollection, orderBy("createdAt", "desc"));

    onSnapshot(q, (querySnapshot) => {
        memoryFeed.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const post = doc.data();
            const postElement = document.createElement('article');
            postElement.classList.add('memory-post');
            const postDate = post.createdAt.toDate().toLocaleString('zh-CN');

            postElement.innerHTML = `
                <p class="author">${post.authorId}</p>
                <p class="timestamp">${postDate}</p>
                <p class="content-text">${post.text.replace(/\n/g, '<br>')}</p>
            `;
            memoryFeed.appendChild(postElement);
        });
    });
}

// --- 事件监听器 ---
loginButton.addEventListener('click', handleLogin);
passwordInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        handleLogin(event);
    }
});
logoutButton.addEventListener('click', handleLogout);
shareButton.addEventListener('click', handleShare);
