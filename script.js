const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const previewArea = document.getElementById('previewArea');
const originalImage = document.getElementById('originalImage');
const resultCanvas = document.getElementById('resultCanvas');
const actions = document.getElementById('actions');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');

uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#764ba2';
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '#667eea';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#667eea';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        processImage(file);
    }
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) processImage(file);
});

function processImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        originalImage.src = e.target.result;
        originalImage.onload = () => {
            removeBackground();
            uploadArea.style.display = 'none';
            previewArea.style.display = 'grid';
            actions.style.display = 'flex';
        };
    };
    reader.readAsDataURL(file);
}

function removeBackground() {
    const ctx = resultCanvas.getContext('2d');
    resultCanvas.width = originalImage.width;
    resultCanvas.height = originalImage.height;
    
    ctx.drawImage(originalImage, 0, 0);
    const imageData = ctx.getImageData(0, 0, resultCanvas.width, resultCanvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const brightness = (r + g + b) / 3;
        if (brightness > 200 || (Math.abs(r - g) < 30 && Math.abs(g - b) < 30)) {
            data[i + 3] = 0;
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'removed-background.png';
    link.href = resultCanvas.toDataURL('image/png');
    link.click();
});

resetBtn.addEventListener('click', () => {
    uploadArea.style.display = 'block';
    previewArea.style.display = 'none';
    actions.style.display = 'none';
    fileInput.value = '';
});
