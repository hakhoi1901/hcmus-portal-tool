class PrerequisiteGraph {
    constructor(prereqData) {
        this.hardConstraints = {};
        this.softConstraints = {};
        this.buildGraph(prereqData);
    }

    buildGraph(data) {
        if (!Array.isArray(data)) return;
        data.forEach(item => {
            const cId = String(item.course_id).trim();
            // Xử lý chuỗi ID (ví dụ "INT123, INT456" -> ["INT123", "INT456"])
            const pIds = String(item.prereq_id).replace(/,/g, ' ').split(/\s+/).filter(x => x.length > 0);

            pIds.forEach(pid => {
                if (item.type === 'PREVIOUS') {
                    if (!this.softConstraints[cId]) this.softConstraints[cId] = [];
                    this.softConstraints[cId].push(pid);
                } else {
                    if (!this.hardConstraints[cId]) this.hardConstraints[cId] = [];
                    this.hardConstraints[cId].push(pid);
                }
            });
        });
    }

    // Tìm môn "tổ tiên" chặn đường (Root Blocker)
    findBlockingPrereq(courseId, passedCourses) {
        if (passedCourses.has(courseId)) return null; // Đã học rồi
        const reqs = this.hardConstraints[courseId] || [];
        
        for (const req of reqs) {
            if (!passedCourses.has(req)) {
                // Đệ quy tìm sâu hơn
                return this.findBlockingPrereq(req, passedCourses) || req;
            }
        }
        return courseId; // Không bị chặn bởi ai -> Chính nó là môn cần học
    }
}

export class CourseRecommender {
    constructor(studentData, openCourses, prereqs, allCoursesMeta, categories) {
        this.studentData = studentData;
        this.openCourses = openCourses || []; // Danh sách lớp mở (CourseDB)
        this.prereqs = prereqs || [];
        this.allCoursesMeta = allCoursesMeta || []; // Metadata (Credits, Type...)
        this.categories = categories || {}; // Cấu trúc nhóm ngành

        // Map lưu kết quả: Key = CourseID, Value = status_code
        this.recommendationsMap = new Map();
        
        // Tạo Map tra cứu nhanh metadata
        this.coursesMetaMap = new Map();
        this.allCoursesMeta.forEach(c => this.coursesMetaMap.set(c.course_id, c));
    }

    getStudentStatus() {
        const passed = new Set();
        const studying = new Set();
        const failed = new Set();
        const passedCreditsMap = new Map(); // Lưu số tín chỉ thực tế đã tích lũy của môn đó

        const grades = this.studentData?.grades || [];

        grades.forEach(g => {
            const cid = String(g.id).trim();
            let scoreRaw = g.score;
            const credits = parseInt(g.credits) || 0;

            // Đang học hoặc chưa có điểm
            if (scoreRaw === "" || scoreRaw === "(*)" || scoreRaw == null || scoreRaw === undefined) {
                studying.add(cid);
                return;
            }

            const score = parseFloat(scoreRaw);
            if (!isNaN(score)) {
                if (score >= 5.0) {
                    passed.add(cid);
                    passedCreditsMap.set(cid, credits);
                } else {
                    failed.add(cid);
                }
            } else {
                // Điểm chữ hoặc ký hiệu lạ -> coi như đang học
                studying.add(cid);
            }
        });

        return { passed, failed, studying, passedCreditsMap };
    }

    // Hàm thêm gợi ý với độ ưu tiên
    addRec(id, status) {
        const priorities = {
            'RETAKE': 4,            // Cao nhất: Học lại
            'MANDATORY': 3,         // Môn bắt buộc
            'ELECTIVE_REQUIRED': 2, // Thiếu tín chỉ nhóm
            'SUGGESTED': 1          // Gợi ý bổ trợ
        };

        if (this.recommendationsMap.has(id)) {
            const currentStatus = this.recommendationsMap.get(id);
            // Nếu trạng thái mới quan trọng hơn trạng thái cũ thì ghi đè
            if (priorities[status] > priorities[currentStatus]) {
                this.recommendationsMap.set(id, status);
            }
        } else {
            this.recommendationsMap.set(id, status);
        }
    }

