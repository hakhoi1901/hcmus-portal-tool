/**
 * Utils.js - Core Data & Helpers
 * Nhiệm vụ: Quản lý LocalStorage, tải dữ liệu JSON, chạy Recommender và Render kết quả TKB.
 */

import { CourseRecommender } from './tkb/Recommender.js';
import { renderNewUI, updateHeaderInfo, fillStudentProfile  } from './render/NewUI.js';
import { logStatus, logSuccess, logWarning, logAlgo, logData, logError} from './styleLog.js';


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


// ====== CÁC HÀM HELPER (XỬ LY CHUỖI, TÍNH TOÁN NHỎ...)

// hàm lấy dữ liệu file json
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

export function decodeScheduleMask(parts) {
    // Logic decode mask ngược lại (dùng cho render table)
    let slots = [];
    for (let i = 0; i < 4 && i < parts.length; i++) {
        for (let bit = 0; bit < 32; bit++) {
            if ((parts[i] & (1 << bit)) !== 0) {
                let totalBit = i * 32 + bit;
                let day = Math.floor(totalBit / 10);
                let period = totalBit % 10;
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
        // (Lưu ý: Recommender.js của bạn trả về finalOutput là danh sách đã lọc rồi)
        const recommendedCourses = recommender.recommend();
        
        // Nếu không có gợi ý nào (SV học hết rồi chẳng hạn), có thể trả về rỗng hoặc full
        if (!recommendedCourses || recommendedCourses.length === 0) {
            logWarning("Không có môn nào được gợi ý.");
            return []; // Hoặc return courses nếu muốn fallback về hiện tất cả
        }

        // Đảm bảo dữ liệu chuẩn hóa (tính bitmask cho lịch học nếu thiếu)
        recommendedCourses.forEach(c => {
            if (!c.mask && c.schedule) c.mask = encodeScheduleToMask(c.schedule);
        });

        // Sắp xếp lại lần cuối cho chắc chắn (Ưu tiên: Học lại -> Bắt buộc -> Nhóm ngành -> Bổ trợ)
        recommendedCourses.sort((a, b) => {
            const priority = { 'RETAKE': 4, 'MANDATORY': 3, 'ELECTIVE_REQUIRED': 2, 'SUGGESTED': 1, null: 0 };
            // Lấy status từ object (Recommender đã gán sẵn key recommendationStatus vào rồi)
            const pA = priority[a.recommendationStatus] || 0;
            const pB = priority[b.recommendationStatus] || 0;
            return pB - pA; // Cao xếp trước
        });

        return recommendedCourses; // <--- TRẢ VỀ DANH SÁCH ĐÃ LỌC

    } catch (e) {
        logError("Utils: Recommender Error:", e);
        // Nếu lỗi, fallback về hiện tất cả để user vẫn dùng được tool
        return courses;
    }
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

// hàm tính học phí
// 3. --- HÀM TÍNH HỌC PHÍ (LOGIC CHÍNH) ---
/**
 * Tính học phí dựa trên Tín chỉ thực tế (Tín chỉ học phí)
 * Công thức: (Lý thuyết + Thực hành + Bài tập) / 15 * Đơn giá
 */
export function calculateTuition(courseId, defaultCredits) {
    // 1. Xác định Đơn giá (Rate)
    const db = AUX_DATA.tuitionRates;
    let pricePerCredit = 350000; // Giá mặc định nếu chưa load file config

    if (db && db.rates) {
        const id = courseId.trim().toUpperCase();
        const sortedKeys = Object.keys(db.rates).sort((a, b) => b.length - a.length);
        
        // Tìm đơn giá khớp với prefix
        for (const key of sortedKeys) {
            if (id.startsWith(key)) {
                pricePerCredit = db.rates[key];
                break;
            }
        }
        // Fallback giá mặc định trong file config
        if (pricePerCredit === 350000 && db.default_price) {
            pricePerCredit = db.default_price;
        }
    }

    // 2. Xác định Số tín chỉ học phí (Billing Credits)
    let billingCredits = defaultCredits || 0;

    // Tìm thông tin chi tiết môn học để lấy số tiết
    if (AUX_DATA.allCourses) {
        const meta = AUX_DATA.allCourses.find(c => c.course_id === courseId);
        
        if (meta) {
            // Lấy số tiết, đảm bảo không bị undefined
            const lt = parseInt(meta.theory_hours) || 0;   // Lý thuyết
            const th = parseInt(meta.lab_hours) || 0;      // Thực hành/Thí nghiệm
            const bt = parseInt(meta.exercise_hours) || 0; // Bài tập

            const totalHours = lt + th + bt;

            // Nếu có dữ liệu số tiết > 0 thì tính theo công thức
            if (totalHours > 0) {
                // Công thức: Tổng tiết / `15
                billingCredits = totalHours / 15;
            }
        }
    }
    // 3. Tính tiền
    return billingCredits * pricePerCredit;
}

// ====== HÀM XỬ LÝ CHÍNH ======

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

// Khởi tạo ứng dụng
export async function initApp() {
    console.log("🚀 Utils: Đang khởi động ứng dụng...");

    // B1: Check trạng thái giao diện (Login vs Dashboard)
    checkLocalStorageState();

    // B1: Tải dữ liệu phụ trợ (Metadata: Tên môn đầy đủ, Tín chỉ, Tiên quyết...)
    await loadAuxiliaryData();

    // B2: Load dữ liệu từ LocalStorage (Cache cũ)
    const storedCourses = localStorage.getItem('course_db_offline');
    const storedStudent = localStorage.getItem('student_db_full');

    let courses = [];
    let studentData = null;

    // Parse Dữ liệu Sinh viên
    if (storedStudent) {
        try {
            studentData = JSON.parse(storedStudent);
            console.log("👤 Đã tải dữ liệu sinh viên từ Cache.");
        } catch (e) { console.error("Lỗi đọc cache SV:", e); }
    } else {
        console.warn("⚠️ Chưa có dữ liệu sinh viên (Cần chạy Bookmarklet).");
    }

    // Parse Dữ liệu Môn học
    if (storedCourses) {
        try {
            courses = JSON.parse(storedCourses);
            console.log(`📚 Đã tải ${courses.length} môn học từ Cache.`);
        } catch (e) { console.error("Lỗi đọc cache Môn học:", e); }
    } else {
        // Nếu không có cache, thử load file JSON mặc định (nếu bạn có)
        courses = await loadCourseData(); 
    }

    // B3: Logic Kết hợp & Hiển thị
    if (courses && courses.length > 0) {
        if (studentData) {
            // Nếu có cả 2 -> Chạy thuật toán gợi ý tối ưu
            GLOBAL_COURSE_DB = applyRecommendation(courses, studentData);
        } else {
            // Nếu chỉ có môn học -> Hiển thị thô
            GLOBAL_COURSE_DB = courses;
        }
        
        // Render UI
        renderNewUI(GLOBAL_COURSE_DB);
    } else {
        console.warn("⚠️ Không có dữ liệu môn học nào để hiển thị.");
        // Có thể hiển thị màn hình hướng dẫn "Vui lòng chạy Tool lấy dữ liệu"
    }
    
    window.addEventListener("message", (event) => {
        // Security check
        if (!event.data || !event.data.type) return;

        const { type, payload } = event.data;

        // Case A: Dữ liệu Sinh Viên (Điểm, Lịch thi...)
        if (type === 'PORTAL_DATA') {
            logStatus("Main: Đã nhận dữ liệu Sinh viên.");
            // Lưu và xử lý bên Utils (để đồng bộ logic)
            processPortalData(null, payload); 
        }

        // Case B: Dữ liệu Lớp Mở (Quan trọng cho xếp lịch)
        if (type === 'OPEN_CLASS_DATA') {
            logSuccess(`Main: Đã nhận ${payload.length} lớp mở.`);
            processPortalData(payload, null);
        }

        fillStudentProfile();
    }, false);
    // Cập nhật Header lần cuối
    updateHeaderInfo();
}



// Lưu TKB

// js/Utils.js

// Biến lưu kết quả vừa tính toán (để khi bấm Save còn biết lưu cái gì)
export let LAST_SOLVER_RESULTS = [];

export function setSolverResults(results) {
    LAST_SOLVER_RESULTS = results;
}

// --- QUẢN LÝ LỊCH ĐÃ LƯU (SAVED SCHEDULES) ---

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
        id: Date.now().toString(), // ID duy nhất
        name: name,
        timestamp: new Date().toLocaleDateString('vi-VN'),
        data: scheduleData // Dữ liệu các lớp
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

// ====== HÀM TIỆN ÍCH GLOBLE

// Gán trực tiếp vào window tại đây để file nào cũng gọi được
window.clearAppCache = () => {
    if (confirm("Đăng xuất và xóa dữ liệu?")) {
        localStorage.clear();
        window.location.reload();
    }
};




