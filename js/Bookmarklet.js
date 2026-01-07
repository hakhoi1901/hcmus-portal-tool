(async function() {
    // 1. CẤU HÌNH & CONSTANTS
    const CONFIG = {
        URL_DIEM: "/SinhVien.aspx?pid=211",
        URL_LICHTHI: "/SinhVien.aspx?pid=212",
        URL_HOCPHI: "/SinhVien.aspx?pid=331",
        URL_LOPMO: "/SinhVien.aspx?pid=327",
        
        // Cấu hình cho trang Lớp Mở
        TARGET_YEAR: "25-26",
        TARGET_SEM: "1"
    };

    // ============================================================
    // PHẦN 1: LOGIC CÀO ĐIỂM & THÔNG TIN CÁ NHÂN (MODE STUDENT)
    // ============================================================

    function scrapeGrades() {
        try {
            // Lấy MSSV
            let mssv = "Unknown";
            const userEl = document.getElementById('user_tools');
            if (userEl) {
                const match = userEl.innerText.match(/Xin chào\s+([^|]+)/i);
                if (match) mssv = match[1].trim();
            }

            const grades = [];
            document.querySelectorAll('#tbDiemThiGK tbody tr').forEach(row => {
                if (row.cells.length < 6) return;
                const semester = row.cells[0]?.innerText.trim() || '';
                const rawSubj = row.cells[1]?.innerText.trim() || '';
                
                let id = "", name = rawSubj;
                if (rawSubj.includes(" - ")) {
                    const parts = rawSubj.split(" - ");
                    id = parts[0].trim();
                    name = parts.slice(1).join(" - ").trim();
                }

                const credits = row.cells[2]?.innerText.trim();
                const classID = row.cells[3]?.innerText.trim();
                const rawScore = row.cells[5]?.innerText.trim();
                
                let score = rawScore;
                if (!isNaN(parseFloat(rawScore))) score = parseFloat(rawScore);

                if (id) grades.push({ semester, id, name, credits, class: classID, score });
            });

            return { mssv, grades };
        } catch (e) { return null; }
    }

    async function fetchBG(url, type) {
        try {
            const res = await fetch(url);
            const text = await res.text();
            const doc = new DOMParser().parseFromString(text, 'text/html');

            if (type === 'EXAM') {
                const ex = [];
                doc.querySelectorAll('#tbLichThi tbody tr').forEach(row => {
                    if (row.cells.length > 3) {
                        ex.push({
                            sub: row.cells[1]?.innerText.trim(),
                            date: row.cells[2]?.innerText.trim(),
                            time: row.cells[3]?.innerText.trim(),
                            room: row.cells[4]?.innerText.trim()
                        });
                    }
                });
                return ex;
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

                        if (rawName) details.push({
                             code, name,
                             credits: c[3].innerText.trim(),
                             fee: c[9].innerText.trim()
                        });
                    }
                });
                const totalEl = doc.querySelector('th[title="Tổng số phải đóng"]');
                return { total: totalEl ? totalEl.innerText.trim() : "0", details };
            }
            return [];
        } catch (e) {
            return type === 'TUITION' ? { total: "0", details: [] } : [];
        }
    }

    // ============================================================
    // PHẦN 2: LOGIC CÀO DANH SÁCH LỚP MỞ (MODE COURSE DB)
    // ============================================================

    function parseScheduleString(str) {
        // Input: "T2(1-5)-P.cs2:TNL_A211" -> ["T2(1-5)"]
        if (!str) return [];
        const regex = /T(\d|CN)\((\d+)-(\d+)\)/g; 
        const matches = str.match(regex);
        return matches ? matches : [];
    }

    function scrapeOpenClasses() {
        const table = document.getElementById('tbPDTKQ');
        if (!table) return null;

        const rows = table.querySelectorAll('tbody tr');
        const courseMap = {}; 

        rows.forEach(row => {
            const cells = row.cells;
            if (cells.length < 9) return; 

            // Cấu trúc cột trang pid=327: [1] Mã MH, [2] Tên, [3] Lớp, [4] TC, [8] Lịch
            const subjID = cells[1].innerText.trim();
            const subjName = cells[2].innerText.trim();
            const classID = cells[3].innerText.trim();
            const credits = parseInt(cells[4].innerText.trim()) || 0;
            const rawSchedule = cells[8].innerText.trim();

            if (!subjID) return;

            if (!courseMap[subjID]) {
                courseMap[subjID] = {
                    id: subjID,
                    name: subjName,
                    credits: credits,
                    classes: []
                };
            }

            courseMap[subjID].classes.push({
                id: classID,
                schedule: parseScheduleString(rawSchedule) 
            });
        });

        return Object.values(courseMap);
    }

    // ============================================================
    // PHẦN 3: ĐIỀU PHỐI (MAIN CONTROLLER)
    // ============================================================

    const currentUrl = window.location.href;

    // --- TRƯỜNG HỢP A: ĐANG Ở TRANG LỚP MỞ (pid=327) ---
    if (currentUrl.indexOf("pid=327") !== -1) {
        console.log("Đang ở chế độ: Cào Dữ Liệu Lớp Mở (Course DB)");

        // 1. Tự động chọn Năm/Kỳ
        try {
            const cboNam = window.cboNamHoc; 
            const cboHK = window.cboHocKy; 
            const btnXem = document.getElementById("ctl00_ContentPlaceHolder1_ctl00_btnXem");

            if (cboNam && cboHK && btnXem) {
                // Kiểm tra giá trị hiện tại
                // Lưu ý: Obout ComboBox dùng method .value() để get
                if (cboNam.value() !== CONFIG.TARGET_YEAR || cboHK.value() !== CONFIG.TARGET_SEM) {
                    
                    // Set giá trị mới
                    cboNam.value(CONFIG.TARGET_YEAR);
                    cboHK.value(CONFIG.TARGET_SEM);
                    
                    // Click xem để reload
                    btnXem.click();
                    
                    alert(`⏳ Đang chuyển sang năm ${CONFIG.TARGET_YEAR} - HK${CONFIG.TARGET_SEM}...\nVui lòng đợi trang tải xong rồi BẤM LẠI BOOKMARKLET!`);
                    return; // Dừng script chờ reload
                }
            }
        } catch (e) {
            console.warn("Lỗi auto-select combo box:", e);
        }

        // 2. Cào dữ liệu
        const courses = scrapeOpenClasses();
        if (!courses || courses.length === 0) {
            alert("⚠️ Bảng dữ liệu trống! Hãy chắc chắn bạn đã chọn Năm học/Học kỳ và bấm Xem.");
            return;
        }

        // 3. Gửi về Web App
        if (window.opener) {
            window.opener.postMessage({ type: 'OPEN_CLASS_DATA', payload: courses }, '*');
            alert(`✅ Đã lấy được ${courses.length} môn học!\nKiểm tra bên Web App.`);
        } else {
            console.log(courses);
            alert(`Đã lấy ${courses.length} môn (Chế độ debug).`);
        }
        return;
    }

    // --- TRƯỜNG HỢP B: ĐANG Ở TRANG ĐIỂM (pid=211) ---
    if (currentUrl.indexOf("pid=211") !== -1) {
        console.log("Đang ở chế độ: Cào Thông Tin Sinh Viên");

        // 1. Check nút "Tất cả" (Logic cũ của bạn)
        const cb = document.getElementById("ctl00_ContentPlaceHolder1_ctl00_cboNamHoc_gvDKHPLichThi_ob_CbocboNamHoc_gvDKHPLichThiTB");
        const btn = document.getElementById("ctl00_ContentPlaceHolder1_ctl00_btnXemDiemThi");
        
        // Fix lỗi null check an toàn hơn
        if (cb && btn) {
            const isAll = (cb.value.indexOf("Tất cả") !== -1 || cb.value.indexOf("All") !== -1);
            if (!isAll) {
                try { if (typeof cboNamHoc_gvDKHPLichThi !== 'undefined') cboNamHoc_gvDKHPLichThi.value('0'); } catch(e){}
                btn.click();
                alert("🔄 Đang chuyển sang chế độ 'Tất cả'...\nBấm lại Bookmarklet sau khi tải xong!");
                return;
            }
        }

        // 2. Cào điểm
        const gData = scrapeGrades();
        if (!gData || gData.grades.length === 0) {
            alert("⚠️ Không lấy được bảng điểm. Đợi trang tải xong rồi thử lại.");
            return;
        }

        // 3. Loading UI
        const noti = document.createElement('div');
        Object.assign(noti.style, {
            position: 'fixed', bottom: '20px', right: '20px',
            background: '#005a8d', color: 'white', padding: '15px 20px',
            zIndex: '99999', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            fontFamily: 'Segoe UI, sans-serif', fontSize: '14px',
            display: 'flex', alignItems: 'center', gap: '10px'
        });
        noti.innerHTML = `<div style="width:20px;height:20px;border:3px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite"></div><span>Đang lấy Lịch thi & Học phí...</span><style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
        document.body.appendChild(noti);

        // 4. Fetch ngầm
        try {
            const [exams, tuitionData] = await Promise.all([
                fetchBG(CONFIG.URL_LICHTHI, 'EXAM'),
                fetchBG(CONFIG.URL_HOCPHI, 'TUITION')
            ]);
    
            document.body.removeChild(noti);
    
            const payload = {
                mssv: gData.mssv,
                grades: gData.grades,
                exams: exams,
                tuition: tuitionData,
                program: [] // CTĐT để trống hoặc logic khác nếu cần
            };
    
            if (window.opener) {
                window.opener.postMessage({ type: 'PORTAL_DATA', payload: payload }, '*');
                alert(`✅ XONG!\n- SV: ${payload.mssv}\n- Điểm: ${payload.grades.length} mục\n- Học phí: ${payload.tuition.total}`);
            } else {
                console.log(payload);
                alert("Không tìm thấy Web App cha.");
            }
        } catch (e) {
            alert("Lỗi fetch: " + e.message);
        }
        return;
    }

    // --- TRƯỜNG HỢP C: TRANG KHÁC ---
    // Hỏi user muốn đi đâu
    const choice = prompt("Bạn muốn làm gì?\n1. Cào Điểm & Lịch thi (Về trang pid=211)\n2. Cào Danh sách Lớp Mở 25-26 (Về trang pid=327)", "1");
    if (choice === "1") window.location.href = CONFIG.URL_DIEM;
    else if (choice === "2") window.location.href = CONFIG.URL_LOPMO;

})();