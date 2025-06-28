// script.js (V2 - 支持注册与验证)

// --- Firebase 初始化 (保持不变) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, setDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAcFMwadXYhqWNegNDFNu6VDF554Da3ys8",
    authDomain: "project-473332034526737129.firebaseapp.com",
    projectId: "project-473332034526737129",
    storageBucket: "project-473332034526737129.firebasestorage.app",
    messagingSenderId: "595259703995",
    appId: "1:595259703995:web:a54f6957f35554ccf05f9e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- DOM 元素获取 (新增和修改) ---
const loginSection = document.getElementById('login-section');
const mainContent = document.getElementById('main-content');

// 表单元素
const formTitle = document.getElementById('form-title');
const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');
const emailGroup = document.getElementById('email-group');
const confirmPasswordGroup = document.getElementById('confirm-password-group');
const authButton = document.getElementById('auth-button');
const formError = document.getElementById('form-error');
const authSwitchLink = document.querySelector('#auth-switch a');
const authSwitchP = document.getElementById('auth-switch');


// 主内容元素 (保持不变)
const logoutButton = document.getElementById('logoutButton');
const welcomeUserSpan = document.getElementById('welcome-user');
const progressBarElement = document.getElementById('progressBar');
const timeRemainingElement = document.getElementById('time-remaining');
const currentYearSpan = document.getElementById('currentYear');
const memoryTextInput = document.getElementById('memoryText');
const shareButton = document.getElementById('shareButton');
const memoryFeed = document.getElementById('memory-feed');

// --- 状态变量 ---
let isRegisterMode = false; // 用于切换登录/注册模式

// --- UI 更新函数 ---
function toggleAuthMode() {
    isRegisterMode = !isRegisterMode; // 切换模式
    formError.textContent = ''; // 清空错误信息

    if (isRegisterMode) {
        // 切换到注册模式
        formTitle.textContent = '同学请注册';
        authButton.textContent = '注册';
        emailGroup.classList.remove('hidden');
        confirmPasswordGroup.classList.remove('hidden');
        authSwitchP.innerHTML = '已有账户？<a href="#">立即登录</a>';
    } else {
        // 切换到登录模式
        formTitle.textContent = '同学请登录';
        authButton.textContent = '登录';
        emailGroup.classList.add('hidden');
        confirmPasswordGroup.classList.add('hidden');
        authSwitchP.innerHTML = '还没有账户？<a href="#">立即注册</a>';
    }
}

// --- 认证核心功能 ---
async function handleAuthAction(event) {
    event.preventDefault();
    formError.textContent = '';
    
    // 从输入框获取值
    const studentId = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (isRegisterMode) {
        // --- 处理注册 ---
        const confirmPassword = confirmPasswordInput.value;
        if (!studentId || !email || !password || !confirmPassword) {
            formError.textContent = '请填写所有注册项。';
            return;
        }
        if (password !== confirmPassword) {
            formError.textContent = '两次输入的密码不一致。';
            return;
        }

        try {
            // 1. 使用邮箱和密码创建用户
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // 2. 将学号等额外信息存入 Firestore
            // 我们以用户的唯一ID (uid) 作为文档名，来存储他们的学号
            await setDoc(doc(db, "users", user.uid), {
                studentId: studentId,
                email: email
            });

            // 3. 发送验证邮件
            await sendEmailVerification(user);
            alert('注册成功！一封验证邮件已发送到您的邮箱，请点击邮件中的链接以完成验证。');

            // 注册成功后会自动登录，onAuthStateChanged会处理后续UI

        } catch (error) {
            console.error("注册失败:", error.code, error.message);
            if (error.code === 'auth/email-already-in-use') {
                formError.textContent = '该邮箱已被注册。';
            } else if (error.code === 'auth/weak-password') {
                formError.textContent = '密码太弱，请至少使用6位字符。';
            } else {
                formError.textContent = '注册失败，请检查您的信息。';
            }
        }

    } else {
        // --- 处理登录 ---
        // 注意：登录时我们不再需要学号，而是用邮箱
        if (!emailInput.value.trim() || !password) {
            formError.textContent = '请输入邮箱和密码进行登录。';
             // 为了兼容旧的登录方式，我们临时把邮箱输入框显示出来
            emailGroup.classList.remove('hidden');
            formTitle.textContent = '请输入邮箱和密码登录';
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // 登录成功，onAuthStateChanged会处理后续UI变化
        } catch (error) {
            console.error("登录失败:", error.code);
            formError.textContent = '邮箱或密码错误，请重试！';
        }
    }
}

