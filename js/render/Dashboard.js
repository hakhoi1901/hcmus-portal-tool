// ================= DASHBOARD.JS =================
// render giao diện dashboard
// ================================================

// render UI trang dashboard
export function renderDashboardUI(data) {
    const resultWrapper = document.getElementById('result-wrapper'); 
    if (resultWrapper) resultWrapper.style.display = 'block';

    renderInfo(data);       // Thông tin chung
    renderTuition(data);    // Học phí
    renderExams(data);      // Lịch thi
    renderGrades(data);     // Điểm
}

// render thông tin
function renderInfo(data) {
    document.getElementById('lbl-mssv').innerText = data.mssv || 'Unknown';
    document.getElementById('lbl-count').innerText = (data.grades || []).length;
}

// render bảng học phí
export function renderTuition(data) {
    
    // Gán tuitionData lấy từ data
    // Nếu data.tuition bị null/undefined, gán mặc định là object rỗng có cấu trúc chuẩn.
    const tuitionData = data.tuition || { total: "0", details: [] };

    // Gán totalMoney lấy từ data
    // - Trường hợp 1: Data mới (Object) thì lấy .total
    // - Trường hợp 2: Data cũ hoặc lỗi thì lấy dữ liệu cũ là chính nó.
    const totalMoney = (typeof tuitionData === 'object') ? tuitionData.total : tuitionData;

    // Gán detailsMoney lấy từ data
    // - Trường hợp 1: Data mới (Object) thì lấy .details
    // - Trường hợp 2: Data cũ hoặc lỗi thì lấy dữ liệu cũ là chính nó.
    const detailsMoney = (typeof tuitionData === 'object' && tuitionData.details) ? tuitionData.details : [];

    // DOM Query: Lấy phần tử hiển thị tổng tiền.
    const lblTotal = document.getElementById('lbl-tuition-total');
    // Kiểm tra sự tồn tại của DOM nếu không thì bỏ qua tránh lỗi
    if (lblTotal) {
        // Cập nhật text dùng innerText để kích hoạt browser repaint vẽ lại text.
        lblTotal.innerText = totalMoney;
    }

    const tbodyTuition = document.querySelector('#tbl-tuition tbody');
    if (tbodyTuition) {
        tbodyTuition.innerHTML = '';
        if (detailsMoney.length > 0) {
            detailsMoney.forEach(t => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <div style="font-weight:bold; font-size:11px; color:#666">${t.code}</div>
                        ${t.name}
                    </td>
                    <td style="text-align:center">${t.credits}</td>
                    <td style="text-align:right; font-weight:bold; color:#ef4444">${t.fee}</td>
                `;
                tbodyTuition.appendChild(tr);
            });
        } else {
            tbodyTuition.innerHTML = '<tr><td colspan="3" style="text-align:center; color:grey">Không có dữ liệu chi tiết</td></tr>';
        }
    }
}

// render lịch thi
export function renderExams(data) {
    const tbodyExams = document.querySelector('#tbl-exams tbody');
    if (!tbodyExams) return;

    tbodyExams.innerHTML = '';
    if (data.exams && data.exams.length > 0) {
        data.exams.forEach(e => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="white-space:nowrap">${e.sub}</td>
                <td>${e.date}</td>
                <td>${e.time}</td>
                <td style="color:#005a8d;font-weight:bold">${e.room}</td>
            `;
            tbodyExams.appendChild(tr);
        });
    } else {
        tbodyExams.innerHTML = '<tr><td colspan="4" style="text-align:center;color:grey">Không có lịch thi sắp tới</td></tr>';
    }
}

// render chương trình đào tạo
export function renderGrades(data) {
    const tbodyGrades = document.querySelector('#tbl-grades tbody');
    if (!tbodyGrades) return;

    tbodyGrades.innerHTML = '';
    if (data.grades && data.grades.length > 0) {
        data.grades.forEach(g => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><b>${g.id}</b></td><td>${g.score}</td>`;
            tbodyGrades.appendChild(tr);
        });
    } else {
        tbodyGrades.innerHTML = '<tr><td colspan="2" style="text-align:center">Chưa có dữ liệu</td></tr>';
    }
}


let _courseData = [];

// Render danh sách nguồn (Cột trái)
export function renderCourseList(courses) {
    _courseData = courses;
    const container = document.getElementById('course-list-area');
    container.innerHTML = '';

    if (!courses || courses.length === 0) {
        container.innerHTML = '<div style="padding:10px">Không có dữ liệu.</div>';
        return;
    }

    let html = '';
    courses.forEach(subj => {
        // Lưu ý: onclick gọi window.toggleCourse
        html += `
            <div class="course-item" onclick="window.toggleCourse('${subj.id}')">
                <input type="checkbox" id="chk-${subj.id}" value="${subj.id}">
                <div style="display:flex; flex-direction:column;">
                    <span style="font-weight:bold; font-size:12px; color:#666">${subj.id}</span>
                    <span style="font-size:13px;">${subj.name}</span>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// Logic Toggle (Click cột trái)
export function toggleCourse(subjID) {
    const checkbox = document.getElementById(`chk-${subjID}`);
    checkbox.checked = !checkbox.checked; // Đảo trạng thái
    syncToSelectedList(subjID, checkbox.checked);
}

// Logic Xóa (Click nút X cột phải)
export function removeCourse(subjID) {
    // Bỏ check cột trái
    const checkbox = document.getElementById(`chk-${subjID}`);
    if (checkbox) checkbox.checked = false;
    
    // Xóa cột phải
    syncToSelectedList(subjID, false);
}

// Logic Đồng bộ (Internal Function - Không cần export)
function syncToSelectedList(subjID, isAdded) {
    const container = document.getElementById('selected-list-area');
    const emptyState = container.querySelector('.empty-state');
    const subj = _courseData.find(s => s.id === subjID);
    if (!subj) return;

    if (isAdded) {
        if (emptyState) emptyState.remove();
        
        let options = `<option value="">-- Để AI Tự Xếp --</option>`;
        subj.classes.forEach(c => {
            options += `<option value="${c.id}">${c.id}</option>`;
        });

        // Tạo item bên phải
        const itemDiv = document.createElement('div');
        itemDiv.className = 'selected-item';
        itemDiv.id = `sel-item-${subjID}`;
        itemDiv.innerHTML = `
            <div class="selected-header">
                <div>
                    <div style="font-weight:bold; font-size:12px; color:#005a8d">${subj.id}</div>
                    <div style="font-size:13px; font-weight:600">${subj.name}</div>
                </div>
                <button class="btn-remove" onclick="window.removeCourse('${subj.id}')" title="Bỏ chọn">✖</button>
            </div>
            <select class="class-dropdown">
                ${options}
            </select>
        `;
        container.appendChild(itemDiv);
    } else {
        const item = document.getElementById(`sel-item-${subjID}`);
        if (item) item.remove();
        if (container.children.length === 0) {
            container.innerHTML = '<div class="empty-state">Chưa chọn môn nào</div>';
        }
    }
    
    // Update count
    document.getElementById('count-selected').innerText = document.querySelectorAll('.selected-item').length;
}

// Logic Search
export function filterCourses() {
    const keyword = document.getElementById('inp-search').value.toLowerCase();
    const rows = document.querySelectorAll('.course-item');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(keyword) ? 'flex' : 'none';
    });
}