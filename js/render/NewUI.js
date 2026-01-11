import { AUX_DATA } from '../Utils.js'

// --- CẤU HÌNH MENU ---
const SIDEBAR_CONFIG = [
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
}

// --- HÀM 2: VẼ CARD MÔN HỌC (1 DÒNG) ---
function renderCourseCard(course) {
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
function formatCategoryName(key) {
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
}

// --- 4. SMART FILTER (LỌC CẢ NHÓM NẾU RỖNG) ---
window.filterCourses = () => {
    const key = document.getElementById('inp-search').value.toLowerCase().trim();
    
    // BƯỚC 1: Lọc từng dòng môn học (Ẩn/Hiện môn)
    const rows = document.querySelectorAll('.course-row');
    rows.forEach(row => {
        // Lấy mã môn và tên môn từ HTML và data-attribute
        const codeText = row.querySelector('.text-gray-900.font-semibold') 
            ? row.querySelector('.text-gray-900.font-semibold').innerText.toLowerCase() 
            : "";
        const nameText = (row.dataset.name || "").toLowerCase();
        
        const fullText = codeText + " " + nameText;

        if (fullText.includes(key)) {
            row.classList.remove('hidden'); 
            // Xóa inline style để nó nhận lại display flex/block từ CSS gốc
            row.style.removeProperty('display'); 
        } else {
            row.classList.add('hidden');
            // Thêm display none cứng để đảm bảo ẩn tuyệt đối
            row.style.display = 'none'; 
        }
    });

    // BƯỚC 2: Xử lý các Nhóm (Ẩn nhóm cha nếu không còn con nào hiện)
    const groups = document.querySelectorAll('.filterable-group');
    
    // Mẹo: Duyệt ngược mảng (từ dưới lên) không quá quan trọng ở đây 
    // vì ta dùng querySelector kiểm tra sâu (deep check).
    
    groups.forEach(group => {
        // Câu lệnh "Thần thánh": Tìm xem bên trong nhóm này (kể cả con, cháu, chắt...)
        // có thằng .course-row nào KHÔNG CÓ class 'hidden' hay không?
        const hasVisibleCourse = group.querySelector('.course-row:not(.hidden)');

        if (hasVisibleCourse) {
            // Nếu còn ít nhất 1 môn -> Hiện nhóm
            group.classList.remove('hidden');
            group.style.removeProperty('display');
        } else {
            // Nếu không còn môn nào -> Ẩn nhóm
            group.classList.add('hidden');
            group.style.display = 'none';
        }
    });
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
function showModalOverlay(innerHTML) {
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


function updateBasketUI() {
    const list = document.getElementById('basket-list');
    const countEl = document.getElementById('basket-count');
    const credEl = document.getElementById('total-credits');
    const moneyEl = document.getElementById('total-tuition');
    const prog = document.getElementById('credit-progress');

    if (!list) return;
    list.innerHTML = '';
    
    let totalCred = 0;
    
    if (SELECTED_COURSES.size === 0) {
        list.innerHTML = `<div class="text-center py-12"><p class="text-gray-400 text-sm">Chưa có môn nào</p></div>`;
    } else {
        SELECTED_COURSES.forEach(cid => {
            const c = GLOBAL_COURSES_REF.find(x => x.id === cid);
            if (c) {
                totalCred += parseInt(c.credits);
                list.innerHTML += `
                    <div class="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-100 text-xs">
                        <span class="font-bold text-[#004A98]">${cid}</span>
                        <span class="truncate px-2 flex-1">${c.name}</span>
                        <button onclick="document.getElementById('chk-${cid}').click()" class="text-red-500 hover:text-red-700 font-bold">✕</button>
                    </div>`;
            }
        });
    }

    countEl.innerText = SELECTED_COURSES.size;
    credEl.innerText = totalCred;
    moneyEl.innerText = (totalCred * 350000).toLocaleString('vi-VN');
    prog.style.width = Math.min((totalCred/24)*100, 100) + '%';
}

function updateHeaderInfo() {
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

// Hàm Filter Search
window.filterCourses = () => {
    const key = document.getElementById('inp-search').value.toLowerCase();
    document.querySelectorAll('.course-row').forEach(row => {
        const text = row.innerText.toLowerCase() + " " + row.dataset.name;
        row.style.display = text.includes(key) ? 'block' : 'none';
    });
}












/// Render dữ liệu


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
            console.error("Lỗi đọc dữ liệu sinh viên:", e);
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
function updateSemesterInfo() {
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
function updateNotificationCount() {
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