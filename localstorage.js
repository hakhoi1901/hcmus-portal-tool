/**
 * Utils.js - Core Data & Helpers
 * Nhiệm vụ: Quản lý LocalStorage, tải dữ liệu JSON, chạy Recommender và Render kết quả TKB.
 */

import { CourseRecommender } from './tkb/Recommender.js';
import { renderNewUI, updateHeaderUI } from './render/NewUI.js';

// Dữ liệu phụ trợ (Metadata) dùng chung
export let AUX_DATA = {
    prerequisites: [], 
    allCourses: [],    
    categories: {}     
};

// Biến toàn cục lưu dữ liệu môn học đang hoạt động (Source of Truth)
export let GLOBAL_COURSE_DB = [];

// --- 1. KHỞI TẠO ỨNG DỤNG (INIT) ---
export async function initApp() {
    console.log("🚀 Utils: Đang khởi động ứng dụng...");

    // B1: Check trạng thái giao diện (Login vs Dashboard)
    checkLocalStorageState();

    // B2: Tải dữ liệu phụ trợ (Metadata)
    await loadAuxiliaryData();

    // B3: Load dữ liệu chính (Lớp mở + Sinh viên)
    const courses = await loadCourseData();
    const studentData = getStudentData();

    // B4: Chạy Recommender & Render
    if (courses.length > 0) {
        GLOBAL_COURSE_DB = applyRecommendation(courses, studentData);
        
        // Render giao diện chính
        if (typeof renderNewUI === 'function') {
            renderNewUI(GLOBAL_COURSE_DB);
        }
        
        // Cập nhật Header (Avatar, Tên SV)
        if (typeof updateHeaderUI === 'function') {
            updateHeaderUI();
        }
    } else {
        console.warn("⚠️ Utils: Chưa có dữ liệu lớp học nào.");
    }
}

// --- 2. QUẢN LÝ DỮ LIỆU (DATA HANDLERS) ---

// Xử lý dữ liệu từ Portal gửi về (Gọi từ Main.js)
export function processPortalData(rawCourses, rawStudent) {
    // 1. Lưu Sinh viên
    if (rawStudent) {
        localStorage.setItem('student_db_full', JSON.stringify(rawStudent));
        checkLocalStorageState(); // Cập nhật UI Login/Dashboard
        // Nếu chỉ update SV, cần chạy lại recommend cho list môn hiện tại
        if (GLOBAL_COURSE_DB.length > 0) {
            GLOBAL_COURSE_DB = applyRecommendation(GLOBAL_COURSE_DB, rawStudent);
            renderNewUI(GLOBAL_COURSE_DB);
        }
    }

    // 2. Lưu Lớp mở
    if (rawCourses && rawCourses.length > 0) {
        const studentData = getStudentData(); // Lấy lại data SV mới nhất
        const processedDB = applyRecommendation(rawCourses, studentData);

        localStorage.setItem('course_db_offline', JSON.stringify(processedDB));
        GLOBAL_COURSE_DB = processedDB;
        
        renderNewUI(GLOBAL_COURSE_DB);
        alert(`✅ Đã cập nhật ${processedDB.length} môn học vào hệ thống!`);
    }
}

// Tải Metadata (JSON tĩnh)
async function loadAuxiliaryData() {
    try {
        const [prereq, allCourses, cats] = await Promise.all([
            fetchJson('./assets/data/prerequisites.json'),
            fetchJson('./assets/data/courses.json'),
            fetchJson('./assets/data/categories.json')
        ]);
        AUX_DATA.prerequisites = prereq;
        AUX_DATA.allCourses = allCourses;
        AUX_DATA.categories = cats;
        console.log("📚 Utils: Đã tải xong Metadata.");
    } catch (e) {
        console.error("❌ Utils: Lỗi tải Metadata:", e);
    }
}

// Tải dữ liệu lớp mở (Ưu tiên Cache -> Fallback File)
async function loadCourseData() {
    const cached = localStorage.getItem('course_db_offline');
    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
                console.log("💾 Utils: Sử dụng dữ liệu Offline.");
                return parsed;
            }
        } catch (e) {
            localStorage.removeItem('course_db_offline');
        }
    }

    console.log("🌐 Utils: Đang tải dữ liệu mẫu (Fallback)...");
    return await fetchJson('./js/tkb/Course_db.json');
}

