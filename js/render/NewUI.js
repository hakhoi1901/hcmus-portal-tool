import { AUX_DATA } from '../Utils.js'
import { encodeScheduleToMask, decodeScheduleMask, calculateTuition } from '../Utils.js';
import { GLOBAL_COURSE_DB } from '../Utils.js'
import { logStatus, logSuccess, logWarning, logAlgo, logData, logError} from '../styleLog.js';

const MAX_CREDITS = 25; // Giới hạn tín chỉ tối đa

// --- CẤU HÌNH MENU ---
export const SIDEBAR_CONFIG = [
    {
        category: "Chính",
        items: [
            { id: "overview", label: "Tổng quan", icon: `<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"></path><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>` },
            { id: "roadmap", label: "Lộ trình học tập", subLabel: "Chọn môn & Lịch", icon: `<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"></path><path d="M15 5.764v15"></path><path d="M9 3.236v15"></path>` },
            { id: "grades", label: "Quản lý điểm", subLabel: "GPA & Học lại", icon: `<path d="M3 3v16a2 2 0 0 0 2 2h16"></path><path d="M18 17V9"></path><path d="M13 17V5"></path><path d="M8 17v-3"></path>` }
        ]
    },
    {
        category: "Tài chính",
        items: [
            { id: "tuition", label: "Học phí", icon: `<line x1="12" x2="12" y1="2" y2="22"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>` }
        ]
    },
    {
        category: "Công cụ",
        items: [
            { id: "timetable", label: "Thời khóa biểu", subLabel: "Lịch đã chốt", icon: `<path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path>` },
            { id: "settings", label: "Cài đặt", icon: `<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path><circle cx="12" cy="12" r="3"></circle>` }
        ]
    }
];

// --- HÀM 1: RENDER SIDEBAR ---
export function renderSidebar(activeId = 'roadmap') {
    const container = document.getElementById('sidebar-menu-area');
    if (!container) return;
    
    let html = '';
    SIDEBAR_CONFIG.forEach(group => {
        html += `<div class="mb-6"><p class="px-3 mb-2 text-xs text-blue-300 uppercase tracking-wider truncate" style="font-weight: 500;">${group.category}</p><ul class="space-y-1">`;
        group.items.forEach(item => {
            const isActive = item.id === activeId;
            const bgClass = isActive ? "bg-white/10" : "hover:bg-white/5";
            const textClass = isActive ? "text-white" : "text-blue-100 group-hover:text-white";
            const indicator = isActive ? `<div class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r"></div>` : "";
            const subLabel = item.subLabel ? `<p class="text-blue-300 text-xs mt-0.5 leading-tight truncate font-normal">${item.subLabel}</p>` : "";

            html += `<li>
                <a href="#" onclick="window.switchPage('${item.id}')" class="flex items-start gap-3 px-3 py-2.5 rounded transition-all group relative ${bgClass}">
                    ${indicator}
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0 mt-0.5 text-current">${item.icon}</svg>
                    <div class="flex-1 min-w-0">
                        <p class="truncate ${textClass} font-${isActive ? 'medium' : 'normal'}">${item.label}</p>
                        ${subLabel}
                    </div>
                </a>
            </li>`;
        });
        html += `</ul></div>`;
    });
    container.innerHTML = html;
}

