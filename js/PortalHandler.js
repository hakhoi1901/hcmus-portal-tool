import { bookmarkletCode } from './Config.js'; 

export function setupBookmarklet() {
    const btn = document.getElementById('bookmark-btn');
    // Nếu có mã bookmarkletCode, gán vào href
    if (btn && bookmarkletCode) {
        btn.setAttribute('href', bookmarkletCode);
    }
}

export function openPortal() {
    const statusEl = document.getElementById('status-area');
    if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.className = '';
        statusEl.innerText = "Đang kết nối... Vui lòng thao tác trên Portal.";
    }
    // Mở trang portal (ví dụ trang login hoặc trang điểm)
    window.open("https://new-portal4.hcmus.edu.vn/SinhVien.aspx?pid=211", 'PortalWindow');
}