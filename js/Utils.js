/**
 * Utils.js - Core Data & Helpers
 * Nhiệm vụ: Quản lý LocalStorage, tải dữ liệu JSON, chạy Recommender và Render kết quả TKB.
 */

import { CourseRecommender } from './tkb/Recommender.js';
import { renderNewUI, updateHeaderInfo, fillStudentProfile, injectClassSelectionModal } from './render/NewUI.js';
import { logStatus, logSuccess, logWarning, logAlgo, logData, logError } from './styleLog.js';


// ====== BIẾN TOÀN CỤC ======

// lưu các dữ liệu môn học 
export let AUX_DATA = {
    prerequisites: [],
    allCourses: [],
    categories: {},
    tuitionRates: null
};

// lưu dữ liệu môn học đang hoạt động (Source of Truth)
export let GLOBAL_COURSE_DB = [];


// ====== CÁC HÀM HELPER (XỬ LY CHUỖI, TÍNH TOÁN NHỎ...) ======

// hàm lấy dữ liệu file json
async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}

export function encodeScheduleToMask(scheduleInput) {
    let mask = [0, 0, 0, 0];

    // 1. Đảm bảo input luôn là mảng
    // Nếu là string "T2(1-3)" -> thành ["T2(1-3)"]
    const scheduleArr = Array.isArray(scheduleInput) ? scheduleInput : [scheduleInput];

    // 2. Duyệt qua từng chuỗi lịch để bật bit
    scheduleArr.forEach(str => {
        if (!str) return;
        const match = str.match(/T(\d|CN)\s*\((\d+)-(\d+)\)/); // Regex bắt T2(1-3)
        if (match) {
            let day = match[1] === 'CN' ? 6 : parseInt(match[1]) - 2;
            const start = parseInt(match[2]);
            const end = parseInt(match[3]);

            // Bật bit cho từng tiết học
            for (let i = start; i <= end; i++) {
                const bitIndex = (day * 10) + (i - 1);
                mask[Math.floor(bitIndex / 32)] |= (1 << (bitIndex % 32));
            }
        }
    });

    return { parts: mask }; // Trả về object tương thích với Bitset
}

export function decodeScheduleMask(parts) {
    // Logic decode mask ngược lại (dùng cho render table)
    let slots = [];
    
    // FIX QUAN TRỌNG: Luôn chạy đủ 4 phần (128 bit) để quét hết cả tuần
    // Dữ liệu JSON có thể bị cắt bớt (ví dụ [480]), nếu chỉ loop i < parts.length sẽ mất các ngày sau.
    for (let i = 0; i < 4; i++) {
        // Nếu mảng parts ngắn quá, coi như phần thiếu là 0
        const part = (parts && parts[i] !== undefined) ? parts[i] : 0;
        
        if (part === 0) continue; // Tối ưu: Không có tiết nào ở phần này

        for (let bit = 0; bit < 32; bit++) {
            if ((part & (1 << bit)) !== 0) {
                let totalBit = i * 32 + bit;
                let day = Math.floor(totalBit / 10);
                let period = totalBit % 10;
                // period 0 = tiết 1.
                if (day < 7) slots.push({ day, period });
            }
        }
    }
    return slots;
}

// ====== CÁC HÀM SỬ LÝ LOGIC DỮ LIỆU ======

// lấy dữ liệu sinh viên từ LocalStorage
function getStudentData() {
    try {
        const raw = localStorage.getItem('student_db_full');
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

// Tải Metadata - JSON
async function loadAuxiliaryData() {
    try {
        const [prereq, allCourses, cats, rates] = await Promise.all([
            fetchJson('./assets/data/prerequisites.json'),
            fetchJson('./assets/data/courses.json'),
            fetchJson('./assets/data/categories.json'),
            fetchJson('./assets/data/tuition_rates.json')
        ]);
        AUX_DATA.prerequisites = prereq;
        AUX_DATA.allCourses = allCourses;
        AUX_DATA.categories = cats;
        AUX_DATA.tuitionRates = rates; // <--- Lưu vào biến toàn cục
        logSuccess("Utils: Đã tải xong Metadata và Bảng giá.");
    } catch (e) {
        logError("Utils: Lỗi tải Metadata:", e);
    }
}

// Tải dữ liệu lớp mở (Ưu tiên Cache > Fallback File)
async function loadCourseData() {
    const cached = localStorage.getItem('course_db_offline');
    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
                logStatus("Utils: Đang sử dụng dữ liệu Offline (lớp mở).");
                return parsed;
            }
        } catch (e) {
            localStorage.removeItem('course_db_offline');
        }
    }

    logAlgo("Utils: Đang tải dữ liệu mẫu (Fallback)...");
    return await fetchJson('./js/tkb/Course_db.json');
}

