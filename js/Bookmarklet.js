(async function() {
    // === 1. CẤU HÌNH ===
    const CONFIG = {
        URL_DIEM: "/SinhVien.aspx?pid=211",
        URL_LICHTHI: "/SinhVien.aspx?pid=212",
        URL_HOCPHI: "/SinhVien.aspx?pid=331",
        URL_LOPMO: "/SinhVien.aspx?pid=327",
        TARGET_YEAR: "25-26",
        TARGET_SEM: "1"
    };

    const STORAGE_KEY = "HCMUS_TOOL_DATA";

    // === 2. CÁC HÀM CÀO DỮ LIỆU ===

    // Cào Bảng Điểm (Giữ nguyên)
    function scrapeGrades() {
        try {
            let mssv = "Unknown";
            const userEl = document.getElementById('user_tools');
            if (userEl) {
                const match = userEl.innerText.match(/Xin chào\s+([^|]+)/i);
                if (match) mssv = match[1].trim();
            }

            const grades = [];
            document.querySelectorAll('#tbDiemThiGK tbody tr').forEach(row => {
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
        } catch (e) { return null; }
    }

    // Fetch Ngầm (Giữ nguyên)
    async function fetchBackgroundData(url, type) {
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
                        if (rawName) details.push({ code, name, credits: c[3].innerText.trim(), fee: c[9].innerText.trim() });
                    }
                });
                const totalEl = doc.querySelector('th[title="Tổng số phải đóng"]');
                return { total: totalEl ? totalEl.innerText.trim() : "0", details };
            }
        } catch (e) { return type === 'TUITION' ? { total: "0", details: [] } : []; }
        return [];
    }

    // --- PHẦN QUAN TRỌNG: CÀO LỚP MỞ (ĐÃ FIX CHỈ SỐ CỘT) ---
    function parseScheduleString(str) {
        if (!str) return [];
        // Regex bắt chuỗi dạng T2(1-3) hoặc CN(1-3)
        const regex = /T(\d|CN)\((\d+)-(\d+)\)/g;
        const matches = str.match(regex);
        return matches ? matches : [];
    }

    function scrapeOpenClasses() {
        const table = document.getElementById('tbPDTKQ');
        if (!table) return null;
        
        const rows = table.querySelectorAll('tbody tr');
        const courseMap = {}; // Dùng Map để gom nhóm các lớp cùng môn

        rows.forEach(row => {
            const cells = row.cells;
            if (cells.length < 8) return; // Bỏ qua dòng lỗi

            // --- SỬA LẠI INDEX CỘT Ở ĐÂY ---
            // 0: Mã MH
            // 1: Tên Môn
            // 2: Tên Lớp (Mã Lớp) -> QUAN TRỌNG: Trước đây đọc nhầm cột này
            // 3: Số TC
            // 7: Lịch Học
            
            const subjID = cells[0].innerText.trim();      // Index 0 (Thay vì 1)
            const subjName = cells[1].innerText.trim();    // Index 1 (Thay vì 2)
            const classID = cells[2].innerText.trim();     // Index 2 (Thay vì 3 - Cột này là unique)
            const credits = parseInt(cells[3].innerText.trim()) || 0; // Index 3
            
            // Lịch học nằm ở cột 7 (index 7)
            const rawSchedule = cells[7] ? cells[7].innerText.trim() : "";

            if (!subjID) return;

            // Khởi tạo môn học nếu chưa có
            if (!courseMap[subjID]) {
                courseMap[subjID] = {
                    id: subjID,
                    name: subjName,
                    credits: credits,
                    classes: []
                };
            }

            // Kiểm tra trùng lặp lớp (Dựa vào classID - ví dụ: 24CLC1)
            const existingClass = courseMap[subjID].classes.find(c => c.id === classID);
            
            if (!existingClass) {
                // Nếu chưa có lớp này thì thêm vào
                courseMap[subjID].classes.push({
                    id: classID,
                    schedule: parseScheduleString(rawSchedule)
                });
            } else {
                // (Optional) Nếu lớp đã tồn tại (do bảng bị tách dòng), gộp thêm lịch học
                const newSchedule = parseScheduleString(rawSchedule);
                if(newSchedule.length > 0) {
                     existingClass.schedule = [...new Set([...existingClass.schedule, ...newSchedule])];
                }
            }
        });

        // Trả về mảng các môn học (đã chứa full danh sách lớp bên trong)
        return Object.values(courseMap);
    }

    // === 3. LOGIC ĐIỀU KHIỂN CHÍNH ===
    let savedData = {};
    try { savedData = JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {}; } catch (e) {}
    const currentUrl = window.location.href;

    // --- BƯỚC 1: TRANG ĐIỂM ---
    if (!savedData.hasStudentInfo) {
        if (currentUrl.indexOf("pid=211") === -1) {
            if(confirm("Bước 1: Cần lấy dữ liệu Điểm/Lịch thi trước.\nChuyển đến trang Xem Điểm (pid=211)?")) {
                window.location.href = CONFIG.URL_DIEM;
            }
            return;
        }
        const cb = document.getElementById("ctl00_ContentPlaceHolder1_ctl00_cboNamHoc_gvDKHPLichThi_ob_CbocboNamHoc_gvDKHPLichThiTB");
        const btn = document.getElementById("ctl00_ContentPlaceHolder1_ctl00_btnXemDiemThi");
        if (cb && btn && (cb.value.indexOf("Tất cả") === -1 && cb.value.indexOf("All") === -1)) {
            try { if (typeof cboNamHoc_gvDKHPLichThi !== 'undefined') cboNamHoc_gvDKHPLichThi.value('0'); } catch(e){}
            btn.click();
            alert("⏳ Đang chọn 'Tất cả'... Đợi trang load xong bấm lại Bookmarklet!");
            return;
        }
        const gData = scrapeGrades();
        if (!gData || gData.grades.length === 0) {
            alert("⚠️ Bảng điểm trống. Đợi load xong hãy bấm lại.");
            return;
        }
        const noti = document.createElement('div');
        noti.style.cssText = "position:fixed;bottom:20px;right:20px;background:#005a8d;color:white;padding:15px;z-index:9999;border-radius:5px";
        noti.innerHTML = "⏳ Đang lấy Lịch thi & Học phí...";
        document.body.appendChild(noti);
        try {
            const [exams, tuition] = await Promise.all([
                fetchBackgroundData(CONFIG.URL_LICHTHI, 'EXAM'),
                fetchBackgroundData(CONFIG.URL_HOCPHI, 'TUITION')
            ]);
            document.body.removeChild(noti);
            savedData.mssv = gData.mssv;
            savedData.grades = gData.grades;
            savedData.exams = exams;
            savedData.tuition = tuition;
            savedData.hasStudentInfo = true;
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(savedData));
            if(confirm(`✅ Xong bước 1.\nChuyển sang trang Lớp mở (pid=327) để lấy danh sách môn học?`)) {
                window.location.href = CONFIG.URL_LOPMO;
            }
        } catch(e) { alert("Lỗi: " + e.message); }
        return;
    }

    // --- BƯỚC 2: TRANG LỚP MỞ ---
    if (!savedData.hasCourseInfo) {
        if (currentUrl.indexOf("pid=327") === -1) {
             window.location.href = CONFIG.URL_LOPMO;
             return;
        }
        try {
            const cboNam = window.cboNamHoc;
            const cboHK = window.cboHocKy;
            const btnXem = document.getElementById("ctl00_ContentPlaceHolder1_ctl00_btnXem");
            if (cboNam && cboHK && btnXem) {
                if (cboNam.value() !== CONFIG.TARGET_YEAR || cboHK.value() !== CONFIG.TARGET_SEM) {
                    cboNam.value(CONFIG.TARGET_YEAR);
                    cboHK.value(CONFIG.TARGET_SEM);
                    btnXem.click();
                    alert(`🔄 Đang chuyển sang năm ${CONFIG.TARGET_YEAR}... Đợi load xong bấm lại lần cuối!`);
                    return;
                }
            }
        } catch (e) {}

        const courses = scrapeOpenClasses();
        if (!courses || courses.length === 0) {
            alert("⚠️ Chưa có dữ liệu lớp mở. Hãy bấm nút 'Xem' trên web trước.");
            return;
        }

        const finalPayload = {
            mssv: savedData.mssv,
            grades: savedData.grades,
            exams: savedData.exams,
            tuition: savedData.tuition,
            program: []
        };

        if (window.opener) {
            window.opener.postMessage({ type: 'PORTAL_DATA', payload: finalPayload }, '*');
            setTimeout(() => {
                window.opener.postMessage({ type: 'OPEN_CLASS_DATA', payload: courses }, '*');
                alert(`✅ HOÀN TẤT!\nĐã lấy ${courses.length} môn học (với đầy đủ các lớp).`);
                sessionStorage.removeItem(STORAGE_KEY);
            }, 500);
        } else {
            console.log("Full Data:", finalPayload);
            console.log("Courses:", courses);
            alert(`Đã lấy ${courses.length} môn (Debug).`);
            sessionStorage.removeItem(STORAGE_KEY);
        }
        return;
    }
})();