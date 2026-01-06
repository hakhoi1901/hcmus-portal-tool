// Input:
// - courseDB: JSON database môn học (đã load sẵn)
// - userRequest: Array mã môn muốn học ['IT001', 'BAA00021']
// - fixedClasses: Object {'IT001': 'L12'} (Môn cố định)
// - sessionPref: 0, 1, 2 (Sở thích buổi)

function runScheduleSolver(courseDBData, userRequest, fixedClasses, sessionPref) {
    // 1. Init Database
    const db = new CourseDatabase();
    db.loadFromEngineFormat(courseDBData); // Load cái json lớn vào

    // 2. Filter môn học
    const selectedSubjects = db.filterSubjects(userRequest);
    
    if (selectedSubjects.length === 0) {
        return { error: "Không tìm thấy môn học nào trong danh sách yêu cầu." };
    }

    // 3. Chạy thuật toán
    console.log("Starting Genetic Solver...");
    const solver = new GeneticSolver(selectedSubjects, fixedClasses, sessionPref);
    const rawResults = solver.solve(3); // Lấy top 3

    // 4. Format kết quả trả về JSON (để Web App hiển thị sau này)
    const finalResults = rawResults.map((res, idx) => {
        return {
            option: idx + 1,
            fitness: res.fitness,
            schedule: res.genes.map((classIdx, subjIdx) => {
                if (classIdx === -1) return null;
                const subj = selectedSubjects[subjIdx];
                const cls = subj.classes[classIdx];
                return {
                    subjectID: subj.id,
                    subjectName: subj.name,
                    classID: cls.id,
                    // Ta không cần trả về Bitmask, chỉ cần trả về ID lớp là đủ để hiển thị
                };
            }).filter(item => item !== null)
        };
    });

    return finalResults;
}