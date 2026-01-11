import { runScheduleSolver } from './tkb/Scheduler.js';
import { renderCourseList } from './render/Dashboard.js';
import { CourseRecommender } from './tkb/Recommender.js';

export let AUX_DATA = {
    prerequisites: [],
    allCourses: [],
    categories: {} // [MỚI] Thêm chỗ chứa Categories
};

// Biến toàn cục lưu dữ liệu gốc
let GLOBAL_COURSE_DB = [];

// --- HÀM KHỞI TẠO ---
export async function initApp() {
    await loadAuxiliaryData(); 

    // 1. Load dữ liệu lớp mở
    const data = await loadCourseData();
    
    // 2. Load dữ liệu sinh viên
    const studentDataStr = localStorage.getItem('student_db_full');
    let studentData = studentDataStr ? JSON.parse(studentDataStr) : null;

    // 3. Chạy Recommender & Render
    if (data.length > 0) {
        // Áp dụng gợi ý (NẾU CÓ studentData)
        GLOBAL_COURSE_DB = applyRecommendation(data, studentData);
        console.log(`✅ Đã nạp ${GLOBAL_COURSE_DB.length} môn.`);
        
        if(window.renderCourseList) window.renderCourseList(GLOBAL_COURSE_DB);
    }

    // --- SỰ KIỆN NHẬN DATA TỪ PORTAL ---
    window.addEventListener("message", (event) => {
        // [FIX LỖI] Khai báo payload trước
        const payload = event.data.payload;
        if (!payload) return;

        console.log("📥 Đã nhận dữ liệu từ Portal:", payload);

        // 1. LƯU DASHBOARD
        localStorage.setItem('student_db_full', JSON.stringify(payload));
        if(window.renderDashboardUI) window.renderDashboardUI(payload);

        // 2. XỬ LÝ DANH SÁCH LỚP
        if (payload.rawOpenCourses && payload.rawOpenCourses.length > 0) {
            console.log(`⚙️ Đang xử lý...`);
            
            // Hàm này (processRawCourseData) phải có trong Logic.js hoặc được import
            // Nếu chưa có, nhớ import từ Logic.js
            let processedDB = [];
            if (window.processRawCourseData) {
                 processedDB = window.processRawCourseData(payload.rawOpenCourses);
            } else {
                 // Fallback hoặc import
                 console.error("Thiếu hàm processRawCourseData!"); 
            }

            if (processedDB.length > 0) {
                // Chạy Recommender ngay khi có dữ liệu mới
                const recommendedDB = applyRecommendation(processedDB, payload);

                localStorage.setItem('course_db_offline', JSON.stringify(recommendedDB));
                GLOBAL_COURSE_DB = recommendedDB;
                
                if(window.renderCourseList) window.renderCourseList(GLOBAL_COURSE_DB);
                alert(`Đã cập nhật ${recommendedDB.length} môn học!`);
            }
        }
    }, false);
    
    // Gán các hàm cần thiết vào window
    window.toggleRow = toggleRow;
    window.filterCourses = filterCourses;
    window.onNutBamXepLich = onNutBamXepLich;
    window.runScheduleSolver = runScheduleSolver; 
}

// --- CÁC HÀM UTILS & RENDER ---

// [QUAN TRỌNG] Hàm này đã được sửa để ưu tiên LocalStorage
async function loadCourseData() {
    // 1. ƯU TIÊN KIỂM TRA LOCAL STORAGE TRƯỚC
    const offlineData = localStorage.getItem('course_db_offline');
    
    if (offlineData) {
        try {
            const parsed = JSON.parse(offlineData);
            // Kiểm tra sơ bộ xem dữ liệu có hợp lệ không
            if (Array.isArray(parsed) && parsed.length > 0) {
                console.log("✅ Đã tải dữ liệu lớp từ LocalStorage (Offline).");
                return parsed; // <--- Trả về luôn, không fetch nữa
            }
        } catch (e) {
            console.warn("⚠️ Dữ liệu LocalStorage lỗi, sẽ tải file mẫu.");
            localStorage.removeItem('course_db_offline'); // Xóa đi cho sạch
        }
    }

    // 2. NẾU KHÔNG CÓ (HOẶC LỖI) MỚI ĐI TẢI FILE
    console.log("ℹ️ Không có dữ liệu Offline, đang tải file Course_db.json...");
    try {
        const response = await fetch('./js/tkb/Course_db.json'); 
        if (!response.ok) throw new Error("Không tải được file dữ liệu môn học!");
        return await response.json();
    } catch (error) {
        console.error("❌ Lỗi tải data:", error);
        return []; // Trả về mảng rỗng để không crash app
    }
}