    // Kiểm tra nhóm tự chọn (Đệ quy)
    checkGroupRequirement(requiredCredits, courseList, passed, passedCreditsMap, studying, graph) {
        let currentCredits = 0;
        
        // Tính tổng tín chỉ đã đạt trong nhóm này
        courseList.forEach(cid => {
            if (passed.has(cid)) {
                // Lấy tín chỉ thực tế hoặc từ meta
                const cr = passedCreditsMap.get(cid) || this.coursesMetaMap.get(cid)?.credits || 0;
                currentCredits += cr;
            }
        });

        // Nếu chưa đủ tín chỉ -> Gợi ý các môn chưa học trong nhóm
        if (currentCredits < requiredCredits) {
            courseList.forEach(cid => {
                if (!passed.has(cid) && !studying.has(cid)) {
                    // Tìm môn tiên quyết chặn nó (nếu có)
                    const target = graph.findBlockingPrereq(cid, passed);
                    // Nếu target khả dụng (chưa học, không đang học)
                    if (target && !passed.has(target) && !studying.has(target)) {
                        this.addRec(target, 'ELECTIVE_REQUIRED');
                    }
                }
            });
        }
    }

    // Hàm duyệt cây Categories (Đệ quy)
    traverseCategories(obj, passed, passedCreditsMap, studying, graph) {
        if (obj.sub_groups) {
            obj.sub_groups.forEach(sub => {
                this.checkGroupRequirement(
                    sub.credits_required, sub.courses, 
                    passed, passedCreditsMap, studying, graph
                );
            });
        } else if (obj.courses && obj.credits_required) {
            this.checkGroupRequirement(
                obj.credits_required, obj.courses,
                passed, passedCreditsMap, studying, graph
            );
        } else {
            // Duyệt sâu hơn vào các object con
            for (const key in obj) {
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    this.traverseCategories(obj[key], passed, passedCreditsMap, studying, graph);
                }
            }
        }
    }

    recommend() {
        console.log("🔍 Recommender: Đang chạy logic mới...");
        
        // 1. Chuẩn bị dữ liệu
        const { passed, failed, studying, passedCreditsMap } = this.getStudentStatus();
        const graph = new PrerequisiteGraph(this.prereqs);
        
        // Tạo map để check nhanh môn mở
        const openClassesMap = new Map();
        this.openCourses.forEach(c => openClassesMap.set(c.id, c));

        // --- BƯỚC 1: MÔN RỚT (RETAKE) ---
        failed.forEach(cid => {
            const target = graph.findBlockingPrereq(cid, passed);
            // Chỉ gợi ý nếu chưa pass và không đang học
            if (target && !passed.has(target) && !studying.has(target)) {
                this.addRec(target, 'RETAKE');
            }
        });

        // --- BƯỚC 2: MÔN BẮT BUỘC (MANDATORY) ---
        this.allCoursesMeta.forEach(c => {
            const cid = c.course_id;
            // Type 'BB' là bắt buộc
            if (c.course_type === 'BB' && !passed.has(cid) && !studying.has(cid)) {
                const target = graph.findBlockingPrereq(cid, passed);
                if (target && !passed.has(target) && !studying.has(target)) {
                    this.addRec(target, 'MANDATORY');
                }
            }
        });

        // --- BƯỚC 3: NHÓM NGÀNH (ELECTIVE_REQUIRED) ---
        if (this.categories) {
            this.traverseCategories(this.categories, passed, passedCreditsMap, studying, graph);
        }

        // --- BƯỚC 4: MÔN BỔ TRỢ (SUGGESTED - Soft Constraints) ---
        // Chỉ xét những môn đã nằm trong danh sách gợi ý, xem nó có môn bổ trợ nào không
        const currentIds = Array.from(this.recommendationsMap.keys());
        currentIds.forEach(cid => {
            const softReqs = graph.softConstraints[cid] || [];
            softReqs.forEach(p => {
                if (!passed.has(p) && !this.recommendationsMap.has(p) && !studying.has(p)) {
                    const validP = graph.findBlockingPrereq(p, passed);
                    // Nếu môn bổ trợ đó học được ngay (ko bị chặn)
                    if (validP === p) {
                        this.addRec(p, 'SUGGESTED');
                    }
                }
            });
        });

        // --- BƯỚC 5: KHỚP VỚI LỚP MỞ (OUTPUT) ---
        const finalOutput = [];
        this.recommendationsMap.forEach((statusCode, cid) => {
            if (openClassesMap.has(cid)) {
                const courseData = openClassesMap.get(cid);
                // Trả về object môn học kèm status mới
                finalOutput.push({
                    ...courseData,
                    recommendationStatus: statusCode // Thêm thuộc tính này để UI vẽ màu
                });
            }
        });

        console.log(`✅ Recommender: Gợi ý được ${finalOutput.length} môn.`);
        return finalOutput;
    }
}