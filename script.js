const REMOVE_BG_API_KEY = 'GyCGMy55pTqCYWuavCp2HG3H';

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const loading = document.getElementById('loading');
const previewArea = document.getElementById('previewArea');
const originalImage = document.getElementById('originalImage');
const resultImage = document.getElementById('resultImage');
const actions = document.getElementById('actions');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const errorDiv = document.getElementById('error');
const errorMsg = document.getElementById('errorMsg');

let resultBlob = null;

uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        processImage(file);
    }
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) processImage(file);
});

async function processImage(file) {
    // 显示原图
    const reader = new FileReader();
    reader.onload = (e) => { originalImage.src = e.target.result; };
    reader.readAsDataURL(file);

    // 切换到加载状态
    uploadArea.style.display = 'none';
    errorDiv.style.display = 'none';
    loading.style.display = 'block';
    previewArea.style.display = 'none';
    actions.style.display = 'none';

    try {
        const formData = new FormData();
        formData.append('image_file', file);
        formData.append('size', 'auto');

        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            headers: {
                'X-Api-Key': REMOVE_BG_API_KEY,
            },
            body: formData,
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const msg = errData.errors?.[0]?.title || `请求失败 (${response.status})`;
            throw new Error(msg);
        }

        resultBlob = await response.blob();
        const resultUrl = URL.createObjectURL(resultBlob);
        resultImage.src = resultUrl;

        loading.style.display = 'none';
        previewArea.style.display = 'grid';
        actions.style.display = 'flex';

    } catch (err) {
        loading.style.display = 'none';
        uploadArea.style.display = 'block';
        errorDiv.style.display = 'block';
        errorMsg.textContent = '处理失败：' + err.message;
    }
}

downloadBtn.addEventListener('click', () => {
    if (!resultBlob) return;
    const link = document.createElement('a');
    link.download = 'removed-background.png';
    link.href = URL.createObjectURL(resultBlob);
    link.click();
});

resetBtn.addEventListener('click', () => {
    uploadArea.style.display = 'block';
    previewArea.style.display = 'none';
    actions.style.display = 'none';
    errorDiv.style.display = 'none';
    fileInput.value = '';
    resultBlob = null;
});
