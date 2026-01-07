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
    renderProgram(data);
}

export function renderProgram(data) {
    // Tìm hoặc tạo bảng Program (Nếu bạn chưa thêm ID tbl-program vào HTML thì cần thêm nhé)
    // Ở đây mình giả sử bạn sẽ thêm 1 section mới vào HTML, hoặc mình render tạm vào 1 div nào đó
    
    // Tuy nhiên, tốt nhất là tạo DOM động nếu HTML chưa có
    let section = document.getElementById('section-program');
    if (!section) {
        const wrapper = document.getElementById('result-wrapper');
        if (!wrapper) return;
        
        section = document.createElement('div');
        section.id = 'section-program';
        section.className = 'section-box';
        section.innerHTML = `
            <h4 class="section-title">🎓 Chương trình đào tạo & Tiến độ</h4>
            <div class="info-row">
                <span>Số môn trong CTĐT: <b id="lbl-prog-total">0</b></span>
                <span>Đã hoàn thành: <b id="lbl-prog-done" style="color:green">0</b></span>
            </div>
            <div class="table-scroll" style="max-height: 300px;">
                <table id="tbl-program">
                    <thead>
                        <tr>
                            <th>Mã Môn</th>
                            <th>Tên Môn</th>
                            <th>TC</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        `;
        wrapper.appendChild(section);
    }

    const tbody = section.querySelector('tbody');
    tbody.innerHTML = '';

    const program = data.program || [];
    const grades = data.grades || [];
    
    // Tạo Set các môn đã qua môn (Điểm >= 5) để tra cứu cho nhanh
    const passedSubjects = new Set();
    grades.forEach(g => {
        // Chỉ tính là qua môn nếu điểm là số và >= 5
        if (typeof g.score === 'number' && g.score >= 5.0) {
            passedSubjects.add(g.id);
        }
    });

    let doneCount = 0;

    program.forEach(p => {
        const isDone = passedSubjects.has(p.id);
        if (isDone) doneCount++;

        const tr = document.createElement('tr');
        tr.style.background = isDone ? '#f0fdf4' : 'white'; // Xanh nhạt nếu đã học
        
        tr.innerHTML = `
            <td style="font-weight:bold; color:${isDone ? '#15803d' : '#666'}">${p.id}</td>
            <td>${p.name}</td>
            <td style="text-align:center">${p.credits}</td>
            <td style="text-align:center">
                ${isDone ? '<span style="color:#15803d; font-weight:bold">✔ Đã xong</span>' : '<span style="color:#ca8a04; font-size:12px">Chưa học</span>'}
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('lbl-prog-total').innerText = program.length;
    document.getElementById('lbl-prog-done').innerText = doneCount;
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
    
    // Sắp xếp: Môn mới nhất (theo HK) lên đầu, hoặc giữ nguyên thứ tự portal
    // Ở đây mình giữ nguyên thứ tự cào được để giống Portal nhất
    const gradeList = data.grades || [];

    if (gradeList.length > 0) {
        gradeList.forEach(g => {
            const tr = document.createElement('tr');
            
            // Tô màu điểm cao/thấp/chưa có điểm
            let scoreColor = '#374151'; // Mặc định đen
            let scoreText = g.score;

            if (g.score === '(*)' || g.score === null) {
                scoreText = '(*)';
                scoreColor = '#6b7280'; // Xám
            } else if (typeof g.score === 'number') {
                if (g.score >= 8.0) scoreColor = '#059669'; // Xanh lá (Giỏi)
                else if (g.score < 5.0) scoreColor = '#dc2626'; // Đỏ (Rớt)
            }

            tr.innerHTML = `
                <td style="text-align:center; font-size:12px; color:#666;">${g.semester}</td>
                <td style="font-weight:bold; color:#005a8d;">${g.id}</td>
                <td>${g.name}</td>
                <td style="text-align:center;">${g.credits}</td>
                <td style="text-align:center; font-size:12px;">${g.class}</td>
                <td style="text-align:center; font-weight:bold; color:${scoreColor};">${scoreText}</td>
            `;
            tbodyGrades.appendChild(tr);
        });
    } else {
        tbodyGrades.innerHTML = '<tr><td colspan="6" style="text-align:center; color:grey; padding: 20px;">Chưa có dữ liệu điểm</td></tr>';
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