// Hàm tải dữ liệu JSON
export async function loadCourseData() {
    try {
        const response = await fetch('./js/tkb/course_db.json'); 
        if (!response.ok) throw new Error("Không tải được file dữ liệu môn học!");
        return await response.json();
    } catch (error) {
        alert("Lỗi: " + error.message);
        return null;
    }
}

// Hàm giải mã Bitmask (4 số nguyên) -> Mảng {day, period}
export function decodeScheduleMask(parts) {
    let slots = [];
    for (let i = 0; i < 4 && i < parts.length; i++) {
        let part = parts[i];
        for (let bit = 0; bit < 32; bit++) {
            if ((part & (1 << bit)) !== 0) {
                let totalBit = i * 32 + bit;
                let day = Math.floor(totalBit / 10); // 0=T2, 1=T3...
                let period = totalBit % 10;          // 0=Tiết 1...
                
                if (day < 7) { 
                    slots.push({ day: day, period: period });
                }
            }
        }
    }
    return slots;
}