function toggleRow(subjID) {
    const row = document.getElementById(`row-${subjID}`);
    const chk = row.querySelector('.chk-course');
    const sel = document.getElementById(`sel-${subjID}`);

    if (chk.checked) {
        row.classList.add('selected');
        sel.disabled = false;
    } else {
        row.classList.remove('selected');
        sel.disabled = true;
        sel.value = "";
    }
}

function filterCourses() {
    const keyword = document.getElementById('inp-search').value.toLowerCase();
    const rows = document.querySelectorAll('.course-row');

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        if (text.includes(keyword)) {
            row.style.display = 'flex';
        } else {
            row.style.display = 'none';
        }
    });
}

// --- LOGIC XẾP LỊCH ---

// --- LOGIC XẾP LỊCH (ĐÃ SỬA LỖI) ---
async function onNutBamXepLich() {
    const btn = document.querySelector('button[onclick="onNutBamXepLich()"]');
    // Phòng hờ nếu không tìm thấy nút
    if (btn) {
        var originalText = btn.innerText;
        btn.innerText = "⏳ Đang tính toán...";
        btn.disabled = true;
    }

    try {
        const userWants = [];
        const fixed = {};
        
        // 1. Lấy danh sách môn đã tick chọn
        const checkboxes = document.querySelectorAll('.chk-course:checked');
        
        if (checkboxes.length === 0) {
            alert("Bạn chưa chọn môn học nào!");
            if (btn) { btn.innerText = originalText; btn.disabled = false; }
            return;
        }

        checkboxes.forEach(chk => {
            const subjID = chk.value;
            userWants.push(subjID);
            
            // Lấy lớp cố định (nếu có chọn trong dropdown)
            const dropdown = document.getElementById(`sel-${subjID}`);
            if (dropdown && dropdown.value !== "") {
                fixed[subjID] = dropdown.value;
            }
        });

        // 2. [SỬA LỖI] Xử lý Preference (Sáng/Chiều)
        // Nếu giao diện không có dropdown này thì mặc định là 0 (Không ưu tiên)
        const prefEl = document.getElementById('sel-session-pref');
        const pref = prefEl ? parseInt(prefEl.value) : 0; 

        // 3. Gọi Engine Xếp Lịch
        if (typeof runScheduleSolver === 'function') {
            // Dùng setTimeout để UI không bị đơ khi tính toán nặng
            setTimeout(() => {
                const ketQua = runScheduleSolver(GLOBAL_COURSE_DB, userWants, fixed, pref);
                console.log("Kết quả xếp lịch:", ketQua);
                
                // Vẽ kết quả ra HTML
                renderScheduleResults(ketQua);
                
                // [MỚI] Tự động chuyển sang Tab Lịch dự kiến để xem kết quả
                if (window.switchViewMode) {
                    window.switchViewMode('schedule');
                }

                // Trả lại trạng thái nút bấm
                if (btn) {
                    btn.innerText = originalText;
                    btn.disabled = false;
                }
            }, 50);
        } else {
            throw new Error("Hàm runScheduleSolver chưa được import!");
        }

    } catch (e) {
        console.error(e);
        alert("Lỗi: " + e.message);
        if (btn) {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
}

function decodeScheduleMask(parts) {
    let slots = [];
    for (let i = 0; i < 4 && i < parts.length; i++) {
        let part = parts[i];
        for (let bit = 0; bit < 32; bit++) {
            if ((part & (1 << bit)) !== 0) {
                let totalBit = i * 32 + bit;
                let day = Math.floor(totalBit / 10);
                let period = totalBit % 10;
                if (day < 7) slots.push({ day: day, period: period });
            }
        }
    }
    return slots;
}

// --- RENDER KẾT QUẢ THỜI KHÓA BIỂU (CÓ TÊN MÔN + NỐI TIẾT) ---
function renderScheduleResults(results) {
    const container = document.getElementById('schedule-results-area');
    container.innerHTML = '';
    container.style.display = 'block';

    if (!results || results.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-500"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                </div>
                <p class="text-gray-900 font-medium">Không tìm thấy lịch phù hợp!</p>
                <p class="text-gray-500 text-sm mt-1">Thử bỏ bớt môn hoặc đổi ưu tiên.</p>
            </div>
        `;
        return;
    }

    const days = ["Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy", "CN"];

    results.forEach((opt, index) => {
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

// Hàm lấy màu (Giữ nguyên hoặc dùng bản này cho đẹp hơn)
function getColorForSubject(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
        "bg-blue-50 border-blue-500 text-blue-900",
        "bg-emerald-50 border-emerald-500 text-emerald-900",
        "bg-violet-50 border-violet-500 text-violet-900",
        "bg-amber-50 border-amber-500 text-amber-900",
        "bg-rose-50 border-rose-500 text-rose-900",
        "bg-cyan-50 border-cyan-500 text-cyan-900",
        "bg-fuchsia-50 border-fuchsia-500 text-fuchsia-900",
        "bg-lime-50 border-lime-500 text-lime-900",
    ];
    return colors[Math.abs(hash) % colors.length];
}

function parseScheduleString(str) {
    // VD: "T2(1-3)" -> { day: 0, start: 1, end: 3 }
    const match = str.match(/T(\d)\((\d+)-(\d+)\)/);
    if (match) {
        return {
            day: parseInt(match[1]) - 2, // T2 -> 0, T3 -> 1
            start: parseInt(match[2]),
            end: parseInt(match[3])
        };
    }
    return null;
}

// Chuyển mảng string ["T2(1-3)"] -> Bitmask [int, int, int, int]
export function encodeScheduleToMask(scheduleStrArray) {
    let mask = [0, 0, 0, 0]; 
    if (!Array.isArray(scheduleStrArray)) return mask;

    scheduleStrArray.forEach(str => {
        const parsed = parseScheduleString(str);
        if (parsed) {
            for (let i = parsed.start; i <= parsed.end; i++) {
                const bitIndex = (parsed.day * 10) + (i - 1); 
                const arrayIndex = Math.floor(bitIndex / 32);
                const bitPos = bitIndex % 32;
                if (arrayIndex < 4) mask[arrayIndex] |= (1 << bitPos);
            }
        }
    });
    return mask;
}


// File: js/Utils.js

export function clearCacheAndReload() {
    if (confirm("Bạn có chắc muốn xóa toàn bộ dữ liệu đã lưu và tải lại trang?")) {
        // Xóa các key quan trọng nhất
        localStorage.removeItem('course_db_offline');
        localStorage.removeItem('student_db_full');
        
        // Reload để áp dụng thay đổi
        window.location.reload();
    }
}

async function loadAuxiliaryData() {
    try {
        // Tải thêm categories.json
        const [prereqRes, coursesRes, catsRes] = await Promise.all([
            fetch('./assets/data/prerequisites.json'),
            fetch('./assets/data/courses.json'),
            fetch('./assets/data/categories.json') // [MỚI] File cấu trúc ngành
        ]);

        if (prereqRes.ok) AUX_DATA.prerequisites = await prereqRes.json();
        if (coursesRes.ok) AUX_DATA.allCourses = await coursesRes.json();
        if (catsRes.ok) AUX_DATA.categories = await catsRes.json(); // [MỚI]

        console.log("📚 Đã tải dữ liệu môn học, tiên quyết & cấu trúc ngành.");
    } catch (e) {
        console.warn("⚠️ Không tải được dữ liệu phụ trợ. Tính năng gợi ý có thể hạn chế.", e);
    }
}

// [CẬP NHẬT] Hàm chạy Recommender
function applyRecommendation(courseDB, studentData) {
    if (!studentData || !AUX_DATA.prerequisites.length) return courseDB;

    try {
        const recommender = new CourseRecommender(
            studentData, 
            courseDB, 
            AUX_DATA.prerequisites, 
            AUX_DATA.allCourses,
            AUX_DATA.categories // [MỚI] Truyền categories vào
        );
        
        // Lấy danh sách gợi ý (đã có status code)
        const recommendedCourses = recommender.recommend();
        
        // Map kết quả vào danh sách gốc
        const recMap = new Map();
        recommendedCourses.forEach(c => recMap.set(c.id, c.recommendationStatus));

        courseDB.forEach(course => {
            if (recMap.has(course.id)) {
                course.recommendationStatus = recMap.get(course.id); // 'RETAKE', 'MANDATORY'...
                course.isRecommended = true; // Giữ flag cũ cho tương thích
            } else {
                course.recommendationStatus = null;
                course.isRecommended = false;
            }
        });

        // Sắp xếp: Ưu tiên gợi ý lên đầu
        courseDB.sort((a, b) => {
            const priority = { 'RETAKE': 4, 'MANDATORY': 3, 'ELECTIVE_REQUIRED': 2, 'SUGGESTED': 1, null: 0 };
            const pA = priority[a.recommendationStatus] || 0;
            const pB = priority[b.recommendationStatus] || 0;
            return pB - pA; // Cao xếp trước
        });

        return courseDB;

    } catch (e) {
        console.error("❌ Lỗi Recommender:", e);
        return courseDB;
    }
}

// Gán vào window để gọi được từ button onclick trong HTML
window.clearAppCache = clearCacheAndReload;