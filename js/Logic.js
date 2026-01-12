/**
 * Logic.js - Xử lý nghiệp vụ Xếp Lịch
 * Nhiệm vụ: Thu thập checkbox từ UI -> Chuẩn hóa dữ liệu -> Gọi Engine (Scheduler) -> Vẽ kết quả.
 */

import { runScheduleSolver } from './tkb/Scheduler.js';
import { GLOBAL_COURSE_DB, renderScheduleResults } from './Utils.js';

export async function onNutBamXepLich() {
    const btn = document.querySelector('button[onclick="onNutBamXepLich()"]');
    const originalText = btn ? btn.innerText : "Xếp Lịch Ngay";
    
    if(btn) {
        btn.innerText = "⏳ Đang tính toán...";
        btn.disabled = true;
    }

    try {
        // 1. Validate Dữ liệu nguồn
        if (!GLOBAL_COURSE_DB || GLOBAL_COURSE_DB.length === 0) {
            throw new Error("Chưa có dữ liệu môn học. Vui lòng tải lại trang.");
        }

        // 2. Thu thập User Input
        const userWants = [];
        const fixedClasses = {};
        
        const checkboxes = document.querySelectorAll('.chk-course:checked');
        
        if (checkboxes.length === 0) {
            throw new Error("Bạn chưa chọn môn học nào!"); // Dùng Error để nhảy xuống catch
        }

        checkboxes.forEach(chk => {
            const subjID = chk.value;
            userWants.push(subjID);
            
            // Lấy lớp cố định (Dropdown)
            const dropdown = document.getElementById(`sel-${subjID}`);
            if (dropdown && dropdown.value !== "") {
                fixedClasses[subjID] = dropdown.value;
            }
        });

        // 3. Lấy tùy chọn (Sáng/Chiều)
        const prefEl = document.getElementById('sel-session-pref');
        const sessionPref = prefEl ? parseInt(prefEl.value) : 0; 

        // 4. Gọi Engine (Chạy Async để không đơ UI)
        if (typeof runScheduleSolver === 'function') {
            setTimeout(() => {
                // Engine cần mảng courses chuẩn, ta dùng trực tiếp GLOBAL_COURSE_DB
                // vì ở Utils đã encodeMask rồi.
                const results = runScheduleSolver(GLOBAL_COURSE_DB, userWants, fixedClasses, sessionPref);
                
                console.log(`Logic: Tìm thấy ${results.length} phương án.`);
                
                // Vẽ kết quả (Hàm này lấy từ Utils)
                renderScheduleResults(results);

                // Chuyển Tab
                if (window.switchViewMode) window.switchViewMode('schedule');

                // Reset Button
                if (btn) {
                    btn.innerText = originalText;
                    btn.disabled = false;
                }
            }, 50); 
        } else {
            throw new Error("Engine xếp lịch chưa được tải!");
        }

    } catch (e) {
        console.error("Logic Error:", e);
        // Chỉ alert nếu là lỗi hệ thống, còn lỗi user (chưa chọn môn) thì thông báo nhẹ
        if (e.message !== "Bạn chưa chọn môn học nào!") {
            alert(e.message);
        } else {
            alert("Vui lòng chọn ít nhất 1 môn học!");
        }
        
        if(btn) {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
}
