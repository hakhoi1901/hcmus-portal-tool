/**
 * Main.js - Entry Point (Nhạc trưởng)
 * Nhiệm vụ: Khởi tạo ứng dụng, lắng nghe sự kiện từ Portal, và điều phối luồng dữ liệu.
 */

import { setupBookmarklet, openPortal } from './PortalHandler.js';
import { initApp, processPortalData } from './Utils.js';
import { onNutBamXepLich } from './Logic.js';
import { renderNewUI, renderSidebar, updateHeaderUI } from './render/NewUI.js';
import {
    handleSaveSchedule, 
    openSavedSchedulesModal, 
    loadSavedSchedule, 
    removeSavedSchedule,
    renderScheduleResults,
    renderExamSchedule
} from './render/NewUI.js'

// --- 1. SETUP BAN ĐẦU ---
setupBookmarklet();

// Export các hàm Global cần thiết cho HTML (onClick events)
Object.assign(window, {
    openPortal,         // Mở trang Portal
    onNutBamXepLich,
    toggleNewRow,       // Tick chọn môn
    filterCourses,      // Tìm kiếm môn
    openInfoModal,      // Popup Info
    openPrereqModal,    // Popup Flowchart
    closeModal,         // Đóng Popup
    handleSaveSchedule, 
    openSavedSchedulesModal, 
    loadSavedSchedule, 
    removeSavedSchedule,
    renderScheduleResults,
    renderExamSchedule
});

// Gắn sự kiện cho nút tĩnh (nếu có)
const btnPortal = document.getElementById('btn-open-portal');
if (btnPortal) btnPortal.addEventListener('click', openPortal);

// --- 2. LẮNG NGHE DỮ LIỆU TỪ BOOKMARKLET ---
window.addEventListener("message", (event) => {
    // Security check
    if (!event.data || !event.data.type) return;

    const { type, payload } = event.data;

    // Case A: Dữ liệu Sinh Viên (Điểm, Lịch thi...)
    if (type === 'PORTAL_DATA') {
        console.log("📥 Main: Đã nhận dữ liệu Sinh viên.");
        // Lưu và xử lý bên Utils (để đồng bộ logic)
        processPortalData(null, payload); 
    }

    // Case B: Dữ liệu Lớp Mở (Quan trọng cho xếp lịch)
    if (type === 'OPEN_CLASS_DATA') {
        console.log(`📥 Main: Đã nhận ${payload.length} lớp mở.`);
        processPortalData(payload, null);
    }
}, false);

// --- 3. KHỞI ĐỘNG ỨNG DỤNG ---
// Khi trang load xong, gọi hàm initApp bên Utils để nạp dữ liệu từ Cache
window.onload = () => {
    initApp();
};

// --- QUAN TRỌNG: Gán hàm vào window để HTML gọi được ---
window.onNutBamXepLich = onNutBamXepLich;
window.toggleNewRow = toggleNewRow;
window.filterCourses = filterCourses;


// Gắn hàm render vào window
window.renderCourseList = (courses) => {
    renderNewUI(courses);
    updateHeaderUI();
};

// Khởi động
document.addEventListener('DOMContentLoaded', () => {
    // 1. Vẽ Sidebar ngay lập tức
    renderSidebar('roadmap');
    updateHeaderUI(); 
    // 2. Load dữ liệu logic
    initApp(); 
});