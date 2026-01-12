(async function() {
    console.clear();
    
    // === 1. CẤU HÌNH ===
    const CONFIG = {
        URL_DIEM: "/SinhVien.aspx?pid=211",
        URL_LICHTHI: "/SinhVien.aspx?pid=180",
        URL_HOCPHI: "/SinhVien.aspx?pid=331",
        URL_LOPMO: "/SinhVien.aspx?pid=327",
        TARGET_YEAR: "25-26", // Năm học mong muốn
        TARGET_SEM: "1"       // Học kỳ mong muốn
    };
    
    const URLS = {
        DIEM: "/SinhVien.aspx?pid=211",
        LICHTHI: "/SinhVien.aspx?pid=180",
        HOCPHI: "/SinhVien.aspx?pid=331",
        LOPMO: "/SinhVien.aspx?pid=327"
    };

    // UI: Hiển thị trạng thái loading lên màn hình hiện tại
    const showLoading = (msg) => {
        let el = document.getElementById('hcmus-tool-loading');
        if (!el) {
            el = document.createElement('div');
            el.id = 'hcmus-tool-loading';
            el.style.cssText = "position:fixed;top:10px;right:10px;background:rgba(0,43,90,0.9);color:#fff;padding:15px 20px;z-index:999999;border-radius:8px;font-family:sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.3);font-size:14px;";
            document.body.appendChild(el);
        }
        el.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><div style="width:16px;height:16px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite"></div><div>${msg}</div></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
    };

    const hideLoading = () => {
        const el = document.getElementById('hcmus-tool-loading');
        if (el) el.remove();
    };

    // Helper: Chuyển text HTML thành DOM ảo để query
    const parseHTML = (html) => new DOMParser().parseFromString(html, 'text/html');

    function showPrivacyAndConfigModal() {
        return new Promise((resolve, reject) => {
            // Xóa modal cũ nếu có
            document.getElementById('hcmus-tool-modal')?.remove();

            const modal = document.createElement('div');
            modal.id = 'hcmus-tool-modal';
            modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:999999;display:flex;justify-content:center;align-items:center;font-family:'Segoe UI', sans-serif;";
            
            modal.innerHTML = `
                <div style="background:#fff;width:500px;max-width:95%;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.2);overflow:hidden;animation:slideDown 0.3s ease-out;">
                    <div style="background:#004A98;padding:15px 20px;color:white;">
                        <h3 style="margin:0;font-size:18px;font-weight:600;">Cấu hình lấy dữ liệu</h3>
                    </div>
                    
                    <div style="padding:20px;max-height:80vh;overflow-y:auto;">
                        <div style="background:#f0f9ff;border-left:4px solid #004A98;padding:12px;margin-bottom:20px;font-size:13px;color:#333;line-height:1.5;">
                            <strong>🛡️ Cam kết bảo mật:</strong><br>
                            Toàn bộ dữ liệu (Điểm, Lịch thi, MSSV) chỉ được xử lý trên trình duyệt và lưu vào <code>localStorage</code> của máy bạn. Chúng tôi cam kết <strong>KHÔNG</strong> thu thập hay gửi dữ liệu đi bất cứ đâu.
                        </div>

                        <div style="display:flex;flex-direction:column;gap:15px;">
                            
                            <div style="display:flex;gap:20px;">
                                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:500;">
                                    <input type="checkbox" id="opt-info" checked disabled> Thông tin & Điểm
                                </label>
                                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                                    <input type="checkbox" id="opt-tuition" checked> Học phí
                                </label>
                            </div>

                            <hr style="border:0;border-top:1px solid #eee;margin:5px 0;">

                            <div>
                                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;margin-bottom:8px;">
                                    <input type="checkbox" id="opt-exam" checked onchange="toggleGroup('grp-exam', this.checked)"> 
                                    Lấy Lịch Thi
                                </label>
                                <div id="grp-exam" style="display:flex;gap:10px;padding-left:24px;">
                                    <input type="text" id="exam-year" value="25-26" placeholder="Năm (vd: 25-26)" style="width:100px;padding:6px;border:1px solid #ccc;border-radius:4px;">
                                    <select id="exam-sem" style="padding:6px;border:1px solid #ccc;border-radius:4px;">
                                        <option value="1">Học kỳ 1</option>
                                        <option value="2">Học kỳ 2</option>
                                        <option value="3">Học kỳ 3</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;margin-bottom:8px;">
                                    <input type="checkbox" id="opt-class" checked onchange="toggleGroup('grp-class', this.checked)"> 
                                    Lấy Danh Sách Lớp Mở
                                </label>
                                <div id="grp-class" style="display:flex;gap:10px;padding-left:24px;">
                                    <input type="text" id="class-year" value="25-26" placeholder="Năm (vd: 25-26)" style="width:100px;padding:6px;border:1px solid #ccc;border-radius:4px;">
                                    <select id="class-sem" style="padding:6px;border:1px solid #ccc;border-radius:4px;">
                                        <option value="1">Học kỳ 1</option>
                                        <option value="2">Học kỳ 2</option>
                                        <option value="3">Học kỳ 3</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style="background:#f9fafb;padding:15px 20px;display:flex;justify-content:flex-end;gap:10px;border-top:1px solid #eee;">
                        <button id="btn-cancel" style="padding:8px 16px;border:1px solid #ccc;background:white;border-radius:6px;cursor:pointer;font-weight:500;">Hủy</button>
                        <button id="btn-agree" style="padding:8px 16px;border:none;background:#004A98;color:white;border-radius:6px;cursor:pointer;font-weight:500;box-shadow:0 2px 5px rgba(0,74,152,0.3);">Đồng ý & Bắt đầu</button>
                    </div>
                </div>
                <style>@keyframes slideDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}</style>
            `;

            document.body.appendChild(modal);

            // Hàm ẩn hiện input
            window.toggleGroup = (id, show) => {
                const el = document.getElementById(id);
                if(el) {
                    el.style.opacity = show ? 1 : 0.5;
                    el.style.pointerEvents = show ? 'auto' : 'none';
                }
            };

            // Xử lý sự kiện nút bấm
            document.getElementById('btn-cancel').onclick = () => {
                modal.remove();
                reject("User cancelled");
            };

            document.getElementById('btn-agree').onclick = () => {
                // Thu thập cấu hình người dùng nhập
                const config = {
                    getTuition: document.getElementById('opt-tuition').checked,
                    getExam: document.getElementById('opt-exam').checked,
                    examYear: document.getElementById('exam-year').value,
                    examSem: document.getElementById('exam-sem').value,
                    getClass: document.getElementById('opt-class').checked,
                    classYear: document.getElementById('class-year').value,
                    classSem: document.getElementById('class-sem').value,
                };
                modal.remove();
                resolve(config);
            };
        });
    }

    // === 2. CÁC HÀM CÀO DỮ LIỆU (Đã sửa để nhận tham số 'doc') ===

    // Cào Bảng Điểm (Target: Virtual Document)
    function scrapeGrades(doc) {
        try {
            let mssv = "Unknown";
            // Lấy MSSV từ document ảo hoặc document thật nếu không thấy
            const userEl = doc.getElementById('user_tools') || document.getElementById('user_tools');
            if (userEl) {
                const match = userEl.innerText.match(/Xin chào\s+([^|]+)/i);
                if (match) mssv = match[1].trim();
            }

            const grades = [];
            doc.querySelectorAll('#tbDiemThiGK tbody tr').forEach(row => {
                if (row.cells.length < 6) return;
                const semester = row.cells[0]?.innerText.trim();
                const rawSubj = row.cells[1]?.innerText.trim();
                let id = "", name = rawSubj;
                if (rawSubj.includes(" - ")) {
                    const parts = rawSubj.split(" - ");
                    id = parts[0].trim();
                    name = parts.slice(1).join(" - ").trim();
                }
                const credits = row.cells[2]?.innerText.trim();
                const classID = row.cells[3]?.innerText.trim();
                const rawScore = row.cells[5]?.innerText.trim();
                let score = !isNaN(parseFloat(rawScore)) ? parseFloat(rawScore) : rawScore;

                if (id) grades.push({ semester, id, name, credits, class: classID, score });
            });
            return { mssv, grades };
        } catch (e) { console.error("Grade Error", e); return { mssv: "Error", grades: [] }; }
    }

    // Cào Lịch thi / Học phí (Target: Virtual Document)
    function scrapeBackgroundData(doc, type) {
        try {
            if (type === 'EXAM') {
                // Khởi tạo object chứa 2 danh sách
                const result = {
                    midterm: [], // Giữa kỳ
                    final: []    // Cuối kỳ
                };

                // --- XỬ LÝ GIỮA KỲ (GK) ---
                const tableGK = doc.getElementById('tbLichThiGK');
                if (tableGK) {
                    tableGK.querySelectorAll('tbody tr').forEach(row => {
                        // Bỏ qua dòng header hoặc dòng trống
                        if (row.cells.length > 7) {
                            result.midterm.push({
                                id: row.cells[1]?.innerText.trim(),      // Mã MH
                                name: row.cells[2]?.innerText.trim(),    // Tên MH
                                group: row.cells[3]?.innerText.trim(),   // Lớp
                                date: row.cells[4]?.innerText.trim(),    // Ngày
                                time: row.cells[5]?.innerText.trim(),    // Giờ
                                room: row.cells[6]?.innerText.trim(),    // Phòng
                                place: row.cells[7]?.innerText.trim(),   // Địa điểm
                                type: 'GK'
                            });
                        }
                    });
                }

                // --- XỬ LÝ CUỐI KỲ (CK) ---
                const tableCK = doc.getElementById('tbLichThiCK');
                if (tableCK) {
                    tableCK.querySelectorAll('tbody tr').forEach(row => {
                        if (row.cells.length > 7) {
                            result.final.push({
                                id: row.cells[1]?.innerText.trim(),
                                name: row.cells[2]?.innerText.trim(),
                                group: row.cells[3]?.innerText.trim(),
                                date: row.cells[4]?.innerText.trim(),
                                time: row.cells[5]?.innerText.trim(),
                                room: row.cells[6]?.innerText.trim(),
                                place: row.cells[7]?.innerText.trim(),
                                type: 'CK'
                            });
                        }
                    });
                }

                return result;
            }

            if (type === 'TUITION') {
                const details = [];
                doc.querySelectorAll('.dkhp-table tbody tr').forEach(row => {
                    const c = row.querySelectorAll('td');
                    if (c.length > 9) {
                        let rawName = c[2].innerText.trim();
                        let codeMatch = rawName.match(/\[(.*?)\]/);
                        let code = codeMatch ? codeMatch[1] : "";
                        let name = rawName.replace(/\[.*?\]/g, '').trim();
                        if (rawName) details.push({ code, name, credits: c[3].innerText.trim(), fee: c[9].innerText.trim() });
                    }
                });
                const totalEl = doc.querySelector('th[title="Tổng số phải đóng"]');
                return { total: totalEl ? totalEl.innerText.trim() : "0", details };
            }

        } catch (e) { 
            console.error("Lỗi cào dữ liệu background: ", e);
            // Trả về cấu trúc an toàn để không bị crash code chính
            return type === 'EXAM' ? { midterm: [], final: [] } : { total: "0", details: [] }; 
        }
        return [];
    }

    // --- PHẦN XỬ LÝ LỚP MỞ (NÂNG CAO) ---

    function parseScheduleString(str) {
        if (!str) return [];
        const regex = /T(\d|CN)\((\d+(\.\d+)?)-(\d+(\.\d+)?)\)/g;
        const matches = str.match(regex);
        return matches ? matches : [];
    }

    async function fetchPracticalClasses(lmid) {
        try {
            // Lưu ý: Fetch này chạy trên ngữ cảnh trang hiện tại nên cookie vẫn ok
            const url = `Modules/SVDangKyHocPhan/HandlerSVDKHP.ashx?method=LopThucHanh&lmid=${lmid}&dot=1`;
            const res = await fetch(url);
            const json = await res.json();
            return json.LopMoTHs || [];
        } catch (e) { return []; }
    }

    // Hàm cào lớp mở (Nhận vào Doc ảo)
    async function scrapeOpenClassesAsync(doc) {
        const table = doc.getElementById('tbPDTKQ');
        if (!table) return [];
        
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        const courseMap = {}; 

        // Update loading UI
        const total = rows.length;
        
        // Chạy loop
        for (let i = 0; i < rows.length; i++) {
            // Update tiến độ mỗi 5 dòng để đỡ lag UI
            if (i % 5 === 0) showLoading(`Đang quét lớp thực hành: ${i}/${total}`);

            const row = rows[i];
            const cells = row.cells;
            if (cells.length < 9) continue;

            const subjID = cells[0].innerText.trim();
            const subjName = cells[1].innerText.trim();
            const ltClassID = cells[2].innerText.trim();
            const credits = parseInt(cells[3].innerText.trim()) || 0;
            const ltScheduleStr = cells[7] ? cells[7].innerText.trim() : "";
            const ltSchedule = parseScheduleString(ltScheduleStr);

            if (!subjID) continue;

            if (!courseMap[subjID]) {
                courseMap[subjID] = { id: subjID, name: subjName, credits: credits, classes: [] };
            }

            const thCell = cells[8];
            const thLink = thCell.querySelector('a');
            
            if (thLink) {
                const onclickText = thLink.getAttribute('onclick'); 
                const match = onclickText.match(/showFormDKThucHanh\("(\d+)"/);
                
                if (match && match[1]) {
                    const lmid = match[1];
                    const thClasses = await fetchPracticalClasses(lmid);

                    if (thClasses && thClasses.length > 0) {
                        thClasses.forEach(th => {
                            const thClassID = th.Nhom; 
                            const thSchedule = parseScheduleString(th.LichHoc);
                            courseMap[subjID].classes.push({
                                id: thClassID, 
                                schedule: [...ltSchedule, ...thSchedule]
                            });
                        });
                    } else {
                        courseMap[subjID].classes.push({ id: ltClassID, schedule: ltSchedule });
                    }
                } else {
                    courseMap[subjID].classes.push({ id: ltClassID, schedule: ltSchedule });
                }
            } else {
                const exists = courseMap[subjID].classes.find(c => c.id === ltClassID);
                if (!exists) {
                    courseMap[subjID].classes.push({ id: ltClassID, schedule: ltSchedule });
                } else {
                    if (ltSchedule.length > 0) {
                        exists.schedule = [...new Set([...exists.schedule, ...ltSchedule])];
                    }
                }
            }
        } 
        return Object.values(courseMap);
    }

    // --- LOGIC FETCH TRANG VÀ POSTBACK (CORE) ---

    // Hàm lấy trang web bất kỳ và trả về DOM ảo
    async function fetchVirtualPage(url) {
        const res = await fetch(url);
        const text = await res.text();
        return parseHTML(text);
    }

    // Hàm giả lập Submit Form để đổi học kỳ (Đã nâng cấp để dùng chung)
    async function postToGetSemester(url, originalDoc, elementIds, targetYear, targetSem) {
    // 1. Lấy ViewState (Giữ nguyên)
    const viewState = originalDoc.getElementById('__VIEWSTATE')?.value;
    const viewStateGen = originalDoc.getElementById('__VIEWSTATEGENERATOR')?.value;
    const eventValidation = originalDoc.getElementById('__EVENTVALIDATION')?.value;

    if (!viewState) throw new Error("Không lấy được ViewState. Session có thể đã hết hạn.");

    // 2. Tạo Form Data (Giữ nguyên)
    const formData = new URLSearchParams();
    formData.append('__EVENTTARGET', '');
    formData.append('__EVENTARGUMENT', '');
    formData.append('__VIEWSTATE', viewState);
    if(viewStateGen) formData.append('__VIEWSTATEGENERATOR', viewStateGen);
    if(eventValidation) formData.append('__EVENTVALIDATION', eventValidation);

    // 3. Append các tham số Dropdown (SỬA ĐOẠN NÀY)
    // Dùng biến targetYear/targetSem truyền vào, KHÔNG DÙNG CONFIG
    formData.append(elementIds.year, targetYear); 
    formData.append(elementIds.sem, targetSem);   
    formData.append(elementIds.btn, elementIds.btnValue || "Xem");

    // 4. Gửi Request (Giữ nguyên)
    const res = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    const text = await res.text();
    return parseHTML(text);
}

    // Hàm lấy trang điểm "Tất cả các kỳ"
    async function getFullGradesPage() {
        const url = CONFIG.URL_DIEM;
        let doc = await fetchVirtualPage(url);

        // Kiểm tra xem đã hiển thị tất cả chưa
        // Dấu hiệu: Dropdown Năm học có value = "" hoặc "0" hoặc Text="--Tất cả--"
        // (Tùy Portal, thường chọn Tất cả thì value gửi đi là 0 hoặc rỗng)
        
        // Cách chắc ăn nhất: Gửi luôn request POST chọn "Tất cả"
        // ID các control trên trang Xem Điểm (pid=211)
        const viewState = doc.getElementById('__VIEWSTATE')?.value;
        const viewStateGen = doc.getElementById('__VIEWSTATEGENERATOR')?.value;
        const eventValidation = doc.getElementById('__EVENTVALIDATION')?.value;
        
        if (!viewState) return doc; // Không post được thì dùng tạm trang hiện tại

        const formData = new URLSearchParams();
        formData.append('__EVENTTARGET', '');
        formData.append('__EVENTARGUMENT', '');
        formData.append('__VIEWSTATE', viewState);
        if(viewStateGen) formData.append('__VIEWSTATEGENERATOR', viewStateGen);
        if(eventValidation) formData.append('__EVENTVALIDATION', eventValidation);

        // Tham số quan trọng để lấy "Tất cả"
        // ID này lấy từ Portal HCMUS thực tế
        formData.append('ctl00$ContentPlaceHolder1$ctl00$cboNamHoc_gvDKHPLichThi$ob_CbocboNamHoc_gvDKHPLichThiTB', '--Tất cả--'); 
        formData.append('ctl00$ContentPlaceHolder1$ctl00$cboNamHoc_gvDKHPLichThi', '0'); // Value = 0 thường là All
        formData.append('ctl00$ContentPlaceHolder1$ctl00$cboHocKy_gvDKHPLichThi$ob_CbocboHocKy_gvDKHPLichThiTB', ''); // HK để trống
        formData.append('ctl00$ContentPlaceHolder1$ctl00$cboHocKy_gvDKHPLichThi', '0'); 
        formData.append('ctl00$ContentPlaceHolder1$ctl00$btnXemDiemThi', 'Xem Kết Quả Học Tập'); // Nút bấm

        const res = await fetch(url, {
            method: 'POST',
            body: formData,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const text = await res.text();
        return parseHTML(text);
    }

    // === 3. MAIN RUNNER ===
    try {
        // 1. Hiển thị Modal & Chờ người dùng cấu hình
        const config = await showPrivacyAndConfigModal();
        
        showLoading("Đang khởi tạo & Lấy dữ liệu cơ bản...");

        // Khởi tạo các biến chứa dữ liệu
        let gradeData = { mssv: "Unknown", grades: [] };
        let tuitionData = { total: "0", details: [] };
        let examData = { midterm: [], final: [] };
        let courses = [];

        // 2. Lấy dữ liệu cơ bản (Điểm - Bắt buộc)
        // Lưu ý: Hàm getFullGradesPage vẫn giữ nguyên logic "Tất cả"
        const docDiemFull = await getFullGradesPage(); 
        gradeData = scrapeGrades(docDiemFull);

        showLoading("Đang tải Bảng điểm đầy đủ...");
        // Lấy Học phí (Nếu tick chọn)
        if (config.getTuition) {
            showLoading("Đang tải Học phí...");
            const docHocPhi = await fetchVirtualPage(URLS.HOCPHI);
            tuitionData = scrapeBackgroundData(docHocPhi, 'TUITION');
        }

        // 3. Xử lý Lịch thi (Nếu tick chọn + Dùng Năm/Kỳ user nhập)
        if (config.getExam) {
            showLoading(`Đang lấy Lịch thi HK${config.examSem}/${config.examYear}...`);
            
            let docThi = await fetchVirtualPage(URLS.LICHTHI);
            
            const examPageIds = {
                year: "ctl00$ContentPlaceHolder1$ctl00$cboNamHoc_gvDKHPLichThi",
                sem: "ctl00$ContentPlaceHolder1$ctl00$cboHocKy_gvDKHPLichThi",
                btn: "ctl00$ContentPlaceHolder1$ctl00$btnXemLichThi",
                btnValue: "Xem Lịch Thi"
            };

            // Check xem trang hiện tại có đúng năm/kỳ user muốn không
            const curExamYear = docThi.getElementById("ctl00_ContentPlaceHolder1_ctl00_cboNamHoc_gvDKHPLichThi_ob_CbocboNamHoc_gvDKHPLichThiTB")?.value 
                             || docThi.querySelector("input[name$='cboNamHoc_gvDKHPLichThi$ob_CbocboNamHoc_gvDKHPLichThiTB']")?.value;
            const curExamSem = docThi.getElementById("ctl00_ContentPlaceHolder1_ctl00_cboHocKy_gvDKHPLichThi_ob_CbocboHocKy_gvDKHPLichThiTB")?.value
                            || docThi.querySelector("input[name$='cboHocKy_gvDKHPLichThi$ob_CbocboHocKy_gvDKHPLichThiTB']")?.value;

            // So sánh với config.examYear và config.examSem (từ Modal)
            if (curExamYear !== config.examYear || curExamSem !== config.examSem) {
                showLoading(`Đang chuyển Lịch thi sang HK${config.examSem}/${config.examYear}...`);
                // Truyền năm/kỳ vào hàm postToGetSemester
                docThi = await postToGetSemester(URLS.LICHTHI, docThi, examPageIds, config.examYear, config.examSem);
            }
            
            examData = scrapeBackgroundData(docThi, 'EXAM');
        }

        // 4. Xử lý Lớp Mở (Nếu tick chọn + Dùng Năm/Kỳ user nhập)
        if (config.getClass) {
            showLoading(`Đang truy cập Lớp mở HK${config.classSem}/${config.classYear}...`);
            
            let docLopMo = await fetchVirtualPage(URLS.LOPMO);
            
            const openClassPageIds = {
                year: "ctl00$ContentPlaceHolder1$ctl00$cboNamHoc",
                sem: "ctl00$ContentPlaceHolder1$ctl00$cboHocKy",
                btn: "ctl00$ContentPlaceHolder1$ctl00$btnXem",
                btnValue: "Xem"
            };

            const curClassYear = docLopMo.getElementById("ctl00_ContentPlaceHolder1_ctl00_cboNamHoc")?.value;
            const curClassSem = docLopMo.getElementById("ctl00_ContentPlaceHolder1_ctl00_cboHocKy")?.value;

            // So sánh với config.classYear và config.classSem
            if (curClassYear !== config.classYear || curClassSem !== config.classSem) {
                showLoading(`Đang chuyển Lớp mở sang HK${config.classSem}/${config.classYear}...`);
                // Truyền năm/kỳ vào hàm
                docLopMo = await postToGetSemester(URLS.LOPMO, docLopMo, openClassPageIds, config.classYear, config.classSem);
            }

            courses = await scrapeOpenClassesAsync(docLopMo);
        }

        hideLoading();

        // --- BƯỚC 4: KẾT QUẢ ---
        if (config.getClass && (!courses || courses.length === 0)) {
            alert("⚠️ Không lấy được danh sách lớp mở. Có thể do lỗi kết nối hoặc Portal bị đổi cấu trúc.");
            return;
        }

        // 1. Chuẩn bị gói tin Sinh viên (Giữ nguyên cấu trúc cũ của bạn)
        const studentPayload = {
            mssv: gradeData.mssv,
            grades: gradeData.grades,
            exams: examData,    // Object { midterm: [], final: [] }
            tuition: tuitionData,
            program: []
        };

        // 2. Đóng gói toàn bộ (Sinh viên + Lớp mở)
        const fullDataPacket = {
            student: {
                mssv: gradeData.mssv,
                grades: gradeData.grades,
                exams: examData,
                tuition: tuitionData,
                program: []
            },
            courses: courses
        };

        console.log("🔥 FULL DATA PACKET:", fullDataPacket);

        // 3. Gửi 1 lần duy nhất về Tool
        if (window.opener) {
            // Gửi sự kiện mới: IMPORT_FULL_DATA
            window.opener.postMessage({ type: 'IMPORT_FULL_DATA', payload: fullDataPacket }, '*');
            
            alert(`✅ HOÀN TẤT QUÁ TRÌNH!\n\nĐã gửi gói dữ liệu tổng hợp gồm:\n- Thông tin SV & Điểm thi\n- ${studentPayload.exams.midterm?.length + studentPayload.exams.final?.length} lịch thi\n- ${courses.length} lớp mở\n\nKiểm tra bên tab Tool nhé!`);
        } else {
            // Fallback: Tải file JSON nếu chạy độc lập
            const blob = new Blob([JSON.stringify(fullDataPacket, null, 2)], {type : 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `HCMUS_FullData_${gradeData.mssv}.json`;
            a.click();
            alert(`✅ Đã xong! File dữ liệu đang được tải xuống.`);
        }

    } catch (e) {
        hideLoading();
        if (e === "User cancelled") {
            console.log("Người dùng đã hủy.");
        } else {
            console.error(e);
            alert("❌ Lỗi: " + e.message);
        }
    }

})();