// --- HÀM 2: CHUYỂN TRANG (GẮN GLOBAL) ---
window.switchPage = (pageId) => {
    // A. Highlight Sidebar
    renderSidebar(pageId);

    // B. Ẩn/Hiện Nội dung
    const allPages = document.querySelectorAll('.page-content');
    allPages.forEach(p => p.classList.add('hidden'));

    const target = document.getElementById(`page-${pageId}`);
    if (target) {
        target.classList.remove('hidden');
    } else {
        console.warn(`Chưa làm giao diện cho trang: page-${pageId}`);
    }
}
// --- HÀM 3: RENDER DANH SÁCH MÔN (ĐÃ SỬA LỖI) ---
let SELECTED_COURSES = new Set();
let GLOBAL_COURSES_REF = [];
// --- HÀM 1: RENDER UI CHÍNH (ĐÃ TỐI ƯU HTML & LOGIC LỌC) ---
export function renderNewUI(courses) {
    if (!courses || courses.length === 0) return;

    if (SELECTED_COURSES.size === 0) {
        loadBasket();
    }
    
    GLOBAL_COURSES_REF = courses;
    
    window.switchPage('roadmap'); 
    updateHeaderInfo();

    const container = document.getElementById('course-list-container');
    if (!container) return;
    container.innerHTML = '';
    
    // CSS Container
    container.className = "space-y-8 w-full max-w-7xl mx-auto pb-24 px-2"; 

    // Map dữ liệu lớp mở
    const openCoursesMap = new Map();
    courses.forEach(c => openCoursesMap.set(c.id, c));

    // Biến lưu các ID đã được render để tìm môn mồ côi
    const renderedCourseIds = new Set();

    // 1. Render theo Categories (Nếu có dữ liệu)
    if (AUX_DATA.categories && Object.keys(AUX_DATA.categories).length > 0) {
        
        // Hàm đệ quy render nhóm
        const renderCategoryRecursive = (key, categoryData, level = 0) => {
            let htmlContent = '';
            let hasAnyCourse = false;

            // A. Tìm và Render các môn học trực tiếp của nhóm này
            if (categoryData.courses && Array.isArray(categoryData.courses)) {
                const validCourses = categoryData.courses
                    .map(id => openCoursesMap.get(id))
                    .filter(c => c !== undefined);

                if (validCourses.length > 0) {
                    hasAnyCourse = true;
                    // Đánh dấu đã render
                    validCourses.forEach(c => renderedCourseIds.add(c.id));

                    htmlContent += `<div class="space-y-2 mt-2 mb-4 w-full">`;
                    validCourses.forEach(course => {
                        htmlContent += renderCourseCard(course);
                    });
                    htmlContent += `</div>`;
                }
            }

            // B. Đệ quy Render các nhóm con (Breakdown hoặc Sub-groups)
            // Tìm các key con là object (trừ metadata)
            const subKeys = [];
            if (categoryData.breakdown) {
                Object.keys(categoryData.breakdown).forEach(k => subKeys.push({key: k, data: categoryData.breakdown[k]}));
            } else {
                // Fallback cho cấu trúc không có 'breakdown'
                for (const [k, v] of Object.entries(categoryData)) {
                    if (typeof v === 'object' && v !== null && k !== 'courses' && k !== 'breakdown') {
                         if(v.name || v.courses || v.breakdown || v.sub_groups) subKeys.push({key: k, data: v});
                    }
                }
            }

            let subGroupsHtml = '';
            subKeys.forEach(sub => {
                const result = renderCategoryRecursive(sub.key, sub.data, level + 1);
                if (result.hasContent) {
                    hasAnyCourse = true;
                    subGroupsHtml += result.html;
                }
            });

            // C. Nếu nhóm này (hoặc con nó) có chứa môn học -> Sinh HTML Wrapper
            if (hasAnyCourse) {
                const title = categoryData.name || formatCategoryName(key);
                const note = categoryData.note ? `<span class="text-xs font-normal text-gray-500 ml-2">(${categoryData.note})</span>` : '';
                const credits = categoryData.credits ? `<span class="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-full ml-2 font-normal">Yêu cầu: ${categoryData.credits} TC</span>` : '';

                // Style tiêu đề
                let headerClass = "";
                let wrapperClass = "filterable-group w-full transition-all duration-300"; // Class để lọc

                if (level === 0) {
                    headerClass = "text-xl text-[#004A98] border-b border-gray-200 pb-2 mt-8 mb-4 uppercase tracking-wide font-bold flex items-center";
                    wrapperClass += " mb-8";
                } else if (level === 1) {
                    headerClass = "text-lg text-gray-800 mt-4 mb-3 font-semibold flex items-center";
                    wrapperClass += " ml-0 md:ml-4 border-l-2 border-gray-100 pl-4";
                } else {
                    headerClass = "text-sm text-gray-700 mt-2 mb-2 font-medium flex items-center";
                    wrapperClass += " ml-4 pl-4 border-l border-dotted border-gray-200";
                }

                const finalHtml = `
                    <div class="${wrapperClass}" data-group-id="${key}">
                        <h3 class="${headerClass}">
                            ${title}
                            ${credits}
                        </h3>
                        <h3 class="${headerClass}-note">${note}</h3>
                        ${htmlContent}
                        ${subGroupsHtml}
                    </div>
                `;
                return { hasContent: true, html: finalHtml };
            }

            return { hasContent: false, html: '' };
        };

        // --- CHẠY RENDER ---
        let mainHtml = '';
        for (const [key, data] of Object.entries(AUX_DATA.categories)) {
            const res = renderCategoryRecursive(key, data);
            if (res.hasContent) mainHtml += res.html;
        }

        container.innerHTML = mainHtml;

        // 2. Render Môn Mồ Côi (Chưa được phân nhóm)
        const orphanCourses = courses.filter(c => !renderedCourseIds.has(c.id));
        if (orphanCourses.length > 0) {
            const orphanHtml = `
                <div class="filterable-group w-full mt-12 border-t-2 border-dashed border-gray-300 pt-8">
                    <h3 class="text-xl text-gray-500 font-bold mb-6 uppercase flex items-center">
                        Môn học khác
                        <span class="text-xs font-normal text-gray-400 ml-2">(Chưa phân loại)</span>
                    </h3>
                    <div class="space-y-2 w-full">
                        ${orphanCourses.map(c => renderCourseCard(c)).join('')}
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', orphanHtml);
        }

    } else {
        // Fallback nếu không có file Categories
        renderDefaultGroups(courses, container);
    }

    updateBasketUI();
}

// --- HÀM 2: VẼ CARD MÔN HỌC (1 DÒNG) ---
export function renderCourseCard(course) {
    const isSelected = SELECTED_COURSES.has(course.id);
    
    // Tín chỉ Fallback
    let credits = course.credits;
    if (!credits || credits == 0) {
        if (AUX_DATA && AUX_DATA.allCourses) {
            const meta = AUX_DATA.allCourses.find(ac => ac.course_id === course.id);
            if (meta) credits = meta.credits;
        }
        if (!credits) credits = '?';
    }

    let borderClass = "border-gray-200 bg-white hover:border-[#004A98] hover:shadow-md";
    let statusBadge = `<span class="px-2.5 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium inline-block whitespace-nowrap">Sẵn sàng</span>`;

    if (course.recommendationStatus) {
        switch (course.recommendationStatus) {
            case 'RETAKE': borderClass = "border-red-200 bg-red-50 hover:bg-red-100"; statusBadge = `<span class="px-2.5 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium inline-block whitespace-nowrap">Học lại</span>`; break;
            case 'MANDATORY': borderClass = "border-blue-200 bg-blue-50 hover:bg-blue-100"; statusBadge = `<span class="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium inline-block whitespace-nowrap">Bắt buộc</span>`; break;
            case 'ELECTIVE_REQUIRED': borderClass = "border-purple-200 bg-purple-50 hover:bg-purple-100"; statusBadge = `<span class="px-2.5 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium inline-block whitespace-nowrap">Tự chọn</span>`; break;
            case 'SUGGESTED': borderClass = "border-indigo-200 bg-indigo-50 hover:bg-indigo-100"; statusBadge = `<span class="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium inline-block whitespace-nowrap">Bổ trợ</span>`; break;
        }
    } else if (course.status === 'FAILED') {
         borderClass = "border-red-200 bg-red-50 hover:bg-red-100";
         statusBadge = `<span class="px-2.5 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium inline-block whitespace-nowrap">Học lại</span>`;
    }

    return `
        <div class="group course-row flex flex-col p-0 rounded-lg transition-all duration-200 w-full" id="row-${course.id}" data-name="${course.name.toLowerCase()}">
            <div class="flex items-center gap-3 px-4 py-2.5 border rounded-lg transition-all w-full ${borderClass}">
                <input 
                    type="checkbox" 
                    class="chk-course w-4 h-4 text-[#004A98] border-gray-300 rounded focus:ring-[#004A98] cursor-pointer flex-shrink-0"
                    value="${course.id}"
                    id="chk-${course.id}"
                    onchange="window.toggleNewRow('${course.id}')"
                    ${isSelected ? 'checked' : ''}
                >
                <div class="w-24 flex-shrink-0">
                    <p class="text-sm font-semibold text-gray-900">${course.id}</p>
                </div>
                <div class="flex-1 min-w-0 flex flex-col">
                    <p class="text-sm text-gray-900 truncate font-medium" title="${course.name}">${course.name}</p>
                    <div id="area-sel-${course.id}" class="${isSelected ? '' : 'hidden'} mt-1.5 animate-fadeIn w-full">
                        <select id="sel-${course.id}" class="text-xs border border-blue-200 rounded p-1.5 bg-blue-50 text-blue-900 focus:bg-white focus:border-[#004A98] focus:ring-1 focus:ring-[#004A98] outline-none shadow-sm w-full md:w-auto md:min-w-[200px] transition-all">
                            <option value="">-- Để máy tự xếp (Tự do) --</option>
                            ${course.classes.map(cls => `<option value="${cls.id}">Lớp ${cls.id} (${cls.schedule})</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="w-16 flex-shrink-0 text-center">
                    <span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-medium whitespace-nowrap">${credits} TC</span>
                </div>
                <div class="w-32 flex-shrink-0 text-right">
                     ${statusBadge}
                </div>
                <div class="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button onclick="window.openInfoModal('${course.id}')" class="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Chi tiết">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    </button>
                    <button onclick="window.openPrereqModal('${course.id}')" class="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Tiên quyết">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500"><line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// --- HÀM 3: FILTER MỚI (FIX HOÀN TOÀN) ---
window.filterCourses = () => {
    const key = document.getElementById('inp-search').value.toLowerCase().trim();
    
    // B1: Reset trạng thái hiển thị của tất cả
    const allRows = document.querySelectorAll('.course-row');
    const allGroups = document.querySelectorAll('.filterable-group');
    
    // B2: Lọc từng dòng môn học (Leaf Nodes)
    allRows.forEach(row => {
        const code = (row.querySelector('p.font-semibold') ? row.querySelector('p.font-semibold').innerText : "").toLowerCase();
        const name = (row.dataset.name || "").toLowerCase();
        const text = code + " " + name;

        if (text.includes(key)) {
            row.style.display = ''; // Hiện
            row.classList.remove('hidden');
        } else {
            row.style.display = 'none'; // Ẩn
            row.classList.add('hidden');
        }
    });

    // B3: Lọc Nhóm (Duyệt ngược từ nhóm con lên nhóm cha sẽ tốt hơn, 
    // nhưng để đơn giản ta duyệt tất cả và check "contains visible children")
    
    // Ta dùng logic: Một nhóm được hiện khi nó chứa ít nhất 1 dòng course-row đang hiện.
    // Vì cấu trúc lồng nhau, ta cần check kỹ.
    
    // Mẹo: Duyệt list group từ dưới lên (đảo ngược mảng NodeList) để xử lý con trước cha
    const reversedGroups = Array.from(allGroups).reverse();
    
    reversedGroups.forEach(group => {
        // Tìm xem bên trong nó có .course-row nào đang visible không?
        // Lưu ý: querySelectorAll sẽ tìm cả trong con cháu.
        const visibleRows = Array.from(group.querySelectorAll('.course-row')).filter(r => r.style.display !== 'none');
        
        if (visibleRows.length > 0) {
            group.style.display = '';
            group.classList.remove('hidden');
        } else {
            group.style.display = 'none';
            group.classList.add('hidden');
        }
    });
}

// Các hàm phụ trợ khác (formatCategoryName, toggleNewRow, updateHeaderInfo, openModal...)
// Bạn giữ nguyên như cũ.
export function formatCategoryName(key) {
    const map = {
        "GENERAL_EDUCATION": "Giáo dục Đại cương",
        "FOUNDATION": "Cơ sở Nhóm ngành",
        "MAJOR_NETWORK": "Chuyên ngành Mạng máy tính",
        "MAJOR_IT": "Chuyên ngành Công nghệ Thông tin",
        "GRADUATION": "Tốt nghiệp"
    };
    return map[key] || key.replace(/_/g, ' ');
}

window.toggleNewRow = (id) => {
    const chk = document.getElementById(`chk-${id}`);
    const area = document.getElementById(`area-sel-${id}`);
    
    if (chk.checked) {
        SELECTED_COURSES.add(id);
        if(area) area.classList.remove('hidden');
        document.getElementById(`row-${id}`).querySelector('.border').classList.add('ring-1', 'ring-[#004A98]', 'bg-blue-50/30');
    } else {
        SELECTED_COURSES.delete(id);
        if(area) area.classList.add('hidden');
        document.getElementById(`row-${id}`).querySelector('.border').classList.remove('ring-1', 'ring-[#004A98]', 'bg-blue-50/30');
    }
    updateBasketUI();
    saveBasket();
}

// --- 2. HÀM MỞ MODAL THÔNG TIN (INFO) ---
window.openInfoModal = (courseId) => {
    const course = GLOBAL_COURSES_REF.find(c => c.id === courseId);
    if (!course) return;

    const html = `
    <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
        <div class="flex justify-between items-start mb-4">
            <div>
                <h3 class="text-xl font-bold text-[#004A98]">${course.id}</h3>
                <p class="text-gray-700 font-medium">${course.name}</p>
            </div>
            <button onclick="window.closeModal()" class="p-1 hover:bg-gray-100 rounded">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
        </div>
        <div class="space-y-3 text-sm text-gray-600">
            <p><strong>Số tín chỉ:</strong> ${course.credits}</p>
            <p><strong>Số lớp mở:</strong> ${course.classes.length}</p>
            <p><strong>Loại môn:</strong> ${course.course_type || "Lý thuyết/Thực hành"}</p>
            <div class="p-3 bg-gray-50 rounded border border-gray-200">
                <p class="font-medium mb-1">Các lớp đang mở:</p>
                <div class="flex flex-wrap gap-2">
                    ${course.classes.map(c => `<span class="px-2 py-1 bg-white border border-gray-300 rounded text-xs">${c.id}</span>`).join('')}
                </div>
            </div>
        </div>
    </div>`;
    
    showModalOverlay(html);
}

// --- 3. HÀM MỞ MODAL SƠ ĐỒ TIÊN QUYẾT (FLOWCHART) ---
window.openPrereqModal = (courseId) => {
    const course = GLOBAL_COURSES_REF.find(c => c.id === courseId);
    if (!course) return;

    // Tìm môn tiên quyết trong AUX_DATA
    const prereqData = AUX_DATA.prerequisites.filter(p => p.course_id === courseId);
    
    let contentHTML = '';

    // TRƯỜNG HỢP 1: KHÔNG CÓ MÔN TIÊN QUYẾT
    if (prereqData.length === 0) {
        contentHTML = `
            <div class="text-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-check-big w-16 h-16 text-green-500 mx-auto mb-4"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg>
                <h4 class="text-gray-900 mb-2 font-bold text-lg">Không yêu cầu môn tiên quyết</h4>
                <p class="text-gray-600">Môn học này có thể đăng ký tự do.</p>
            </div>
        `;
    } 
    // TRƯỜNG HỢP 2: CÓ MÔN TIÊN QUYẾT (VẼ CÂY)
    else {
        // Tách danh sách ID môn tiên quyết
        const pIds = [];
        prereqData.forEach(p => {
            const ids = p.prereq_id.replace(/,/g, ' ').split(/\s+/).filter(x => x.length > 0);
            pIds.push(...ids);
        });

        // HTML cho các nút con (Môn tiên quyết)
        const prereqNodesHTML = pIds.map(pid => {
            // Check xem đã qua môn này chưa (giả lập check từ AUX_DATA.studentData)
            // Tạm thời hiển thị màu xám nếu chưa học, màu xanh nếu đã học
            // Bạn có thể update logic check status ở đây nếu muốn chính xác 100%
            
            return `
                <div class="relative">
                    <div class="flex flex-col items-center">
                        <div class="px-4 py-3 rounded-lg border-2 min-w-[180px] bg-white border-gray-300 text-gray-900">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-sm font-bold text-gray-700">${pid}</span>
                                </div>
                            <p class="text-xs text-gray-500">Môn tiên quyết</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        contentHTML = `
            <div class="flex justify-center min-h-[300px] pt-10">
                <div class="flex flex-col items-center">
                    <div class="px-4 py-3 rounded-lg border-2 min-w-[200px] bg-[#004A98] text-white border-[#004A98] shadow-lg relative z-10">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-sm font-bold text-white">${course.id}</span>
                        </div>
                        <p class="text-sm text-white font-medium">${course.name}</p>
                        <p class="text-xs mt-1 text-blue-200">${course.credits} tín chỉ</p>
                    </div>

                    <div class="flex items-center justify-center my-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-down w-6 h-6 text-gray-400"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
                    </div>

                    <div class="flex gap-6 flex-wrap justify-center">
                        ${prereqNodesHTML}
                    </div>
                </div>
            </div>
        `;
    }

    // Khung Modal
    const modalHTML = `
        <div class="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-fadeIn">
            <div class="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                    <h3 class="text-gray-900 mb-1 font-bold text-lg">Sơ đồ môn tiên quyết</h3>
                    <p class="text-gray-600 text-sm">Điều kiện đăng ký cho môn: <span class="font-semibold text-[#004A98]">${course.id} - ${course.name}</span></p>
                </div>
                <button onclick="window.closeModal()" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x w-5 h-5 text-gray-600"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
            </div>
            
            <div class="flex-1 overflow-auto p-8 bg-slate-50">
                ${contentHTML}
            </div>

            <div class="p-6 border-t border-gray-200 bg-white">
                <p class="text-sm text-gray-600 mb-3 font-medium">Chú thích:</p>
                <div class="flex gap-6">
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded bg-[#004A98]"></div>
                        <span class="text-sm text-gray-700">Môn đang chọn</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded bg-white border-2 border-gray-300"></div>
                        <span class="text-sm text-gray-700">Môn tiên quyết</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    showModalOverlay(modalHTML);
}

// --- HÀM UTILS: HIỂN THỊ OVERLAY ---
export function showModalOverlay(innerHTML) {
    // Xóa modal cũ nếu có
    const old = document.getElementById('custom-modal-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'custom-modal-overlay';
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade';
    overlay.innerHTML = innerHTML;
    
    // Đóng khi click ra ngoài
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) window.closeModal();
    });

    document.body.appendChild(overlay);
}

window.closeModal = () => {
    const el = document.getElementById('custom-modal-overlay');
    if (el) el.remove();
}


export function updateBasketUI() {
    const list = document.getElementById('basket-list');
    const countEl = document.getElementById('basket-count');
    const credEl = document.getElementById('total-credits');
    const moneyEl = document.getElementById('total-tuition');
    const prog = document.getElementById('credit-progress');

    if (!list) return;
    list.innerHTML = '';
    
    let totalCred = 0;
    let totalMoney = 0; // Biến tính tổng tiền mới
    let tuition_log = '';

    if (SELECTED_COURSES.size === 0) {
        list.innerHTML = `<div class="text-center py-12"><p class="text-gray-400 text-sm">Chưa có môn nào</p></div>`;
    } else {
        SELECTED_COURSES.forEach(cid => {
            let c = GLOBAL_COURSES_REF.find(x => x.id === cid);
            let name = c ? c.name : cid;
            let credits = c ? c.credits : 0;

            if (AUX_DATA && AUX_DATA.allCourses) {
                const meta = AUX_DATA.allCourses.find(ac => ac.course_id === cid);
                if (meta) {
                    if (!name || name === cid) name = meta.course_name || meta.course_name_vi;
                    if (!credits) credits = meta.credits;
                }
            }

            if (c || credits > 0) {
                const credNum = parseInt(credits) || 0;
                totalCred += credNum;

                let billingCredits = 0;

                // Tìm thông tin chi tiết môn học để lấy số tiết
                if (AUX_DATA.allCourses) {
                    const meta = AUX_DATA.allCourses.find(c => c.course_id === cid);
                    
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

                // --- TÍNH TIỀN CHO MÔN NÀY ---
                const courseFee = calculateTuition(cid, credNum);
                totalMoney += courseFee;
                tuition_log = `Môn ${cid}: ${credits} tín chỉ - ${billingCredits} tín chỉ HP - Đơn giá: ${courseFee/billingCredits}đ/TC \n \tTổng: ${courseFee.toLocaleString('vi-VN')} đ\n`;
                // -----------------------------

                // Format tiền để hiển thị trong từng dòng (Optional)
                const feeText = courseFee.toLocaleString('vi-VN');

                list.innerHTML += `
                    <div class="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-100 text-xs animate-fadeIn hover:bg-white transition-colors">
                        <div class="flex flex-col min-w-0 flex-1 mr-2">
                            <div class="flex items-center gap-2">
                                <span class="font-bold text-[#004A98] whitespace-nowrap">${cid}</span>
                                <span class="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px]">${credNum} TC</span>
                            </div>
                            <span class="truncate text-gray-600 mt-0.5" title="${name}">${name}</span>
                            <span class="text-[10px] text-gray-400 mt-0.5">${feeText} đ</span> </div>
                        <button onclick="document.getElementById('chk-${cid}').click()" class="w-6 h-6 ...">✕</button>
                    </div>`;
            }
        });
    }

    console.log(tuition_log);

    // Cập nhật UI Tổng
    if(countEl) countEl.innerText = SELECTED_COURSES.size;
    if(credEl) credEl.innerText = totalCred;
    if(moneyEl) moneyEl.innerText = totalMoney.toLocaleString('vi-VN');

    // 3. XỬ LÝ THANH TIẾN ĐỘ & CẢNH BÁO QUÁ TẢI
    if(prog) {
        // Tính phần trăm (Max là 24 hoặc totalCred nếu vượt quá)
        const displayMax = Math.max(MAX_CREDITS, totalCred);
        const percent = Math.min((totalCred / MAX_CREDITS) * 100, 100);
        prog.style.width = percent + '%';

        // Tự động tạo thẻ cảnh báo nếu chưa có (DOM Injection)
        // Tìm thẻ cha của thanh progress để chèn thông báo vào sau đó
        const progContainer = prog.parentElement;
        let warningEl = document.getElementById('credit-warning-msg');
        
        if (!warningEl && progContainer) {
            warningEl = document.createElement('div');
            warningEl.id = 'credit-warning-msg';
            warningEl.className = 'hidden flex items-start gap-2 mt-2 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-600 animate-fadeIn';
            // Chèn ngay sau thanh tiến độ
            progContainer.parentNode.insertBefore(warningEl, progContainer.nextSibling);
        }

        // Logic hiển thị cảnh báo
        if (totalCred > MAX_CREDITS) {
            // Vượt quá -> Màu đỏ
            prog.classList.remove('bg-[#004A98]');
            prog.classList.add('bg-red-500');
            
            // Hiện cảnh báo
            if (warningEl) {
                warningEl.classList.remove('hidden');
                warningEl.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                    <span>Vượt quá giới hạn <b>${MAX_CREDITS}</b> tín chỉ! Cân nhắc bỏ bớt môn.</span>
                `;
            }
        } else {
            // Bình thường -> Màu xanh
            prog.classList.add('bg-[#004A98]');
            prog.classList.remove('bg-red-500');
            
            // Ẩn cảnh báo
            if (warningEl) warningEl.classList.add('hidden');
        }
    }
}

