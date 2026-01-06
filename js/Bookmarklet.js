// ================= BOOKMARKLET.JS =================
// Bookmarklet chạy trực tiếp trên Portal
// Cào dữ và bắn ngược về Web App
// ==================================================

import { PORTAL_TAB_URL } from "./PORTAL_TAB_URL";

(async function () {

    // kiểm tra người dùng ở trang bảng điểm chưa
    if (window.location.href.indexOf("pid=211") === -1) {
        window.location.href = PORTAL_TAB_URL.URL_DIEM; // script sẽ tự chuyển hướng về trang điểm.
        return;     // Dừng script để chờ trang load lại
    }

    // Xử lý dropdown để chọn tất cả
    // Lấy element dropdownvà nút xem
    const cbNamHoc = document.getElementById("ctl00_ContentPlaceHolder1_ctl00_cboNamHoc_gvDKHPLichThi_ob_CbocboNamHoc_gvDKHPLichThiTB");
    const btnXem = document.getElementById("ctl00_ContentPlaceHolder1_ctl00_btnXemDiemThi");

    // Kiểm tra nếu Portal đổi giao diện thì báo lỗi.
    if (!cbNamHoc || !btnXem) {
        // alert báo lỗi lên web app
        alert("Lỗi: Không tìm thấy elements trên Portal. Có thể giao diện trường đã đổi.");
        return;
    }

    // Kiểm tra xem đã chọn "Tất cả" chưa
    const isAll = (cbNamHoc.value.indexOf("Tất cả") !== -1 || cbNamHoc.value.indexOf("All") !== -1);

    if (!isAll) {
        // Nếu chưa thử vào hàm nội bộ của portal hoặc alert user
        try {
            // Này là hàm của thư viện Obout ComboBox trên Portal đang dùng :>
            if (typeof cboNamHoc_gvDKHPLichThi !== 'undefined') {
                // gọi hàm nội bộ để set giá trị về '0'.
                cboNamHoc_gvDKHPLichThi.value('0'); 
            } else {
                // Nếu không được thì ném lỗi
                throw new Error("Không tìm thấy object ComboBox");
            }
        } catch (e) {
            // Trả console
            console.log("Fallback: Yêu cầu reload thủ công");
        }
        
        // click nút xem để reload trang với dữ liệu mới
        btnXem.click();

        // ném alert
        alert("Đang tải lại trang để lấy 'Tất cả' điểm...\n\n👉 BẤM LẠI TOOL LẦN NỮA SAU KHI TRANG TẢI XONG!");
        return; // Dừng lại chờ trang reload
    }

    // === CÁC HÀM HỖ TRỢ CÀO DỮ LIÊUJ ===

    // Cào bảng điểm từ DOM hiện tại (trang pid=211)
    function scrapeGrades() {
        try {
            let mssv = "Unknown";
            // Lấy MSSV từ thanh công cụ góc phải trên
            const userEl = document.getElementById('user_tools');
            if (userEl) {
                // Dùng Regex để tách tên sau chữ "Xin chào"
                const match = userEl.innerText.match(/Xin chào\s+([^|]+)/i);
                if (match) mssv = match[1].trim();
            }

            const grades = [];
            // Selector bảng điểm giữa kỳ/cuối kỳ
            const rows = document.querySelectorAll('#tbDiemThiGK tbody tr');
            
            rows.forEach(row => {
                // Bỏ qua các dòng tiêu đề hoặc dòng không đủ cột dữ liệu
                if (row.cells.length < 6) return;
                
                // Lấy cột 1: tên môn (Format: "CSC10001 - Nhập môn lập trình")
                const rawSubject = row.cells[1]?.innerText || '';
                // Lấy cột 5: điểm tổng kết
                const score = parseFloat(row.cells[5]?.innerText || '');
                
                // Regex lấy mã môn
                const idMatch = rawSubject.match(/^([A-Z0-9]+)\s-/);
                
                // Chỉ lưu nếu lấy được mã môn và điểm là số hợp lệ
                if (idMatch && !isNaN(score)) {
                    grades.push({
                        id: idMatch[1],
                        score: score
                    });
                }
            });
            return { mssv, grades };
        } catch (e) {
            return null; // Trả về null nếu lỗi để xử lý sau
        }
    }

    // Hàm fetch ngầm HTML từ URL khác (Lịch thi, Học phí)
    async function fetchBackgroundData(url, type) {
        try {
            const res = await fetch(url);
            const text = await res.text();
            // Parse HTML text thành DOM ảo để query
            // Tạo một document ảo trong bộ nhớ, không hiển thị ra UI
            const doc = new DOMParser().parseFromString(text, 'text/html');

            // Xử lý logic riêng cho trang lịch thi
            if (type === 'EXAM') {
                // Chứa dữ liệu lịch thi
                const exams = [];
                // Query trên DOM ảo vừa tạo
                doc.querySelectorAll('#tbLichThi tbody tr').forEach(row => {
                    if (row.cells.length > 3) {
                        exams.push({sub: row.cells[1]?.innerText.trim(),    // Tên môn
                            date: row.cells[2]?.innerText.trim(),           // Ngày thi
                            time: row.cells[3]?.innerText.trim(),           // Giờ thi
                            room: row.cells[4]?.innerText.trim()            // Phòng thi
                        });
                    }
                });
                return exams;
            }

            // Xử lý logic riêng cho trang Học phí
            if (type === 'TUITION') {
                const details = [];
                // Bảng học phí thường có class .dkhp-table hoặc cấu trúc tương tự
                doc.querySelectorAll('.dkhp-table tbody tr').forEach(row => {
                    const c = row.querySelectorAll('td');
                    // Cấu trúc bảng học phí Portal khá phức tạp, cần check kỹ index
                    if (c.length > 9) {
                        let rawName = c[2].innerText.trim(); // Cột tên môn
                        // Tách mã môn trong dấu [] nếu có: [CSC001] Tên môn
                        let codeMatch = rawName.match(/\[(.*?)\]/);
                        let code = codeMatch ? codeMatch[1] : "";
                        let name = rawName.replace(/\[.*?\]/g, '').trim();

                        if (rawName) {
                            details.push({
                                code: code,
                                name: name,
                                credits: c[3].innerText.trim(), // Số tín chỉ
                                fee: c[9].innerText.trim()      // Số tiền phải đóng
                            });
                        }
                    }
                });
                
                // Lấy tổng tiền từ footer của bảng (thẻ th có title="Tổng số phải đóng")
                const totalEl = doc.querySelector('th[title="Tổng số phải đóng"]');
                const total = totalEl ? totalEl.innerText.trim() : "0";
                
                return { total: total, details: details };
            }
            return [];
        } catch (e) {
            console.error(`Lỗi fetch ${type}:`, e);
            // Trả về dữ liệu rỗng an toàn nếu lỗi mạng hoặc parse lỗi
            return type === 'TUITION' ? { total: "0", details: [] } : [];
        }
    }

    // main flow
    try {
        // Bước 1: Cào điểm từ trang bảng điển (default)
        const gData = scrapeGrades();
        if (!gData || gData.grades.length === 0) {
            alert("⚠️ Bảng điểm trống hoặc chưa load xong.");
            return;
        }
        
        // Bước 2: Hiển thị thông báo loading đè lên giao diện Portal
        // Giúp user biết tool vẫn đang chạy ngầm, không phải bị treo.
        const noti = document.createElement('div');
        noti.innerHTML = '<div style="position:fixed;bottom:10px;right:10px;background:#005a8d;color:white;padding:15px;z-index:9999;border-radius:5px;box-shadow:0 0 10px rgba(0,0,0,0.5)">⏳ Đang lấy Lịch thi & Học phí...</div>';
        document.body.appendChild(noti);

        // Bước 3: Chạy song song (Parallel) việc lấy Lịch thi và Học phí
        // Dùng Promise.all để chạy đồng thời tất cả
        const [exams, tuitionData] = await Promise.all([
            fetchBackgroundData(PORTAL_TAB_URL.URL_LICHTHI, 'EXAM'),
            fetchBackgroundData(PORTAL_TAB_URL.URL_HOCPHI, 'TUITION')
        ]);
        
        // Xóa thông báo loading sau khi xong
        document.body.removeChild(noti);    

        // Bước 4: Đóng gói toàn bộ dữ liệu vào một object payload
        const payload = {
            mssv: gData.mssv,
            grades: gData.grades,
            exams: exams,
            tuition: tuitionData
        };

        // Bước 5: Gửi dữ liệu về lại tab web app
        // window.opener là tham chiếu đến tab đã mở tab Portal này.
        if (window.opener) {
            // Giao tiếp giữa 2 tab khác domain
            window.opener.postMessage({ type: 'PORTAL_DATA', payload: payload }, '*');
            // Thông báo kết quả cho user trên Portal
            alert(`XONG!\n- Xin chào: ${payload.mssv}\n- Điểm: ${payload.grades.length} môn\n- Học phí: ${payload.tuition.total}`);
        } else {
            alert("Không tìm thấy Web App cha (Tool Tụi Tui). Bạn có đang mở Tool không?");
        }

    } catch (e) {
        // Bắt lỗi
        alert("Lỗi Script: " + e.message);
    }
})();