// hàm gợi ý - chỉ hiện những môn được gợi ý
function applyRecommendation(courses, studentData) {
    // Nếu không có dữ liệu SV hoặc không có tiên quyết, trả về toàn bộ danh sách gốc
    if (!studentData || !AUX_DATA.prerequisites.length) return courses;

    try {
        const recommender = new CourseRecommender(
            studentData,
            courses,
            AUX_DATA.prerequisites,
            AUX_DATA.allCourses,
            AUX_DATA.categories
        );

        // Lấy danh sách các môn ĐƯỢC GỢI Ý từ bộ não Recommender
        const recommendedCourses = recommender.recommend();

        // Nếu không có gợi ý nào, có thể trả về rỗng hoặc full
        if (!recommendedCourses || recommendedCourses.length === 0) {
            logWarning("Không có môn nào được gợi ý.");
            return [];
        }

        // Đảm bảo dữ liệu chuẩn hóa (tính bitmask cho lịch học nếu thiếu)
        recommendedCourses.forEach(c => {
            if (!c.mask && c.schedule) c.mask = encodeScheduleToMask(c.schedule);
        });

        // Sắp xếp lại lần cuối cho chắc chắn
        recommendedCourses.sort((a, b) => {
            const priority = { 'RETAKE': 4, 'MANDATORY': 3, 'ELECTIVE_REQUIRED': 2, 'SUGGESTED': 1, null: 0 };
            const pA = priority[a.recommendationStatus] || 0;
            const pB = priority[b.recommendationStatus] || 0;
            return pB - pA;
        });

        return recommendedCourses;

    } catch (e) {
        logError("Utils: Recommender Error:", e);
        return courses;
    }
}

// Kiểm tra trạng thái Login/Data để ẩn hiện UI
function checkLocalStorageState() {
    const btnOpen = document.getElementById('btn-open-portal');
    const btnLogout = document.getElementById('btn-logout');

    const hasData = localStorage.getItem('student_db_full');

    if (hasData) {
        if (btnOpen) btnOpen.classList.add('hidden');
        if (btnLogout) btnLogout.classList.remove('hidden');
    } else {
        if (btnOpen) btnOpen.classList.remove('hidden');
        if (btnLogout) btnLogout.classList.add('hidden');
    }
}

// 3. --- HÀM TÍNH HỌC PHÍ (LOGIC CHÍNH) ---
export function calculateTuition(courseId, defaultCredits) {
    // 1. Xác định Đơn giá (Rate)
    const db = AUX_DATA.tuitionRates;
    let pricePerCredit = 350000; // Giá mặc định

    if (db && db.rates) {
        const id = courseId.trim().toUpperCase();
        const sortedKeys = Object.keys(db.rates).sort((a, b) => b.length - a.length);

        for (const key of sortedKeys) {
            if (id.startsWith(key)) {
                pricePerCredit = db.rates[key];
                break;
            }
        }
        if (pricePerCredit === 350000 && db.default_price) {
            pricePerCredit = db.default_price;
        }
    }

    // 2. Xác định Số tín chỉ học phí
    let billingCredits = defaultCredits || 0;

    if (AUX_DATA.allCourses) {
        const meta = AUX_DATA.allCourses.find(c => c.course_id === courseId);

        if (meta) {
            const lt = parseInt(meta.theory_hours) || 0;
            const th = parseInt(meta.lab_hours) || 0;
            const bt = parseInt(meta.exercise_hours) || 0;
            const totalHours = lt + th + bt;

            if (totalHours > 0) {
                billingCredits = totalHours / 15;
            }
        }
    }
    return billingCredits * pricePerCredit;
}

// ====== HÀM XỬ LÝ CHÍNH ======