export function updateHeaderInfo() {
    const raw = localStorage.getItem('student_db_full');
    if (raw) {
        try {
            const data = JSON.parse(raw);
            if (data.info) {
                document.getElementById('header-user-name').innerText = data.info.name || "Sinh viên";
                document.getElementById('header-user-mssv').innerText = `MSSV: ${data.info.id || "..."}`;
                document.getElementById('header-avatar-text').innerText = (data.info.name || "S").charAt(0);
            }
        } catch(e) {}
    }
}

// Hàm Switch Tab Select/Schedule
window.switchViewMode = (mode) => {
    const listArea = document.getElementById('course-list-container');
    const resArea = document.getElementById('schedule-results-area');
    const btnSel = document.getElementById('tab-select');
    const btnSch = document.getElementById('tab-schedule');

    if (mode === 'select') {
        listArea.classList.remove('hidden');
        resArea.classList.add('hidden');
        btnSel.classList.add('border-[#004A98]', 'text-[#004A98]');
        btnSel.classList.remove('border-transparent', 'text-gray-600');
        btnSch.classList.remove('border-[#004A98]', 'text-[#004A98]');
        btnSch.classList.add('border-transparent', 'text-gray-600');
    } else {
        listArea.classList.add('hidden');
        resArea.classList.remove('hidden');
        btnSch.classList.add('border-[#004A98]', 'text-[#004A98]');
        btnSch.classList.remove('border-transparent', 'text-gray-600');
        btnSel.classList.remove('border-[#004A98]', 'text-[#004A98]');
        btnSel.classList.add('border-transparent', 'text-gray-600');
    }
}


