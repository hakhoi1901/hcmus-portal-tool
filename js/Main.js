// =================== MAIN.JS ====================
// Hàm khởi đầu và import các file js
// ================================================

import { setupBookmarklet, openPortal } from './PortalHandler.js';
import { renderDashboardUI } from './render/Dashboard.js';

// Setup bookmarklet
setupBookmarklet();

// Gán hàm openPortal vào window để nút bấm HTML onclick="openPortal()" có thể gọi được
window.openPortal = openPortal;

// Lắng nghe sự kiện 'message' từ tab portal.
window.addEventListener("message", (event) => {
    // Kiểm tra có sự kiện dữ liệu mới từ portal
    if (event.data && event.data.type === 'PORTAL_DATA') {
        // Lấy dữ liệu từ sự kiện
        const payload = event.data.payload;

        // DOM cập nhật trạng thái người dùng
        const statusEl = document.getElementById('status-area');
        if (statusEl) {
            // Báo thành công
            statusEl.innerText = "Đồng bộ thành công! (Điểm, Lịch thi, Học phí)";
            // Thêm class để kích hoạt CSS styling (màu xanh lá)
            statusEl.classList.add('success');
        }

        // render và lưu dữ liệu mới nhận được
        renderDashboardUI(payload);
        localStorage.setItem('student_db_full', JSON.stringify(payload)); // dùng JSON.stringify để ép kiểu object sang string.
    }
}, false);

// Load lại data cũ
window.onload = () => {
    // Đọc dữ liệu từ ổ cứng local storage với tên student_db_full
    const oldData = localStorage.getItem('student_db_full');
    if (oldData) {
        try {
            // Đảo chuỗi từ json sang object
            const data = JSON.parse(oldData);

            // Render dữ liệu cũ từ local storage
            renderDashboardUI(data);

            // Thông báo cho user biết đây là dữ liệu cũ.
            const statusEl = document.getElementById('status-area');
            if (statusEl) {
                statusEl.style.display = 'block';
                statusEl.innerText = "Đã tải lại dữ liệu cũ.";
            }
        } catch (e) {
            console.log("Data cũ lỗi");
        }
    }
};