// Xử lý dữ liệu từ Portal gửi về (Gọi từ Main.js)
export function processPortalData(rawCourses, rawStudent) {
    // 1. Lưu Sinh viên
    if (rawStudent) {
        localStorage.setItem('student_db_full', JSON.stringify(rawStudent));
        checkLocalStorageState();
        if (GLOBAL_COURSE_DB.length > 0) {
            GLOBAL_COURSE_DB = applyRecommendation(GLOBAL_COURSE_DB, rawStudent);
            renderNewUI(GLOBAL_COURSE_DB);
        }
    }

    // 2. Lưu Lớp mở
    if (rawCourses && rawCourses.length > 0) {
        const studentData = getStudentData();
        const processedDB = applyRecommendation(rawCourses, studentData);

        localStorage.setItem('course_db_offline', JSON.stringify(processedDB));
        GLOBAL_COURSE_DB = processedDB;

        window.allCourses = GLOBAL_COURSE_DB;

        renderNewUI(GLOBAL_COURSE_DB);
        alert(`✅ Đã cập nhật ${processedDB.length} môn học vào hệ thống!`);
    }
}

// Khởi tạo ứng dụng
export async function initApp() {
    console.log("🚀 Utils: Đang khởi động ứng dụng...");

    checkLocalStorageState();

    // Inject Modal vào DOM
    if (typeof injectClassSelectionModal === 'function') {
        injectClassSelectionModal();
    }

    await loadAuxiliaryData();

    const storedCourses = localStorage.getItem('course_db_offline');
    const storedStudent = localStorage.getItem('student_db_full');

    let courses = [];
    let studentData = null;

    if (storedStudent) {
        try {
            studentData = JSON.parse(storedStudent);
            console.log("👤 Đã tải dữ liệu sinh viên từ Cache.");
        } catch (e) { console.error("Lỗi đọc cache SV:", e); }
    } else {
        console.warn("⚠️ Chưa có dữ liệu sinh viên (Cần chạy Bookmarklet).");
    }

    if (storedCourses) {
        try {
            courses = JSON.parse(storedCourses);
            console.log(`📚 Đã tải ${courses.length} môn học từ Cache.`);
        } catch (e) { console.error("Lỗi đọc cache Môn học:", e); }
    } else {
        courses = await loadCourseData();
    }

    if (courses && courses.length > 0) {
        if (studentData) {
            GLOBAL_COURSE_DB = applyRecommendation(courses, studentData);
        } else {
            GLOBAL_COURSE_DB = courses;
        }

        window.allCourses = GLOBAL_COURSE_DB;

        renderNewUI(GLOBAL_COURSE_DB);
    } else {
        console.warn("⚠️ Không có dữ liệu môn học nào để hiển thị.");
    }

    window.addEventListener("message", (event) => {
        if (!event.data || !event.data.type) return;

        const { type, payload } = event.data;

        if (type === 'PORTAL_DATA') {
            logStatus("Main: Đã nhận dữ liệu Sinh viên.");
            processPortalData(null, payload);
        }

        if (type === 'OPEN_CLASS_DATA') {
            logSuccess(`Main: Đã nhận ${payload.length} lớp mở.`);
            processPortalData(payload, null);
        }

        fillStudentProfile();
    }, false);
    
    updateHeaderInfo();
}


// --- QUẢN LÝ KẾT QUẢ & LƯU TKB ---

export let LAST_SOLVER_RESULTS = [];

export function setSolverResults(results) {
    LAST_SOLVER_RESULTS = results;
}

const STORAGE_KEY_TKB = 'user_saved_schedules';

export function getSavedSchedules() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_TKB);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

export function saveScheduleToStorage(name, scheduleData) {
    const list = getSavedSchedules();
    const newEntry = {
        id: Date.now().toString(),
        name: name,
        timestamp: new Date().toLocaleDateString('vi-VN'),
        data: scheduleData
    };
    list.push(newEntry);
    localStorage.setItem(STORAGE_KEY_TKB, JSON.stringify(list));
    return true;
}

export function deleteSavedSchedule(id) {
    let list = getSavedSchedules();
    list = list.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY_TKB, JSON.stringify(list));
    return list;
}

// ====== HÀM TIỆN ÍCH GLOBAL ======

window.clearAppCache = () => {
    if (confirm("Đăng xuất và xóa dữ liệu?")) {
        localStorage.clear();
        window.location.reload();
    }
};

// --- MODAL CHỌN LỚP (LOGIC) ---

let currentEditingCourseId = null;