function getStudentData() {
    try {
        return JSON.parse(localStorage.getItem('student_db_full'));
    } catch (e) { return null; }
}

// --- 3. LOGIC GỢI Ý (RECOMMENDER) ---
function applyRecommendation(courses, studentData) {
    if (!studentData || !AUX_DATA.prerequisites.length) return courses;

    try {
        const recommender = new CourseRecommender(
            studentData, courses, AUX_DATA.prerequisites, AUX_DATA.allCourses, AUX_DATA.categories
        );
        const recommendations = recommender.recommend();
        
        // Map status vào danh sách gốc
        const statusMap = new Map();
        recommendations.forEach(c => statusMap.set(c.id, c.recommendationStatus));

        courses.forEach(c => {
            c.recommendationStatus = statusMap.get(c.id) || null;
            // Fix data thiếu mask nếu cần
            if (!c.mask && c.schedule) c.mask = encodeScheduleToMask(c.schedule);
        });

        // Sắp xếp
        courses.sort((a, b) => {
            const priority = { 'RETAKE': 4, 'MANDATORY': 3, 'ELECTIVE_REQUIRED': 2, 'SUGGESTED': 1, null: 0 };
            return (priority[b.recommendationStatus] || 0) - (priority[a.recommendationStatus] || 0);
        });

        return courses;
    } catch (e) {
        console.error("❌ Utils: Recommender Error:", e);
        return courses;
    }
}

// --- 4. CÁC HÀM UI HELPER (Render Kết quả TKB) ---

