// --- 1. IMPORT CÁC MODULE CON ---
import { CourseDatabase } from './CourseDatabase.js';
import { GeneticSolver } from './GeneticSolver.js';

// --- 2. HÀM XỬ LÝ CHÍNH (MAIN FUNCTION) ---
// Hàm này sẽ được Web App gọi
export function runScheduleSolver(courseDBData, userRequest, fixedClasses, sessionPref) {
    // A. Khởi tạo Database và Load dữ liệu
    // courseDBData là cục JSON to đùng (danh sách lớp mở)
    const db = new CourseDatabase();
    
    // Nếu courseDBData là string (JSON text) thì parse ra, nếu là object rồi thì thôi
    const rawData = (typeof courseDBData === 'string') 
                    ? JSON.parse(courseDBData) 
                    : courseDBData;

    db.loadFromEngineFormat(rawData); 

    // B. Lọc ra các môn user muốn học
    // userRequest: mảng các mã môn ['IT001', 'BAA00021'...]
    const selectedSubjects = db.filterSubjects(userRequest);
    
    if (selectedSubjects.length === 0) {
        console.error("Không tìm thấy môn nào hợp lệ trong DB.");
        return { error: "No subjects found" };
    }

    // C. Chạy thuật toán Di truyền (Genetic Algorithm)
    // sessionPref: 0 (Cả hai), 1 (Sáng), 2 (Chiều)
    console.log(`Starting Genetic Solver for ${selectedSubjects.length} subjects...`);
    
    const solver = new GeneticSolver(selectedSubjects, fixedClasses, sessionPref);
    
    // Lấy 3 kết quả tốt nhất (Top 3)
    const rawResults = solver.solve(3); 

    // D. Đóng gói kết quả trả về cho Web App
    const finalResults = rawResults.map((res, idx) => {
        return {
            option: idx + 1,
            fitness: res.fitness,
            // Map ngược từ Gene (index lớp) ra thông tin chi tiết
            schedule: res.genes.map((classIdx, subjIdx) => {
                // Nếu gene = -1 nghĩa là không đăng ký được môn đó (hiếm gặp)
                if (classIdx === -1) return null;

                const subj = selectedSubjects[subjIdx];
                const cls = subj.classes[classIdx];
                
                return {
                    subjectID: subj.id,
                    subjectName: subj.name,
                    classID: cls.id,
                    // Bạn có thể thêm Bitmask vào đây nếu muốn vẽ bảng màu mè
                    mask: cls.scheduleMask.parts 
                };
            }).filter(item => item !== null) // Lọc bỏ giá trị null
        };
    });

    console.log("Solver finished. Found options:", finalResults.length);
    return finalResults;
}