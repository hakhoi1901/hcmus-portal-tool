const fs = require('fs');
const path = require('path');

// ==========================================
// 1. DATA LOADER
// ==========================================
class DataLoader {
    constructor(dataDir = '.') {
        this.dataDir = dataDir;
    }

    loadJson(filename) {
        const filePath = path.join(this.dataDir, filename);
        if (!fs.existsSync(filePath)) return filename === 'courses.json' ? [] : {};
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }

    getStudentStatus(localData) {
        const passed = new Set();
        const studying = new Set();
        const failed = new Set();
        const passedCreditsMap = new Map();

        const grades = localData?.student_db_full?.grades || [];

        grades.forEach(g => {
            const cid = g.id;
            let scoreRaw = g.score;
            const credits = parseInt(g.credits) || 0;

            if (scoreRaw === "" || scoreRaw === "(*)" || scoreRaw == null) {
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
                studying.add(cid);
            }
        });

        return { passed, failed, studying, passedCreditsMap };
    }
}

// ==========================================
// 2. GRAPH ENGINE
// ==========================================
class PrerequisiteGraph {
    constructor(prereqData) {
        this.hardConstraints = {};
        this.softConstraints = {};
        this.buildGraph(prereqData);
    }

    buildGraph(data) {
        if (!Array.isArray(data)) return;
        data.forEach(item => {
            const cId = item.course_id;
            const pIds = item.prereq_id.replace(/,/g, ' ').split(/\s+/).filter(x => x.length > 0);

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

    findBlockingPrereq(courseId, passedCourses) {
        if (passedCourses.has(courseId)) return null;
        const reqs = this.hardConstraints[courseId] || [];
        for (const req of reqs) {
            if (!passedCourses.has(req)) {
                return this.findBlockingPrereq(req, passedCourses) || req;
            }
        }
        return courseId;
    }
}

// ==========================================
// 3. RECOMMENDER CORE
// ==========================================
class CourseRecommender {
    constructor() {
        this.loader = new DataLoader();
        // Map lưu kết quả: Key = CourseID, Value = status_code (String)
        this.recommendationsMap = new Map();
    }

    addRec(id, status) {
        const priorities = {
            'RETAKE': 4,
            'MANDATORY': 3,
            'ELECTIVE_REQUIRED': 2,
            'SUGGESTED': 1
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

    checkGroupRequirement(requiredCredits, courseList, passed, passedCreditsMap, studying, graph, coursesMetaMap) {
        let currentCredits = 0;
        courseList.forEach(cid => {
            if (passed.has(cid)) {
                const cr = passedCreditsMap.get(cid) || coursesMetaMap.get(cid)?.credits || 0;
                currentCredits += cr;
            }
        });

        if (currentCredits < requiredCredits) {
            courseList.forEach(cid => {
                if (!passed.has(cid) && !studying.has(cid)) {
                    const target = graph.findBlockingPrereq(cid, passed);
                    if (target && !passed.has(target) && !studying.has(target)) {
                        this.addRec(target, 'ELECTIVE_REQUIRED');
                    }
                }
            });
        }
    }

    run() {
        console.log("⏳ Đang xử lý dữ liệu...");

        const coursesMeta = this.loader.loadJson('courses.json');
        const categories = this.loader.loadJson('categories.json');
        const prereqs = this.loader.loadJson('prerequisites.json');
        const localData = this.loader.loadJson('localstorage.json');
        const openClassesRaw = localData.courses_db_offline || [];

        const coursesMetaMap = new Map();
        coursesMeta.forEach(c => coursesMetaMap.set(c.course_id, c));

        const openClassesMap = new Map();
        openClassesRaw.forEach(c => openClassesMap.set(c.id, c));

        const { passed, failed, studying, passedCreditsMap } = this.loader.getStudentStatus(localData);
        const graph = new PrerequisiteGraph(prereqs);

        // 1. MÔN RỚT (RETAKE)
        failed.forEach(cid => {
            const target = graph.findBlockingPrereq(cid, passed);
            if (target && !studying.has(target)) {
                this.addRec(target, 'RETAKE');
            }
        });

        // 2. MÔN BẮT BUỘC (MANDATORY)
        coursesMeta.forEach(c => {
            const cid = c.course_id;
            if (c.course_type === 'BB' && !passed.has(cid) && !studying.has(cid)) {
                const target = graph.findBlockingPrereq(cid, passed);
                if (target && !passed.has(target) && !studying.has(target)) {
                    this.addRec(target, 'MANDATORY');
                }
            }
        });

        // 3. NHÓM NGÀNH (ELECTIVE_REQUIRED)
        const traverseCategories = (obj) => {
            if (obj.sub_groups) {
                obj.sub_groups.forEach(sub => {
                    this.checkGroupRequirement(
                        sub.credits_required, sub.courses,
                        passed, passedCreditsMap, studying, graph, coursesMetaMap
                    );
                });
            } else if (obj.courses && obj.credits_required) {
                this.checkGroupRequirement(
                    obj.credits_required, obj.courses,
                    passed, passedCreditsMap, studying, graph, coursesMetaMap
                );
            } else {
                for (const key in obj) {
                    if (typeof obj[key] === 'object' && obj[key] !== null) {
                        traverseCategories(obj[key]);
                    }
                }
            }
        };
        traverseCategories(categories);

        // 4. MÔN BỔ TRỢ (SUGGESTED)
        const currentIds = Array.from(this.recommendationsMap.keys());
        currentIds.forEach(cid => {
            const softReqs = graph.softConstraints[cid] || [];
            softReqs.forEach(p => {
                if (!passed.has(p) && !this.recommendationsMap.has(p) && !studying.has(p)) {
                    const validP = graph.findBlockingPrereq(p, passed);
                    if (validP === p) {
                        this.addRec(p, 'SUGGESTED');
                    }
                }
            });
        });

        // 5. OUTPUT
        console.log("🔍 Khớp lịch mở lớp...");
        const finalOutput = [];

        // Sort theo độ ưu tiên: RETAKE > MANDATORY > ELECTIVE > SUGGESTED
        const sortedRecs = Array.from(this.recommendationsMap.entries()).sort((a, b) => {
            const priority = { 'RETAKE': 4, 'MANDATORY': 3, 'ELECTIVE_REQUIRED': 2, 'SUGGESTED': 1 };
            return priority[b[1]] - priority[a[1]];
        });

        sortedRecs.forEach(([cid, statusCode]) => {
            if (openClassesMap.has(cid)) {
                const classData = openClassesMap.get(cid);
                finalOutput.push({
                    ...classData,
                    status_code: statusCode // Chỉ giữ lại mã status
                });
            }
        });

        return finalOutput;
    }
}

// CHẠY
try {
    const app = new CourseRecommender();
    const result = app.run();
    const outputFilename = 'recommendation_result.json';
    fs.writeFileSync(outputFilename, JSON.stringify(result, null, 4), 'utf-8');

    console.log('\n✅ XONG! Tìm thấy ${result.length} môn.');
    console.log('👉 Kết quả: ${outputFilename}');

    // Preview 1 dòng
    if (result.length > 0) {
        console.log("Ví dụ kết quả:");
        console.log(JSON.stringify(result[0], null, 2));
    }

} catch (e) {
    console.error(e);
}