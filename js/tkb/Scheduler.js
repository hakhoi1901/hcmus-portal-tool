import CourseDatabase from './CourseDatabase.js';
import GeneticSolver from './GeneticSolver.js';
import { FitnessEvaluator } from './FitnessValuator.js';

export function runScheduleSolver(dbData, userWants, fixedClasses, preferences) {
    // ============================================================
    // 🔍 DEBUG AREA: BẮT ĐẦU KIỂM TRA DỮ LIỆU ĐẦU VÀO
    // ============================================================
    console.group("🚀 DEBUG: Dữ liệu nhận được tại Scheduler.js");
    
    console.log("1️⃣ Danh sách môn muốn học (User Wants):", userWants);
    
    console.log("2️⃣ Danh sách lớp đã chọn (Fixed Classes):");
    console.table(fixedClasses); // In dạng bảng cho dễ nhìn
    console.log("   -> Raw object:", fixedClasses); // In raw để check kiểu dữ liệu

    console.log("3️⃣ Tùy chọn (Preferences):", preferences);
    console.groupEnd();
    // ============================================================

    const db = new CourseDatabase();
    const data = (typeof dbData === 'string') ? JSON.parse(dbData) : dbData;
    db.loadData(data); 

    const selectedCourses = [];
    
    console.group("🛠️ DEBUG: Quá trình lọc lớp"); // Mở group log quá trình lọc

    userWants.forEach(subjID => {
        const cleanID = String(subjID).trim(); 
        const course = db.getCourse(cleanID);
        
        if (course) {
            // Lấy danh sách lớp được user chọn từ UI
            let allowedClasses = fixedClasses[cleanID];

            // LOG KIỂM TRA TỪNG MÔN
            if (allowedClasses) {
                console.log(`Checking môn [${cleanID}]: User yêu cầu lớp ->`, allowedClasses);
            }

            if (allowedClasses && Array.isArray(allowedClasses) && allowedClasses.length > 0) {
                // Chuẩn hóa ID về String để so sánh chính xác
                const allowedSet = new Set(allowedClasses.map(id => String(id).trim()));

                // Thực hiện lọc
                const filteredClasses = course.classes.filter(c => {
                    const cID = String(c.id).trim();
                    const isKept = allowedSet.has(cID);
                    // Log nếu lớp bị loại bỏ để biết lý do
                    if (!isKept) {
                        // console.log(`   ❌ Loại bỏ lớp: ${cID} (Không nằm trong danh sách chọn)`);
                    }
                    return isKept;
                });
                
                if (filteredClasses.length > 0) {
                    console.log(`   ✅ Đã lọc môn ${cleanID}: Giữ lại ${filteredClasses.length}/${course.classes.length} lớp.`);
                    
                    // COPY SÂU
                    const newCourseObj = { ...course, classes: filteredClasses };
                    selectedCourses.push(newCourseObj);
                } else {
                    // TRƯỜNG HỢP NGUY HIỂM: Chọn rồi mà lọc không ra gì
                    console.error(`   ❌ LỖI: Môn ${cleanID} có yêu cầu lớp ${allowedClasses} nhưng không tìm thấy trong DB!`);
                    console.log("   👉 Danh sách lớp thực tế trong DB:", course.classes.map(c => c.id));
                    
                    alert(`Lỗi dữ liệu: Bạn chọn lớp ${allowedClasses} cho môn ${cleanID} nhưng hệ thống không tìm thấy lớp này. Vui lòng chọn lại.`);
                    return []; 
                }
            } else {
                // console.log(`   ℹ️ Môn ${cleanID}: Không chọn lớp cụ thể -> Lấy tất cả.`);
                selectedCourses.push(course);
            }
        } else {
            console.warn(`⚠️ Không tìm thấy môn [${cleanID}] trong dữ liệu.`);
        }
    });
    console.groupEnd(); // Đóng group log

    if (selectedCourses.length === 0) {
        console.error('Không tìm thấy môn nào hợp lệ.');
        return []; 
    }

    // ... (Phần code bên dưới giữ nguyên: Valuator, Solver...)
    const valuator = new FitnessEvaluator(preferences);
    const solver = new GeneticSolver(selectedCourses, valuator); // Đã bỏ tham số thừa fixedConstraints
    const rawResults = solver.solve(5); 

    const mappedResults = rawResults.map((ind, index) => {
        const scheduleList = [];
        ind.genes.forEach((classIdx, courseIdx) => {
            if (classIdx !== -1) {
                const course = selectedCourses[courseIdx];
                const classObj = course.classes[classIdx];
                
                if (!classObj) return;

                let visualMask = classObj.mask;
                if (!visualMask && classObj.scheduleMask) {
                    visualMask = classObj.scheduleMask.parts; 
                }

                scheduleList.push({
                    subjectID: course.id,
                    classID: classObj.id,
                    mask: visualMask || [0,0,0,0], 
                    schedule: classObj.schedule
                });
            }
        });

        return {
            option: index + 1,
            fitness: ind.fitness,
            schedule: scheduleList 
        };
    });

    return mappedResults;
}