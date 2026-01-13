/**
 * Utils.js - Core Data & Helpers
 * Nhiệm vụ: Quản lý LocalStorage, tải dữ liệu JSON, chạy Recommender và Render kết quả TKB.
 */

import { CourseRecommender } from './tkb/Recommender.js';
import { renderNewUI, updateHeaderInfo, fillStudentProfile, injectClassSelectionModal  } from './render/NewUI.js';
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

        window.allCourses = GLOBAL_COURSE_DB;
        
        renderNewUI(GLOBAL_COURSE_DB);
        alert(`✅ Đã cập nhật ${processedDB.length} môn học vào hệ thống!`);
    }
}

// Khởi tạo ứng dụng
export async function initApp() {
    console.log("🚀 Utils: Đang khởi động ứng dụng...");

    // B1: Check trạng thái giao diện (Login vs Dashboard)
    checkLocalStorageState();

    injectClassSelectionModal();

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

        window.allCourses = GLOBAL_COURSE_DB;
        
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


// Biến toàn cục để lưu trạng thái tạm khi mở modal
let currentEditingCourseId = null;
// Giả sử courses là mảng chứa dữ liệu tất cả môn học của bạn
// window.courses = [...]; 

// 1. Hàm mở Modal
function openClassModal(courseId) {
    currentEditingCourseId = courseId;
    const course = window.courses.find(c => c.id === courseId); // Tìm môn học trong dữ liệu gốc
    if (!course) return;

    // Cập nhật tiêu đề modal
    document.getElementById('modal-course-title').innerText = `${course.id} - ${course.name}`;

    // Lấy dữ liệu đã lưu từ localStorage
    const savedData = JSON.parse(localStorage.getItem('hcmus_selected_classes') || '{}');
    const selectedClasses = savedData[courseId] || []; // Mảng rỗng nghĩa là chọn hết (mặc định)

    const tbody = document.getElementById('modal-class-list');
    tbody.innerHTML = '';

    // Render từng dòng trong bảng
    course.classes.forEach(cls => {
        // Nếu mảng saved rỗng (chưa config) hoặc có ID lớp -> checked
        // Logic: Nếu trong localStorage không có key courseId -> Mặc định chọn hết -> Check hết
        // Nếu có key courseId nhưng mảng rỗng -> Người dùng bỏ chọn hết -> Không check
        // Sửa lại logic chuẩn: Nếu key không tồn tại => Check All. Nếu key tồn tại => Check theo list.
        
        let isChecked = true;
        if (savedData.hasOwnProperty(courseId)) {
             isChecked = selectedClasses.includes(cls.id);
        }

        const tr = document.createElement('tr');
        tr.className = isChecked ? 'bg-blue-50' : ''; // Highlight nhẹ dòng được chọn
        tr.innerHTML = `
            <td class="whitespace-nowrap py-2 pl-3 pr-3 text-sm text-gray-500">
                <input type="checkbox" 
                       class="modal-chk-class rounded border-gray-300 text-[#004A98] focus:ring-[#004A98]" 
                       value="${cls.id}"
                       ${isChecked ? 'checked' : ''}
                       onchange="this.closest('tr').className = this.checked ? 'bg-blue-50' : ''">
            </td>
            <td class="whitespace-nowrap py-2 pl-2 pr-2 text-sm font-bold text-gray-700">${cls.id}</td>
            <td class="whitespace-nowrap py-2 pl-2 pr-2 text-xs text-gray-500 font-mono">${cls.schedule || '--'}</td>
        `;
        tbody.appendChild(tr);
    });

    // Show modal
    document.getElementById('class-modal').classList.remove('hidden');
    
    // Update trạng thái nút "Chọn tất cả"
    updateCheckAllState();
}

// 2. Hàm đóng Modal
function closeClassModal() {
    document.getElementById('class-modal').classList.add('hidden');
    currentEditingCourseId = null;
}

// 3. Hàm Lưu vào localStorage
function saveModalSelection() {
    if (!currentEditingCourseId) return;

    const checkboxes = document.querySelectorAll('#modal-class-list .modal-chk-class');
    const selected = [];
    let totalClasses = checkboxes.length;

    checkboxes.forEach(chk => {
        if (chk.checked) selected.push(chk.value);
    });

    // Lấy dữ liệu cũ
    const savedData = JSON.parse(localStorage.getItem('hcmus_selected_classes') || '{}');

    // Logic lưu:
    // Nếu chọn tất cả => Xóa key khỏi localStorage (để tiết kiệm và mặc định là All)
    // Hoặc nếu bạn muốn tường minh: Lưu tất cả ID. 
    // Ở đây mình chọn cách: Nếu chọn < tổng số lớp => Lưu mảng. Nếu chọn Full => Xóa key (để reset về default).
    
    if (selected.length === totalClasses) {
        delete savedData[currentEditingCourseId]; 
        // Cập nhật UI bên ngoài
        updateCourseRowUI(currentEditingCourseId, totalClasses, true);
    } else {
        savedData[currentEditingCourseId] = selected;
        // Cập nhật UI bên ngoài
        updateCourseRowUI(currentEditingCourseId, selected.length, false);
    }

    localStorage.setItem('hcmus_selected_classes', JSON.stringify(savedData));
    
    // Trigger sự kiện để tính toán lại lịch (nếu cần)
    if (window.renderExamSchedule) window.renderExamSchedule(); // Ví dụ gọi hàm render lại

    closeClassModal();
}

// 4. Hàm cập nhật UI dòng môn học (Label & Text)
function updateCourseRowUI(courseId, count, isFull) {
    const labelEl = document.getElementById(`label-count-${courseId}`);
    const descEl = document.getElementById(`desc-sel-${courseId}`);
    
    if (isFull) {
        labelEl.innerText = "Tất cả";
        labelEl.className = "text-gray-600";
        descEl.innerText = "Đang xem xét tất cả các lớp mở";
        descEl.className = "text-[10px] text-gray-400 truncate mt-0.5";
    } else {
        if (count === 0) {
            labelEl.innerText = "Bỏ qua";
            labelEl.className = "text-red-600 font-bold";
            descEl.innerText = "Môn này sẽ không được xếp lịch";
            descEl.className = "text-[10px] text-red-400 truncate mt-0.5";
        } else {
            labelEl.innerText = `${count} lớp`;
            labelEl.className = "text-[#004A98] font-bold";
            descEl.innerText = `Chỉ xếp lịch dựa trên ${count} lớp đã chọn`;
            descEl.className = "text-[10px] text-blue-400 truncate mt-0.5";
        }
    }
}

// 5. Tiện ích: Check all trong modal
function toggleAllModal(source) {
    const checkboxes = document.querySelectorAll('#modal-class-list .modal-chk-class');
    checkboxes.forEach(chk => {
        chk.checked = source.checked;
        chk.closest('tr').className = source.checked ? 'bg-blue-50' : '';
    });
}

function updateCheckAllState() {
    const checkboxes = document.querySelectorAll('#modal-class-list .modal-chk-class');
    const checkedCount = Array.from(checkboxes).filter(c => c.checked).length;
    document.getElementById('chk-all-modal').checked = (checkedCount === checkboxes.length && checkboxes.length > 0);
}

// Gắn hàm vào window để HTML gọi được
window.openClassModal = function(courseId) {
    currentEditingCourseId = courseId;
    
    // Tìm môn học trong danh sách courses gốc (Biến toàn cục courses chứa dữ liệu get được)
    // Giả sử biến global chứa tất cả môn học tên là window.coursesData hoặc tương tự
    // Nếu bạn chưa lưu courses ra global, hãy lưu nó khi fetch xong: window.allCourses = courses;
    const course = window.allCourses.find(c => c.id === courseId); 
    
    if (!course) {
        console.error("Không tìm thấy dữ liệu môn học: " + courseId);
        return;
    }

    // Update tiêu đề
    document.getElementById('modal-course-title').innerText = `${course.id} - ${course.name}`;

    // Lấy dữ liệu đã chọn từ localStorage
    const savedData = JSON.parse(localStorage.getItem('hcmus_selected_classes') || '{}');
    const selectedClasses = savedData[courseId] || []; // Mảng rỗng = chọn hết

    const tbody = document.getElementById('modal-class-list');
    tbody.innerHTML = '';

    // Render danh sách lớp
    course.classes.forEach(cls => {
        // Logic: Nếu chưa có key trong storage -> Mặc định là check hết. 
        // Nếu có key -> check theo list ID.
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

    // Hiển thị modal
    document.getElementById('class-modal').classList.remove('hidden');
    window.updateCheckAllState();
}

window.closeClassModal = function() {
    document.getElementById('class-modal').classList.add('hidden');
    currentEditingCourseId = null;
}

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

window.saveModalSelection = function() {
    if (!currentEditingCourseId) return;

    const checkboxes = document.querySelectorAll('#modal-class-list .modal-chk-class');
    const selected = [];
    let totalClasses = checkboxes.length;

    checkboxes.forEach(chk => {
        if (chk.checked) selected.push(chk.value);
    });

    // Lưu vào LocalStorage
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
    
    // Gọi hàm render lại lịch (nếu có)
    if (typeof window.renderExamSchedule === 'function') {
        // window.renderExamSchedule(); 
        // Hoặc hàm trigger xếp lịch lại
    }

    window.closeClassModal();
}

// Hàm cập nhật giao diện cái thẻ bên ngoài (Cái bạn gửi ở trên)
window.updateCourseRowUI = function(courseId, count, isFull) {
    const labelEl = document.getElementById(`label-count-${courseId}`);
    const descEl = document.getElementById(`desc-sel-${courseId}`);
    
    if (!labelEl || !descEl) return;

    if (isFull) {
        labelEl.innerText = "Tất cả";
        labelEl.className = ""; // Reset class nếu cần
        descEl.innerText = "Mặc định lấy tất cả các lớp mở";
        descEl.className = "text-[10px] text-gray-400 truncate mt-0.5";
    } else {
        if (count === 0) {
            // Trường hợp người dùng bỏ tick hết (nghĩa là không học môn này hoặc full options)
            // Thường thì logic là bỏ tick hết = lấy hết, code trên đang handle logic này.
            // Nếu bạn muốn bỏ tick hết = không học, sửa logic ở hàm save.
            labelEl.innerText = "Tất cả"; 
             descEl.innerText = "Mặc định lấy tất cả các lớp mở";
        } else {
            labelEl.innerText = `${count} lớp`;
            // Highlight màu xanh để biết đã lọc
            labelEl.classList.add("text-[#004A98]", "font-bold");
            descEl.innerText = `Đã lọc ${count} lớp cụ thể`;
            descEl.className = "text-[10px] text-[#004A98] truncate mt-0.5 font-medium";
        }
    }
}


// Tên key để lưu vào bộ nhớ trình duyệt
const PREF_STORAGE_KEY = 'hcmus_schedule_preferences';

// --- HÀM 1: Lấy cài đặt từ LocalStorage (Luôn dùng hàm này để lấy data mới nhất) ---
export function getStoredPreferences() {
    try {
        const raw = localStorage.getItem(PREF_STORAGE_KEY);
        if (raw) {
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error("Lỗi đọc preferences:", e);
    }
    // Giá trị mặc định nếu chưa lưu gì
    return {
        daysOff: [],          // Mảng chứa các ngày nghỉ: 0=T2, ..., 5=T7, 6=CN
        strategy: 'default',  // 'compress' | 'spread'
        session: '0',         // '0': All, '1': Sáng, '2': Chiều
        noGaps: false
    };
}

// --- HÀM 2: Lưu cài đặt (Gắn hàm này vào nút "Lưu" ở Modal Cài đặt) ---
export function savePreferencesToStorage(newPrefs) {
    localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify(newPrefs));
    console.log("Đã lưu cài đặt:", newPrefs);
    alert("Đã lưu cài đặt xếp lịch!");
}


// Expose hàm lưu ra window để HTML gọi được (nếu bạn dùng onclick trong HTML)
window.saveAdvancedSettings = function() {
    // SỬA LỖI Ở ĐÂY: đổi 'day-off' thành 'day_off'
    const daysOff = [];
    document.querySelectorAll('input[name="day_off"]:checked').forEach(el => {
        daysOff.push(parseInt(el.value));
    });

    const strategyEl = document.querySelector('input[name="strategy"]:checked');
    const strategy = strategyEl ? strategyEl.value : 'default';

    const sessionEl = document.querySelector('input[name="session"]:checked');
    const session = sessionEl ? sessionEl.value : '0';

    // Sửa ID: pref-gap (khớp với HTML)
    const noGaps = document.getElementById('pref-gap')?.checked || false;

    const prefs = {
        daysOff: daysOff,
        strategy: strategy,
        session: session,
        noGaps: noGaps
    };

    // Lưu vào LocalStorage
    localStorage.setItem('hcmus_schedule_preferences', JSON.stringify(prefs));
    
    console.log("✅ Đã lưu cài đặt mới:", prefs);
    
    if(window.closeModal) window.closeModal();
};


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