// --- HÀM CẬP NHẬT HEADER (GỌI KHI LOAD TRANG) ---
export function updateHeaderUI() {
    // 1. Lấy dữ liệu sinh viên từ LocalStorage
    const rawStudent = localStorage.getItem('student_db_full');
    let studentInfo = { name: "Sinh viên", id: "Chưa đăng nhập" };

    if (rawStudent) {
        try {
            const parsed = JSON.parse(rawStudent);
            // Kiểm tra cấu trúc dữ liệu (tùy thuộc vào cách Portal trả về)
            if (parsed.info) {
                studentInfo.name = parsed.info.name || studentInfo.name;
                studentInfo.id = parsed.info.id || studentInfo.id;
            } else if (parsed.displayName) { // Fallback trường hợp khác
                studentInfo.name = parsed.displayName;
                studentInfo.id = parsed.studentId;
            }
        } catch (e) {
            logError("Lỗi đọc dữ liệu sinh viên:", e);
        }
    }

    // 2. Điền thông tin vào HTML (Hook vào các ID)
    const elName = document.getElementById('header-user-name');
    const elMssv = document.getElementById('header-user-mssv');
    const elAvatar = document.getElementById('header-avatar-text');

    if (elName) elName.innerText = studentInfo.name;
    if (elMssv) elMssv.innerText = `MSSV: ${studentInfo.id}`;
    
    // Xử lý Avatar: Lấy chữ cái đầu của tên (Ví dụ: "Thanh Nghĩa" -> "T")
    if (elAvatar) {
        // Lấy từ cuối cùng trong tên (Tên gọi)
        const nameParts = studentInfo.name.trim().split(' ');
        const lastName = nameParts[nameParts.length - 1];
        elAvatar.innerText = lastName.charAt(0).toUpperCase();
    }

    // 3. Tính toán và điền Học kỳ hiện tại
    updateSemesterInfo();

    // 4. Cập nhật số lượng thông báo (Demo logic)
    updateNotificationCount();
}

