// script.js

// --- 全局变量和配置 ---
// !!! 极其不安全的做法，仅用于前端演示 !!!
const validUsernames = [];
for (let i = 1; i <= 40; i++) {
    validUsernames.push(`2178022${i < 10 ? '0' + i : i}`);
}
const validPassword = '666666'; // 固定密码

// !!! 五年学习生涯日期 !!!
const startDate = new Date('2021-09-01');
const endDate = new Date('2026-07-01');

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
const memoryImageInput = document.getElementById('memoryImage'); // 获取图片输入元素

// --- 函数定义 ---

// 更新进度条和剩余时间
function updateProgressAndTime() {
    const now = new Date();
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsedDuration = now.getTime() - startDate.getTime();

    let progressPercentage = 0;
    if (totalDuration <= 0) { // 防止除以0或负数
        progressPercentage = 100;
    } else if (now >= endDate) {
        progressPercentage = 100;
    } else if (now > startDate) {
        progressPercentage = Math.min(100, (elapsedDuration / totalDuration) * 100);
    }

    if (progressBarElement) {
        progressBarElement.style.width = progressPercentage.toFixed(2) + '%';
        progressBarElement.textContent = progressPercentage.toFixed(1) + '%';
    }

    if (timeRemainingElement) {
        if (now >= endDate) {
            timeRemainingElement.textContent = "五年时光已圆满！";
        } else if (now < startDate) {
            timeRemainingElement.textContent = "旅程即将开始...";
        } else {
            const remainingMilliseconds = endDate.getTime() - now.getTime();
            const remainingDays = Math.ceil(remainingMilliseconds / (1000 * 60 * 60 * 24));
            timeRemainingElement.textContent = `剩余约 ${remainingDays} 天，请珍惜！`;
        }
    }
}

// 更新页脚年份
function updateFooterYear() {
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }
}

// 处理登录
function handleLogin(event) {
    event.preventDefault(); // 阻止表单默认提交
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (validUsernames.includes(username) && password === validPassword) {
        // 登录成功
        loginSection.classList.add('hidden');
        mainContent.classList.remove('hidden');
        logoutButton.classList.remove('hidden');
        if(welcomeUserSpan) welcomeUserSpan.textContent = `欢迎，${username}`;
        loginError.textContent = ''; // 清除错误信息
        // 使用 sessionStorage 存储登录状态和用户名 (关闭浏览器标签页即失效)
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('loggedInUser', username);
        // 更新进度条等主页面内容
        updateProgressAndTime();
        updateFooterYear();
    } else {
        // 登录失败
        loginError.textContent = '学号或密码错误，请重试！';
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('loggedInUser');
    }
}

// 处理登出
function handleLogout() {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('loggedInUser');
    mainContent.classList.add('hidden');
    logoutButton.classList.add('hidden');
    loginSection.classList.remove('hidden');
    if(welcomeUserSpan) welcomeUserSpan.textContent = ''; // 清空欢迎信息
    usernameInput.value = ''; // 清空输入框
    passwordInput.value = ''; // 清空输入框
}

// 处理发布分享 (前端模拟)
function handleShare(event) {
    event.preventDefault(); // 阻止可能的表单提交行为
    const text = memoryTextInput.value.trim();
    const imageFile = memoryImageInput.files[0]; // 获取选中的文件
    const currentUser = sessionStorage.getItem('loggedInUser') || '匿名用户'; // 获取当前登录用户

    if (!text && !imageFile) {
        alert('请输入内容或选择图片后再发布！');
        return;
    }

    const timestamp = new Date().toLocaleString('zh-CN'); // 获取当前时间

    // 创建新的帖子元素
    const postElement = document.createElement('article');
    postElement.classList.add('memory-post');

    let imageHTML = '';
    if (imageFile) {
        // 使用 FileReader 在前端预览图片 (注意：这不会上传图片)
        const reader = new FileReader();
        reader.onload = function(e) {
            // 图片加载完成后再完整构建帖子内容
            imageHTML = `<img src="${e.target.result}" alt="用户分享的图片">`;
            postElement.innerHTML = `
                <p class="author">${currentUser}</p>
                <p class="timestamp">${timestamp}</p>
                ${text ? `<p class="content-text">${text.replace(/\n/g, '<br>')}</p>` : ''} <!-- 处理换行 -->
                ${imageHTML}
            `;
             // 将新帖子添加到信息流的顶部
            memoryFeed.prepend(postElement);
        }
        reader.readAsDataURL(imageFile); // 读取文件内容为 Data URL
    } else {
         // 如果没有图片，直接构建帖子内容
         postElement.innerHTML = `
            <p class="author">${currentUser}</p>
            <p class="timestamp">${timestamp}</p>
            ${text ? `<p class="content-text">${text.replace(/\n/g, '<br>')}</p>` : ''} <!-- 处理换行 -->
        `;
         // 将新帖子添加到信息流的顶部
        memoryFeed.prepend(postElement);
    }


    // 清空输入框和文件选择
    memoryTextInput.value = '';
    memoryImageInput.value = null; // 清空文件选择
}

// --- 事件监听器 ---

// 页面加载完成后执行初始化检查
document.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    const loggedInUser = sessionStorage.getItem('loggedInUser');

    if (isLoggedIn && loggedInUser) {
        // 如果已登录，直接显示主内容
        loginSection.classList.add('hidden');
        mainContent.classList.remove('hidden');
        logoutButton.classList.remove('hidden');
        if(welcomeUserSpan) welcomeUserSpan.textContent = `欢迎，${loggedInUser}`;
        updateProgressAndTime(); // 更新进度条
        updateFooterYear(); // 更新年份
    } else {
        // 未登录，显示登录界面
        loginSection.classList.remove('hidden');
        mainContent.classList.add('hidden');
    }

    // 为登录按钮添加事件监听
    if (loginButton) {
        loginButton.addEventListener('click', handleLogin);
    }
    // 为密码框添加回车登录事件监听
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                handleLogin(event);
            }
        });
    }

    // 为登出按钮添加事件监听
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    // 为发布按钮添加事件监听
    if (shareButton) {
        shareButton.addEventListener('click', handleShare);
    }

    // 定期更新进度条和时间（例如每分钟） - 可选
    // setInterval(updateProgressAndTime, 60000);
});