export function renderScheduleResults(results) {
    const container = document.getElementById('schedule-results-area');
    container.innerHTML = '';
    container.style.display = 'block';

    if (!results || results.length === 0) {
        container.innerHTML = `<div class="text-center py-8 text-gray-500">Không tìm thấy lịch học phù hợp!</div>`;
        return;
    }

    const days = ["Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy", "CN"];

    results.forEach((opt) => {
        // MA TRẬN 20 DÒNG (Mỗi tiết 2 dòng con)
        let grid = Array(20).fill(null).map(() => Array(7).fill(null));

        opt.schedule.forEach(subject => {
            const timeSlots = decodeScheduleMask(subject.mask);
            
            // Tìm tên môn học từ dữ liệu gốc
            let courseName = subject.subjectID; 
            // 1. Tìm trong danh sách lớp đang chọn
            const courseInDB = GLOBAL_COURSE_DB.find(c => c.id === subject.subjectID);
            if (courseInDB) courseName = courseInDB.name;
            // 2. Nếu không thấy, tìm trong dữ liệu phụ trợ (courses.json)
            else if (AUX_DATA && AUX_DATA.allCourses) {
                const meta = AUX_DATA.allCourses.find(c => c.course_id === subject.subjectID);
                if (meta) courseName = meta.course_name;
            }

            // Gom nhóm tiết theo ngày
            const groupedSlots = {}; 
            timeSlots.forEach(slot => {
                if (!groupedSlots[slot.day]) groupedSlots[slot.day] = [];
                groupedSlots[slot.day].push(slot.period);
            });

            for (const [dayStr, periods] of Object.entries(groupedSlots)) {
                const day = parseInt(dayStr);
                periods.sort((a, b) => a - b);

                let startPeriod = periods[0];
                let count = 1;
                
                for (let i = 1; i <= periods.length; i++) {
                    if (i === periods.length || periods[i] !== periods[i-1] + 1) {
                        let endPeriod = startPeriod + count - 1;
                        let startRow = startPeriod * 2;
                        let span = count * 2;

                        // Logic nối tiết (Sáng: Hết P2 nối P3 / Chiều: Hết P7 nối P8)
                        if (endPeriod === 1) span += 1;
                        else if (startPeriod === 2) startRow += 1;
                        if (endPeriod === 6) span += 1;
                        else if (startPeriod === 7) startRow += 1;

                        if (startRow < 20) {
                            grid[startRow][day] = {
                                subjectID: subject.subjectID,
                                subjectName: courseName, // Lưu tên môn
                                classID: subject.classID,
                                span: span,
                                type: 'main'
                            };
                            for (let k = 1; k < span; k++) {
                                if (startRow + k < 20) grid[startRow + k][day] = { type: 'merged' };
                            }
                        }
                        if (i < periods.length) {
                            startPeriod = periods[i];
                            count = 1;
                        }
                    } else {
                        count++;
                    }
                }
            }
        });

        // VẼ HTML
        let tableHTML = `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8 transition-all hover:shadow-md">
                <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 class="text-[#004A98] font-bold text-lg">Phương án ${opt.option}</h3>
                        <p class="text-xs text-gray-500 mt-1">Độ phù hợp: ${opt.fitness.toFixed(0)} điểm</p>
                    </div>
                    <button class="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs rounded hover:bg-gray-50 transition-colors">
                        Chi tiết
                    </button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm border-collapse table-fixed">
                        <thead>
                            <tr class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider text-center h-10 border-b border-gray-200">
                                <th class="border-r border-gray-100 w-10">Tiết</th>
                                ${days.map(d => `<th class="border-r border-gray-100">${d}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-50">
        `;

        for (let r = 0; r < 20; r++) {
            const isEndOfPeriod = (r % 2 !== 0);
            const rowBorderClass = isEndOfPeriod ? "border-b border-gray-200" : "";
            
            tableHTML += `<tr class="h-7 ${rowBorderClass}">`;

            if (r % 2 === 0) {
                const periodNum = (r / 2) + 1;
                tableHTML += `<td class="text-center font-medium text-gray-400 border-r border-gray-200 bg-gray-50/20 text-xs align-middle" rowspan="2">${periodNum}</td>`;
            }

            for (let d = 0; d < 7; d++) {
                const cell = grid[r][d];
                if (!cell) {
                    tableHTML += `<td class="border-r border-gray-100"></td>`;
                } else if (cell.type === 'merged') {
                    continue; 
                } else if (cell.type === 'main') {
                    const colorClass = getColorForSubject(cell.subjectID);
                    
                    // Render ô có Tên môn + Mã lớp + Mã môn
                    tableHTML += `
                        <td class="border-r border-gray-100 p-0.5 align-top relative z-10" rowspan="${cell.span}">
                            <div class="w-full h-full rounded p-1.5 border-l-4 shadow-sm flex flex-col justify-start gap-0.5 cursor-pointer hover:brightness-95 transition-all ${colorClass}" style="min-height: ${cell.span * 1.75}rem;">
                                
                                <span class="font-bold text-[10px] leading-tight line-clamp-2" title="${cell.subjectName}">
                                    ${cell.subjectName}
                                </span>
                                
                                <div class="flex flex-wrap gap-1 mt-0.5">
                                    <span class="text-[9px] opacity-70 uppercase tracking-tighter">${cell.subjectID}</span>
                                    <span class="text-[9px] bg-white/60 px-1 rounded font-medium ml-auto">${cell.classID}</span>
                                </div>
                            </div>
                        </td>
                    `;
                }
            }
            tableHTML += `</tr>`;
        }
        tableHTML += `</tbody></table></div></div>`;
        container.insertAdjacentHTML('beforeend', tableHTML);
    });
}

// Kiểm tra trạng thái Login/Data để ẩn hiện UI
function checkLocalStorageState() {
    const btnOpen = document.getElementById('btn-open-portal'); // Nút Login/Nạp data
    const btnLogout = document.getElementById('btn-logout');   // Nút Logout

    const hasData = localStorage.getItem('student_db_full');

    if (hasData) {
        if(btnOpen) btnOpen.classList.add('hidden');
        if(btnLogout) btnLogout.classList.remove('hidden');
    } else {
        if(btnOpen) btnOpen.classList.remove('hidden');
        if(btnLogout) btnLogout.classList.add('hidden');
    }
}

// --- 5. HELPERS NHỎ ---
async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}

export function encodeScheduleToMask(scheduleStrs) {
    let mask = [0, 0, 0, 0]; 
    if (!Array.isArray(scheduleStrs)) return mask;
    scheduleStrs.forEach(str => {
        const match = str.match(/T(\d)\((\d+)-(\d+)\)/);
        if (match) {
            const day = parseInt(match[1]) - 2; 
            const start = parseInt(match[2]);
            const end = parseInt(match[3]);
            for (let i = start; i <= end; i++) {
                const bitIndex = (day * 10) + (i - 1); 
                mask[Math.floor(bitIndex / 32)] |= (1 << (bitIndex % 32));
            }
        }
    });
    return mask;
}

window.clearAppCache = () => {
    if (confirm("Đăng xuất và xóa dữ liệu?")) {
        localStorage.clear();
        window.location.reload();
    }
};