// --- HÀM TÍNH HỌC KỲ TỰ ĐỘNG ---
export function updateSemesterInfo() {
    const elSemester = document.getElementById('header-semester');
    if (!elSemester) return;

    const today = new Date();
    const month = today.getMonth() + 1; // 1 - 12
    const year = today.getFullYear();

    let semesterText = "";
    
    // Logic tính học kỳ tương đối (có thể chỉnh sửa theo lịch trường)
    // Tháng 1 - 5: HK2 (của năm trước đó - năm nay)
    // Tháng 6 - 8: HK Hè
    // Tháng 9 - 12: HK1 (của năm nay - năm sau)
    
    if (month >= 9 && month <= 12) {
        semesterText = `Học kỳ 1, ${year}-${year + 1}`;
    } else if (month >= 1 && month <= 5) {
        semesterText = `Học kỳ 2, ${year - 1}-${year}`;
    } else {
        semesterText = `Học kỳ Hè, ${year - 1}-${year}`;
    }

    elSemester.innerText = semesterText;
}

// --- HÀM XỬ LÝ THÔNG BÁO ---
export function updateNotificationCount() {
    const elCount = document.getElementById('header-notif-count');
    if (!elCount) return;

    // TODO: Sau này có API thông báo thì thay số 0 bằng length của mảng data
    const notifCount = 0; 

    elCount.innerText = notifCount;
    
    // Nếu = 0 thì ẩn đi cho đẹp, > 0 thì hiện đỏ
    if (notifCount === 0) {
        elCount.style.display = 'none';
    } else {
        elCount.style.display = 'flex';
    }
}