// 1. Hàm mở Modal
window.openClassModal = function(courseId) {
    currentEditingCourseId = courseId;
    
    const course = window.allCourses.find(c => c.id === courseId); 
    if (!course) {
        console.error("Không tìm thấy dữ liệu môn học: " + courseId);
        return;
    }

    document.getElementById('modal-course-title').innerText = `${course.id} - ${course.name}`;

    const savedData = JSON.parse(localStorage.getItem('hcmus_selected_classes') || '{}');
    const selectedClasses = savedData[courseId] || [];

    const tbody = document.getElementById('modal-class-list');
    tbody.innerHTML = '';

    course.classes.forEach(cls => {
        let isChecked = true;
        if (savedData.hasOwnProperty(courseId)) {
             isChecked = selectedClasses.includes(cls.id);
        }

        const tr = document.createElement('tr');
        tr.className = isChecked ? 'bg-blue-50/50 transition-colors' : 'transition-colors hover:bg-gray-50';
        tr.innerHTML = `
            <td class="whitespace-nowrap py-3 pl-4 pr-3 text-sm">
                <input type="checkbox" 
                       class="modal-chk-class rounded border-gray-300 text-[#004A98] focus:ring-[#004A98] w-4 h-4 cursor-pointer" 
                       value="${cls.id}"
                       ${isChecked ? 'checked' : ''}
                       onchange="this.closest('tr').className = this.checked ? 'bg-blue-50/50 transition-colors' : 'transition-colors hover:bg-gray-50'; window.updateCheckAllState()">
            </td>
            <td class="whitespace-nowrap py-3 pl-2 pr-2 text-sm font-bold text-gray-700">${cls.id}</td>
            <td class="whitespace-nowrap py-3 pl-2 pr-2 text-xs text-gray-500 font-mono">${cls.schedule || '<span class="text-gray-300">--</span>'}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('class-modal').classList.remove('hidden');
    window.updateCheckAllState();
}

// 2. Hàm đóng Modal
window.closeClassModal = function() {
    document.getElementById('class-modal').classList.add('hidden');
    currentEditingCourseId = null;
}

// 3. Tiện ích Checkbox
window.toggleAllModal = function(source) {
    const checkboxes = document.querySelectorAll('#modal-class-list .modal-chk-class');
    checkboxes.forEach(chk => {
        chk.checked = source.checked;
        chk.closest('tr').className = source.checked ? 'bg-blue-50/50 transition-colors' : 'transition-colors hover:bg-gray-50';
    });
}

window.updateCheckAllState = function() {
    const checkboxes = document.querySelectorAll('#modal-class-list .modal-chk-class');
    const checkedCount = Array.from(checkboxes).filter(c => c.checked).length;
    const checkAll = document.getElementById('chk-all-modal');
    if (checkAll) {
        checkAll.checked = (checkedCount === checkboxes.length && checkboxes.length > 0);
        checkAll.indeterminate = (checkedCount > 0 && checkedCount < checkboxes.length);
    }
}

// 4. Hàm Lưu Selection
window.saveModalSelection = function() {
    if (!currentEditingCourseId) return;

    const checkboxes = document.querySelectorAll('#modal-class-list .modal-chk-class');
    const selected = [];
    let totalClasses = checkboxes.length;

    checkboxes.forEach(chk => {
        if (chk.checked) selected.push(chk.value);
    });

    const savedData = JSON.parse(localStorage.getItem('hcmus_selected_classes') || '{}');
    
    // Nếu chọn Full hoặc không chọn gì (coi như full) thì xóa key để tiết kiệm
    if (selected.length === totalClasses || selected.length === 0) {
        delete savedData[currentEditingCourseId];
        window.updateCourseRowUI(currentEditingCourseId, totalClasses, true);
    } else {
        savedData[currentEditingCourseId] = selected;
        window.updateCourseRowUI(currentEditingCourseId, selected.length, false);
    }

    localStorage.setItem('hcmus_selected_classes', JSON.stringify(savedData));
    
    // Trigger render lại nếu cần
    if (typeof window.renderExamSchedule === 'function') {
        // window.renderExamSchedule(); 
    }

    window.closeClassModal();
}

// 5. Update UI bên ngoài
window.updateCourseRowUI = function(courseId, count, isFull) {
    const labelEl = document.getElementById(`label-count-${courseId}`);
    const descEl = document.getElementById(`desc-sel-${courseId}`);
    
    if (!labelEl || !descEl) return;

    if (isFull) {
        labelEl.innerText = "Tất cả";
        labelEl.className = ""; // Reset class
        descEl.innerText = "Mặc định lấy tất cả các lớp mở";
        descEl.className = "text-[10px] text-gray-400 truncate mt-0.5";
    } else {
        if (count === 0) {
            labelEl.innerText = "Tất cả"; 
            descEl.innerText = "Mặc định lấy tất cả các lớp mở";
        } else {
            labelEl.innerText = `${count} lớp`;
            labelEl.classList.add("text-[#004A98]", "font-bold");
            descEl.innerText = `Đã lọc ${count} lớp cụ thể`;
            descEl.className = "text-[10px] text-[#004A98] truncate mt-0.5 font-medium";
        }
    }
}

// --- QUẢN LÝ CÀI ĐẶT NÂNG CAO (PREFERENCES) ---

const PREF_STORAGE_KEY = 'hcmus_schedule_preferences';

// A. Lấy cài đặt
export function getStoredPreferences() {
    try {
        const raw = localStorage.getItem(PREF_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.error("Lỗi đọc preferences:", e);
    }
    // Default
    return {
        daysOff: [],
        strategy: 'default',
        session: '0',
        noGaps: false
    };
}

// B. Lưu cài đặt (Internal)
export function savePreferencesToStorage(newPrefs) {
    localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify(newPrefs));
    console.log("Đã lưu cài đặt:", newPrefs);
    alert("Đã lưu cài đặt xếp lịch!");
}

// C. Hàm Save từ Modal Settings
window.saveAdvancedSettings = function() {
    const daysOff = [];
    document.querySelectorAll('input[name="day_off"]:checked').forEach(el => {
        daysOff.push(parseInt(el.value));
    });

    const strategyEl = document.querySelector('input[name="strategy"]:checked');
    const strategy = strategyEl ? strategyEl.value : 'default';

    const sessionEl = document.querySelector('input[name="session"]:checked');
    const session = sessionEl ? sessionEl.value : '0';

    const noGaps = document.getElementById('pref-gap')?.checked || false;

    const prefs = {
        daysOff: daysOff,
        strategy: strategy,
        session: session,
        noGaps: noGaps
    };

    localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify(prefs));
    
    console.log("✅ Đã lưu cài đặt mới:", prefs);
    if(window.closeModal) window.closeModal();
};

// D. Hàm Load lại UI khi mở modal
window.loadSettingsToUI = function() {
    const raw = localStorage.getItem(PREF_STORAGE_KEY);
    if (!raw) return; 

    const prefs = JSON.parse(raw);
    console.log("🔄 Đang load lại cài đặt:", prefs);

    // Days off
    if (prefs.daysOff && Array.isArray(prefs.daysOff)) {
        prefs.daysOff.forEach(val => {
            const chk = document.querySelector(`input[name="day_off"][value="${val}"]`);
            if (chk) chk.checked = true;
        });
    }

    // Strategy
    if (prefs.strategy) {
        const radio = document.querySelector(`input[name="strategy"][value="${prefs.strategy}"]`);
        if (radio) radio.checked = true;
    }

    // Session
    if (prefs.session) {
        const radio = document.querySelector(`input[name="session"][value="${prefs.session}"]`);
        if (radio) radio.checked = true;
    }

    // Gap
    if (prefs.noGaps) {
        const gapChk = document.getElementById('pref-gap');
        if (gapChk) gapChk.checked = true;
    }
}



export function loadSettingsToUI() {
    // 1. Đọc dữ liệu đã lưu
    const raw = localStorage.getItem('hcmus_schedule_preferences');
    if (!raw) return; // Chưa lưu gì thì thôi
    
    const prefs = JSON.parse(raw);
    console.log("🔄 Đang load lại cài đặt:", prefs);

    // 2. Tick lại Ngày nghỉ (Checkbox)
    // Lưu ý: name trong HTML của bạn là "day_off"
    if (prefs.daysOff && Array.isArray(prefs.daysOff)) {
        prefs.daysOff.forEach(val => {
            // Tìm ô input có value bằng ngày đã chọn
            const chk = document.querySelector(`input[name="day_off"][value="${val}"]`);
            if (chk) chk.checked = true;
        });
    }

    // 3. Tick lại Chiến thuật (Radio)
    if (prefs.strategy) {
        const radio = document.querySelector(`input[name="strategy"][value="${prefs.strategy}"]`);
        if (radio) radio.checked = true;
    }

    // 4. Tick lại Buổi (Radio)
    if (prefs.session) {
        const radio = document.querySelector(`input[name="session"][value="${prefs.session}"]`);
        if (radio) radio.checked = true;
    }

    // 5. Tick lại Gap (Checkbox đơn)
    if (prefs.noGaps) {
        const gapChk = document.getElementById('pref-gap');
        if (gapChk) gapChk.checked = true;
    }
}