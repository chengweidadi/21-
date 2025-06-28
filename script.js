// script.js (最终功能版)

// 1. 从 Firebase 的 CDN 引入我们需要的模块
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// 2. 你的 Firebase 配置 (已更新为你的新项目)
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

// --- DOM 元素获取 (保持不变) ---
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

// --- 日期和进度条 (保持不变) ---
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

// --- 【全新】Firebase 核心功能 ---

// 1. 监听认证状态变化 (这是整个应用的总开关)
onAuthStateChanged(auth, user => {
    if (user) {
        // 用户已登录
        console.log('用户已登录:', user);
        loginSection.classList.add('hidden');
        mainContent.classList.remove('hidden');
        logoutButton.classList.remove('hidden');
        // 从 user.email 中提取学号，例如 "217802201@example.com" -> "217802201"
        const studentId = user.email.split('@')[0];
        if (welcomeUserSpan) welcomeUserSpan.textContent = `欢迎，${studentId}`;

        // 初始化主页内容
        updateProgressAndTime();
        updateFooterYear();
        fetchMemories(); // 登录后开始获取分享内容
    } else {
        // 用户未登录或已登出
        console.log('用户未登录');
        mainContent.classList.add('hidden');
        logoutButton.classList.add('hidden');
        loginSection.classList.remove('hidden');
        if (welcomeUserSpan) welcomeUserSpan.textContent = '';
        memoryFeed.innerHTML = ''; // 清空分享内容
    }
});

// 2. 【全新】处理登录
async function handleLogin(event) {
    event.preventDefault();
    loginError.textContent = ''; // 清空之前的错误
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
        // 登录成功，onAuthStateChanged 会自动处理后续UI变化
    } catch (error) {
        console.error("登录失败:", error.code);
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            loginError.textContent = '学号或密码错误，请重试！';
        } else {
            loginError.textContent = '登录时发生未知错误。';
        }
    }
}

// 3. 【全新】处理登出
async function handleLogout() {
    try {
        await signOut(auth);
        // 登出成功，onAuthStateChanged 会自动处理后续UI变化
        usernameInput.value = '';
        passwordInput.value = '';
    } catch (error) {
        console.error("登出失败:", error);
    }
}

// 4. 【全新】处理发布分享 (保存到 Firestore)
async function handleShare(event) {
    event.preventDefault();
    const text = memoryTextInput.value.trim();
    const user = auth.currentUser;

    if (!text || !user) {
        alert('请输入内容后再发布！');
        return;
    }

    try {
        // "memories" 是数据库里集合的名称
        await addDoc(collection(db, "memories"), {
            text: text,
            authorId: user.email.split('@')[0], // 只保存学号
            createdAt: new Date() // 使用服务器时间戳更佳，但本地时间也行
        });
        memoryTextInput.value = ''; // 清空输入框
        memoryImageInput.value = null; // 清空文件选择
    } catch (error) {
        console.error("发布失败: ", error);
        alert('发布失败，请检查网络后重试。');
    }
}

// 5. 【全新】从 Firestore 实时获取并显示分享
function fetchMemories() {
    const memoriesCollection = collection(db, "memories");
    const q = query(memoriesCollection, orderBy("createdAt", "desc")); // 按时间倒序排列

    onSnapshot(q, (querySnapshot) => {
        memoryFeed.innerHTML = ''; // 清空旧内容
        querySnapshot.forEach((doc) => {
            const post = doc.data();
            const postElement = document.createElement('article');
            postElement.classList.add('memory-post');
            
            // 将 Firestore 的时间戳对象转换为可读日期
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


// --- 事件监听器 (绑定新的函数) ---
loginButton.addEventListener('click', handleLogin);
passwordInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        handleLogin(event);
    }
});
logoutButton.addEventListener('click', handleLogout);
shareButton.addEventListener('click', handleShare);