// --- ĐẢM BẢO HÀM LOGOUT HOẠT ĐỘNG (Gắn vào Window) ---
// Hàm này nên nằm trong Utils.js, nhưng nếu chưa có thì thêm vào đây:
if (!window.clearAppCache) {
    window.clearAppCache = function() {
        if (confirm("Bạn có chắc muốn đăng xuất và xóa dữ liệu đã lưu?")) {
            localStorage.removeItem('student_db_full');
            localStorage.removeItem('course_db_offline');
            // Reload trang để về trạng thái trắng
            window.location.reload();
        }
    };
}




// --- BỘ CÔNG CỤ ĐIỀN DỮ LIỆU (HELPER) ---

/**
 * 1. Hàm điền Văn bản (Text)
 * Dùng cho: Tên, MSSV, Khoa, Lớp
 * @param {string} elementId - ID của thẻ HTML (ví dụ: 'user-name')
 * @param {string} value - Giá trị muốn điền (ví dụ: 'Nguyễn Văn A')
 */
export function setText(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) {
        // Nếu value rỗng hoặc null thì điền "..." nhìn cho đẹp
        el.innerText = value || "..."; 
    } else {
        logWarning('Không tìm thấy thẻ có ID: "${elementId}" để điền text.');
    }   
}

/**
 * 2. Hàm điền Ảnh (Image Source)
 * Dùng cho: Avatar, Banner
 * @param {string} elementId - ID của thẻ <img>
 * @param {string} url - Link ảnh
 */
