import { setupBookmarklet, openPortal } from './PortalHandler.js';
import { renderDashboardUI, renderCourseList, toggleCourse, removeCourse, filterCourses } from './render/Dashboard.js';
import { onNutBamXepLich } from './Logic.js';

// Setup
setupBookmarklet();

// Export hàm ra window
window.openPortal = openPortal;
window.toggleCourse = toggleCourse;
window.removeCourse = removeCourse;
window.filterCourses = filterCourses;
window.onNutBamXepLich = onNutBamXepLich;

// --- 1. XỬ LÝ SỰ KIỆN TỪ BOOKMARKLET GỬI VỀ ---
window.addEventListener("message", (event) => {
    if (!event.data) return;

    // A. Dữ liệu Sinh Viên
    if (event.data.type === 'PORTAL_DATA') {
        const payload = event.data.payload;
        localStorage.setItem('student_db_full', JSON.stringify(payload));
        renderDashboardUI(payload);
        
        const statusEl = document.getElementById('status-area');
        if (statusEl) {
            statusEl.innerText = "Đã cập nhật dữ liệu Sinh viên!";
            statusEl.className = 'status-msg success';
            statusEl.style.display = 'block';
        }
    }

    // B. Dữ liệu Lớp Mở -> RENDER NGAY LẬP TỨC
    if (event.data.type === 'OPEN_CLASS_DATA') {
        const courses = event.data.payload;
        localStorage.setItem('courses_db_offline', JSON.stringify(courses));
        
        // Gọi hàm Render
        renderCourseList(courses);

        const statusEl = document.getElementById('status-area');
        if (statusEl) {
            statusEl.innerText = `Đã cập nhật ${courses.length} môn học từ Portal!`;
            statusEl.className = 'status-msg success';
            statusEl.style.display = 'block';
        }
        
        // Cập nhật chỉ báo nguồn
        const ind = document.getElementById('data-source-indicator');
        if(ind) ind.innerText = "Nguồn: Dữ liệu vừa lấy từ Portal";

        alert(`Đã nhận ${courses.length} môn lớp mở. Giao diện đã được cập nhật!`);
    }
}, false);

// --- 2. KHỞI TẠO KHI LOAD TRANG ---
window.onload = async () => {
    // A. Load thông tin SV
    const oldStudentData = localStorage.getItem('student_db_full');
    if (oldStudentData) {
        try { renderDashboardUI(JSON.parse(oldStudentData)); } catch (e) {}
    }

    // B. Load dữ liệu Lớp Mở (Logic quan trọng đã sửa)
    let courseData = [];
    const localCourses = localStorage.getItem('courses_db_offline');
    const ind = document.getElementById('data-source-indicator');

    if (localCourses) {
        try {
            console.log("🔥 Đang dùng dữ liệu LocalStorage (Portal)");
            courseData = JSON.parse(localCourses);
            if(ind) ind.innerText = "Nguồn: Dữ liệu thực tế từ Portal (Offline)";
        } catch(e) { 
            console.error("Data offline lỗi, sẽ tải file JSON"); 
        }
    } 
    
    // Nếu không có data offline (hoặc lỗi parse), tải file JSON
    if (!courseData || courseData.length === 0) {
        try {
            console.log("📂 Đang tải Course_db.json...");
            const res = await fetch('./js/tkb/Course_db.json');
            if (res.ok) {
                courseData = await res.json();
                if(ind) ind.innerText = "Nguồn: File tĩnh (Mẫu)";
            }
        } catch (e) { 
            console.log("Không tải được file mẫu.", e); 
        }
    }

    // Render dữ liệu (Dù nguồn nào thì cũng gọi hàm này)
    if (courseData && courseData.length > 0) {
        renderCourseList(courseData);
    } else {
        const container = document.getElementById('course-list-area');
        if(container) container.innerHTML = '<div style="padding:10px; text-align:center">Không có dữ liệu môn học nào.</div>';
    }
};