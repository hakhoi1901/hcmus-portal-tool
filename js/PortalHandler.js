// ================= PORTALHANDLER.JS =================
// Module xử lý các tác vụ liên quan đến Portal
// Cài đặt nút bookmarklet và mở cửa sổ kết nối
// ====================================================

import { PORTAL_URL, bookmarkletCode } from './Config.js';

// Hàm thiết lập nút kéo thả Bookmarklet trên giao diện
export function setupBookmarklet() {
    // Lấy phần tử nút bấm (thẻ <a>) từ DOM theo ID bookmark-btn
    const btn = document.getElementById('bookmark-btn');

    // Nếu nút tồn tại, gán đoạn mã javascript bookmarklet vào thuộc tính href
    if (btn) {
        btn.setAttribute('href', bookmarkletCode);
    }
}

// Hàm được gọi khi người dùng bấm mở portal
export function openPortal() {
    // Truy xuất nơi hiển thị trạng thái
    const statusEl = document.getElementById('status-area');

    if (statusEl) {
        // Đảm bảo khung trạng thái hiển thị (phòng trường hợp đang bị ẩn)
        statusEl.style.display = 'block';

        // Reset toàn bộ class đưa trạng thái về mặc định, tránh nhầm lẫn với kết quả cũ.
        statusEl.className = '';

        // Thông báo cho người dùng biết hệ thống đang chờ dữ liệu
        statusEl.innerText = "Đang kết nối... Vui lòng thực hiện thao tác trên Portal.";
    }
    // Mở trang portal URL lấy từ config trong một tab mới
    window.open(PORTAL_URL, 'PortalWindow'); // PortalWindow: tên định danh cho tab để tranh mở nhiều tab
}