export function setImage(elementId, url) {
    const el = document.getElementById(elementId);
    if (el && el.tagName === 'IMG') {
        // Nếu không có url, dùng ảnh mặc định (bạn tự thay link nhé)
        el.src = url || './assets/default-avatar.png';
    }
}

/**
 * 3. Hàm điền HTML (Inner HTML)
 * Dùng cho: Những chỗ cần in đậm, xuống dòng
 */
export function setHTML(elementId, htmlString) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerHTML = htmlString || "";
    }
}


// --- HÀM TỰ ĐỘNG ĐIỀN THÔNG TIN SINH VIÊN ---

export function fillStudentProfile() {
    logStatus("Đang điền thông tin sinh viên...");

    // 1. Mò vào kho lấy dữ liệu
    const rawData = localStorage.getItem('student_db_full');
    
    if (!rawData) {
        logWarning("Chưa có dữ liệu sinh viên trong LocalStorage!");
        setText('header-user-name', 'Chưa đăng nhập');
        setText('header-user-mssv', '---');
        return;
    }

    try {
        const data = JSON.parse(rawData);
        
        // 2. Phân tích cấu trúc dữ liệu (Vì Portal trả về hơi lằng nhằng)
        // Ta ưu tiên tìm trong data.info trước, nếu không có thì tìm ở ngoài
        const info = data.info || data; 

        const name = info.display_name || info.name || "Sinh viên";
        const mssv = info.student_id || info.id || "Chưa có MSSV";
        const image = info.image || null; // Ảnh (nếu có)

        // 3. GỌI CÁC HÀM HELPER ĐỂ ĐIỀN (Thay ID dưới đây bằng ID thật trong HTML của bạn)
        
        // -> Điền Tên
        setText('header-user-name', name); 
        setText('profile-name', name); // Nếu có trang profile riêng

        // -> Điền MSSV
        setText('header-user-mssv', mssv);
        setText('profile-mssv', mssv);

        // -> Điền Avatar (Lấy chữ cái đầu nếu không có ảnh)
        const avatarEl = document.getElementById('header-avatar-text');
        if (avatarEl) {
            // Lấy tên cuối cùng (Ví dụ: "Hà Đăng Khôi" -> lấy chữ "K")
            const words = name.trim().split(' ');
            const lastWord = words[words.length - 1];
            avatarEl.innerText = lastWord.charAt(0).toUpperCase();
        }

    } catch (e) {
        logError("Lỗi khi đọc dữ liệu sinh viên:", e);
    }
}

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

