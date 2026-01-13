/**
 * Logic.js - Xử lý nghiệp vụ Xếp Lịch
 * Nhiệm vụ: Thu thập checkbox từ UI -> Chuẩn hóa dữ liệu -> Gọi Engine (Scheduler) -> Vẽ kết quả.
 */

import { runScheduleSolver } from './tkb/Scheduler.js';
import { GLOBAL_COURSE_DB, getStoredPreferences } from './Utils.js';
import { renderScheduleResults } from './render/NewUI.js';

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
        const fixedClasses = {}; // Object lưu: { 'MãMôn': ['LớpA', 'LớpB'] }
        
        const savedSelection = JSON.parse(localStorage.getItem('hcmus_selected_classes') || '{}');

        const checkboxes = document.querySelectorAll('.chk-course:checked');
        
        if (checkboxes.length === 0) {
            throw new Error("Bạn chưa chọn môn học nào!"); 
        }

        checkboxes.forEach(chk => {
            const subjID = chk.value;
            userWants.push(subjID);
            
            if (savedSelection[subjID] && Array.isArray(savedSelection[subjID]) && savedSelection[subjID].length > 0) {
                fixedClasses[subjID] = savedSelection[subjID];
            }
        });

        const preferences = getStoredPreferences();

        console.log("Đang chạy với cấu hình:", preferences);

        // 4. Gọi Engine (Chạy Async)
        if (typeof runScheduleSolver === 'function') {
            setTimeout(() => {
                const results = runScheduleSolver(
                    GLOBAL_COURSE_DB, 
                    userWants, 
                    fixedClasses, 
                    preferences // <--- Tham số mới đã chuẩn
                );
                
                console.log(`Logic: Tìm thấy ${results.length} phương án.`);
                
                // Vẽ kết quả
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