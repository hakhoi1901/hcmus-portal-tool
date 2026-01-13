import { Bitset } from './Bitset.js'; 
import { WEIGHTS } from './Constants.js';

export class FitnessEvaluator { 
    constructor(preferences) {
        this.prefs = { ...preferences };
        // Chuẩn hóa daysOff thành số nguyên
        if (this.prefs.daysOff && Array.isArray(this.prefs.daysOff)) {
            this.prefs.daysOff = this.prefs.daysOff.map(d => parseInt(d));
        } else {
            this.prefs.daysOff = [];
        }
        // console.log("🔍 [Fitness] Config:", this.prefs);
    }

    getFitness(chromosome, subjects) {
        chromosome.combinedMask = new Bitset(); 
        let score = WEIGHTS.BASE; 
        let conflictCount = 0;

        const genes = chromosome.genes;

        // --- 1. HARD CONSTRAINT (Check trùng & Xây dựng Mask tổng) ---
        for (let i = 0; i < genes.length; i++) {
            const classIdx = genes[i];
            if (classIdx === -1) continue;

            const currentMask = subjects[i].classes[classIdx].scheduleMask; 
            
            if (currentMask) {
                if (chromosome.combinedMask.anyCommon(currentMask)) {
                    conflictCount++;
                }
                chromosome.combinedMask = chromosome.combinedMask.or(currentMask);
            }
        }

        if (conflictCount > 0) {
            chromosome.fitness = -1 * conflictCount * WEIGHTS.PENALTY_HARD;
            return chromosome.fitness;
        }

        // --- 2. SOFT CONSTRAINTS ---

        // A. Ngày nghỉ (Days Off) - DÙNG MASK ĐỂ CHECK
        if (this.prefs.daysOff.length > 0) {
            genes.forEach((classIdx, idx) => {
                if (classIdx === -1) return;

                // Lấy Mask của lớp hiện tại
                const currentMask = subjects[idx].classes[classIdx].scheduleMask;
                
                if (currentMask) {
                    // Duyệt qua các ngày bị cấm (trong setting)
                    this.prefs.daysOff.forEach(dayForbidden => {
                        // Kiểm tra xem trong ngày cấm đó, có tiết nào sáng đèn không?
                        // Thứ 2 (index 0) chiếm bit 0-9
                        // Thứ 7 (index 5) chiếm bit 50-59
                        const startBit = dayForbidden * 10;
                        const endBit = startBit + 9;
                        
                        let hasClassOnForbiddenDay = false;
                        
                        // Quét 10 tiết của ngày đó
                        for (let k = startBit; k <= endBit; k++) {
                            if (currentMask.test(k)) {
                                hasClassOnForbiddenDay = true;
                                break; // Dính 1 tiết là coi như đi học ngày đó rồi
                            }
                        }

                        if (hasClassOnForbiddenDay) {
                            score -= WEIGHTS.PENALTY_DAY_OFF;
                            // console.log(`❌ PHẠT: Môn ${subjects[idx].id} dính ngày nghỉ (Thứ ${dayForbidden + 2})`);
                        }
                    });
                }
            });
        }

        // B. Buổi ưu tiên (Session) - CŨNG DÙNG MASK
        if (this.prefs.session && this.prefs.session !== '0') {
            const targetSession = parseInt(this.prefs.session); // 1=Sáng, 2=Chiều
            
            genes.forEach((classIdx, idx) => {
                if (classIdx === -1) return;
                const currentMask = subjects[idx].classes[classIdx].scheduleMask;
                
                if(currentMask) {
                    const session = this.getSessionFromMask(currentMask);
                    if (session === targetSession) score += WEIGHTS.BONUS_SESSION;
                    else if (session !== 3 && session !== 0) score -= WEIGHTS.PENALTY_WRONG_SESSION;
                }
            });
        }

        // C. Chiến thuật & Gaps (Dùng Mask tổng)
        const dailyLoad = this.calculateDailyLoad(chromosome.combinedMask);
        const daysWithClasses = dailyLoad.filter(count => count > 0).length;

        if (this.prefs.strategy === 'compress') {
            // Thưởng cho số ngày nghỉ trọn vẹn (7 - số ngày đi học)
            score += (7 - daysWithClasses) * WEIGHTS.BONUS_COMPRESS; 
        } else if (this.prefs.strategy === 'spread') {
            const heavyDays = dailyLoad.filter(count => count > 8).length;
            score -= heavyDays * WEIGHTS.PENALTY_SPREAD;
        }

        if (this.prefs.noGaps) {
            const gaps = this.calculateGaps(chromosome.combinedMask);
            score -= gaps * WEIGHTS.PENALTY_GAP;
        }

        chromosome.fitness = score;
        return score;
    }

    // --- HELPER MỚI (DÙNG MASK) ---

    // Xác định buổi học dựa trên bitmask
    // 1: Sáng (tiết 0-4 của mỗi ngày), 2: Chiều (tiết 5-9), 3: Cả hai
    getSessionFromMask(mask) {
        let hasMorning = false;
        let hasAfternoon = false;

        for (let d = 0; d < 7; d++) {
            // Check sáng (Tiết 1-5 -> index 0-4 trong 10 bit ngày)
            for (let p = 0; p < 5; p++) {
                if (mask.test(d * 10 + p)) hasMorning = true;
            }
            // Check chiều (Tiết 6-10 -> index 5-9)
            for (let p = 5; p < 10; p++) {
                if (mask.test(d * 10 + p)) hasAfternoon = true;
            }
        }

        if (hasMorning && hasAfternoon) return 3;
        if (hasMorning) return 1;
        if (hasAfternoon) return 2;
        return 0;
    }

    calculateDailyLoad(combinedMask) {
        const load = new Array(7).fill(0);
        for (let d = 0; d < 7; d++) {
            for (let p = 0; p < 10; p++) {
                if (combinedMask.test(d * 10 + p)) {
                    load[d]++;
                }
            }
        }
        return load;
    }

    calculateGaps(combinedMask) {
        let gaps = 0;
        for (let d = 0; d < 7; d++) {
            let first = -1;
            let last = -1;
            let count = 0;
            
            for (let p = 0; p < 10; p++) {
                if (combinedMask.test(d * 10 + p)) {
                    if (first === -1) first = p;
                    last = p;
                    count++;
                }
            }

            if (first !== -1 && last !== -1) {
                const span = last - first + 1;
                gaps += (span - count);
            }
        }
        return gaps;
    }
}