// --- 登出、分享、获取分享等功能 (与之前版本类似，但有微调) ---

// 登出
async function handleLogout() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("登出失败:", error);
    }
}

// 发布分享
async function handleShare(event) {
    event.preventDefault();
    const text = memoryTextInput.value.trim();
    const user = auth.currentUser;

    if (!text || !user) {
        alert('请输入内容后再发布！');
        return;
    }

    try {
        await addDoc(collection(db, "memories"), {
            text: text,
            authorUid: user.uid, // 保存用户的唯一ID
            authorEmail: user.email, // 保存用户的邮箱
            createdAt: new Date()
        });
        memoryTextInput.value = '';
    } catch (error) {
        console.error("发布失败: ", error);
        alert('发布失败，请检查网络后重试。');
    }
}

// 获取分享
function fetchMemories() {
    const q = query(collection(db, "memories"), orderBy("createdAt", "desc"));
    onSnapshot(q, (querySnapshot) => {
        memoryFeed.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const post = doc.data();
            const postElement = document.createElement('article');
            postElement.classList.add('memory-post');
            const postDate = post.createdAt.toDate().toLocaleString('zh-CN');
            // 显示作者的邮箱，你也可以后续通过uid去users集合里查询学号再显示
            const authorIdentifier = post.authorEmail.split('@')[0];
            postElement.innerHTML = `
                <p class="author">${authorIdentifier}</p>
                <p class="timestamp">${postDate}</p>
                <p class="content-text">${post.text.replace(/\n/g, '<br>')}</p>
            `;
            memoryFeed.appendChild(postElement);
        });
    });
}

// 进度条等工具函数 (保持不变)
const startDate = new Date('2021-09-01');
const endDate = new Date('2026-07-01');
function updateProgressAndTime() { /* ... 代码和之前一样，此处省略 ... */ }
function updateFooterYear() { /* ... 代码和之前一样，此处省略 ... */ }


// --- 总开关：监听认证状态 ---
onAuthStateChanged(auth, user => {
    if (user) {
        // 用户已登录
        loginSection.classList.add('hidden');
        mainContent.classList.remove('hidden');
        logoutButton.classList.remove('hidden');
        
        // 欢迎信息，优先显示邮箱，如果能查到学号则更好（高级功能）
        welcomeUserSpan.textContent = `欢迎，${user.email}`;

        // 如果用户邮箱未验证，可以给一个提示
        if (!user.emailVerified) {
            const verificationPrompt = document.createElement('p');
            verificationPrompt.innerHTML = '您的邮箱还未验证，部分功能可能受限。 <a href="#" id="resend-verification">重新发送验证邮件</a>';
            verificationPrompt.style.color = 'orange';
            welcomeUserSpan.after(verificationPrompt);
            document.getElementById('resend-verification').addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    await sendEmailVerification(user);
                    alert('新的验证邮件已发送！');
                } catch (error) {
                    alert('发送失败，请稍后再试。');
                }
            });
        }
        
        updateProgressAndTime();
        updateFooterYear();
        fetchMemories();
    } else {
        // 用户未登录
        mainContent.classList.add('hidden');
        loginSection.classList.remove('hidden');
        memoryFeed.innerHTML = '';
    }
});

// --- 事件监听器 ---
authSwitchLink.parentElement.addEventListener('click', (e) => {
    e.preventDefault();
    toggleAuthMode();
});
authButton.addEventListener('click', handleAuthAction);
logoutButton.addEventListener('click', handleLogout);
shareButton.addEventListener('click', handleShare);
