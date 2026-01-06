import { Bitset } from './Bitset.js';

export class CourseDatabase {
    constructor() {
        this.subjects = [];
    }

    // Hàm chuyển đổi data từ Web (Danh sách lớp mở) sang format của Engine
    // HIỆN TẠI ĐỂ TRỐNG LOGIC THEO YÊU CẦU
    convertRawDataToEngineFormat(rawData) {
        /* TODO: Viết logic mapping ở đây sau khi có cấu trúc file raw.
           Output mong đợi là array giống structure bên dưới.
        */
        return []; 
    }

    // Load data đã chuẩn hóa (như file course_db.json bạn gửi)
    loadFromEngineFormat(jsonData) {
        this.subjects = jsonData.map(subj => {
            return {
                id: subj.id,
                name: subj.name,
                classes: subj.classes.map(cls => {
                    const mask = new Bitset();
                    mask.loadFromData(cls.mask);
                    return {
                        id: cls.id,
                        scheduleMask: mask // Lưu object Bitset để tính toán
                    };
                })
            };
        });
    }

    // Lọc ra các môn user muốn học
    filterSubjects(codes) {
        return this.subjects.filter(s => codes.includes(s.id));
    }
}