function getColorForSubject(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
    const colors = [
        "bg-blue-50 border-blue-500 text-blue-900", "bg-emerald-50 border-emerald-500 text-emerald-900",
        "bg-violet-50 border-violet-500 text-violet-900", "bg-amber-50 border-amber-500 text-amber-900",
        "bg-rose-50 border-rose-500 text-rose-900", "bg-cyan-50 border-cyan-500 text-cyan-900",
        "bg-indigo-50 border-indigo-500 text-indigo-900", "bg-fuchsia-50 border-fuchsia-500 text-fuchsia-900",
        "bg-lime-50 border-lime-500 text-lime-900", "bg-orange-50 border-orange-500 text-orange-900",
        "bg-pink-50 border-pink-500 text-pink-900", "bg-sky-50 border-sky-500 text-sky-900",
        "bg-yellow-50 border-yellow-500 text-yellow-900", "bg-gray-50 border-gray-500 text-gray-900",
        "bg-red-50 border-red-500 text-red-900", "bg-green-50 border-green-500 text-green-900",
        "bg-purple-50 border-purple-500 text-purple-900", "bg-teal-50 border-teal-500 text-teal-900",
        "bg-zinc-50 border-zinc-500 text-zinc-900", "bg-slate-50 border-slate-500 text-slate-900",
        "bg-neutral-50 border-neutral-500 text-neutral-900", "bg-stone-50 border-stone-500 text-stone-900"
    ];
    return colors[Math.abs(hash) % colors.length];
}

// 1. Lưu giỏ hàng hiện tại vào LocalStorage
function saveBasket() {
    // Set không lưu trực tiếp được, phải chuyển sang Array
    const basketArray = Array.from(SELECTED_COURSES);
    localStorage.setItem('selected_courses_basket', JSON.stringify(basketArray));
}

// 2. Nạp giỏ hàng từ LocalStorage (Gọi khi bắt đầu render)
function loadBasket() {
    const raw = localStorage.getItem('selected_courses_basket');
    if (raw) {
        try {
            const basketArray = JSON.parse(raw);
            // Chuyển Array ngược lại thành Set
            SELECTED_COURSES = new Set(basketArray);
            logSuccess(`Đã khôi phục ${SELECTED_COURSES.size} môn từ giỏ hàng cũ.`);
        } catch (e) {
            logWarning("Lỗi đọc giỏ hàng cũ:", e);
            SELECTED_COURSES = new Set();
        }
    }
}
