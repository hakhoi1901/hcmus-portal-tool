import { Bitset } from './Bitset.js';
import { WEIGHTS } from './Constants.js';

export class FitnessEvaluator {
    static evaluate(chromo, subjects, sessionPref) {
        chromo.combinedMask = new Bitset();
        let score = WEIGHTS.BASE;
        let conflictCount = 0;

        // 1. Dựng lịch tổng & Check Hard Constraint (Trùng lịch)
        for (let i = 0; i < chromo.genes.length; i++) {
            const classIdx = chromo.genes[i];
            if (classIdx === -1) continue;

            const currentMask = subjects[i].classes[classIdx].scheduleMask;
            
            // Kiểm tra trùng bit
            if (chromo.combinedMask.anyCommon(currentMask)) {
                conflictCount++;
            }
            // Gộp lịch vào mask tổng
            chromo.combinedMask = chromo.combinedMask.or(currentMask);
        }

        // Nếu trùng lịch -> Phạt nặng và return luôn
        if (conflictCount > 0) {
            chromo.fitness = -1.0 * conflictCount * WEIGHTS.PENALTY_HARD;
            return;
        }

        // 2. Duyệt từng ngày (Gap & Buổi học)
        const hasClassOnDay = new Array(7).fill(false);
        const TOTAL_BITS = 128;

        for (let day = 0; day < 7; day++) {
            let activePeriods = [];
            
            for (let period = 0; period < 10; period++) {
                const bitIndex = day * 10 + period;
                if (bitIndex < TOTAL_BITS && chromo.combinedMask.test(bitIndex)) {
                    hasClassOnDay[day] = true;
                    activePeriods.push(period);

                    // Check ưu tiên buổi
                    if (sessionPref === 1 && period >= 5) score -= WEIGHTS.PENALTY_WRONG_SESSION; // Thích Sáng
                    else if (sessionPref === 2 && period < 5) score -= WEIGHTS.PENALTY_WRONG_SESSION; // Thích Chiều
                }
            }

            // Check Gap (Lỗ hổng thời gian)
            if (activePeriods.length >= 2) {
                for (let k = 0; k < activePeriods.length - 1; k++) {
                    const gap = activePeriods[k+1] - activePeriods[k] - 1;
                    if (gap >= 2) score -= (gap * WEIGHTS.PENALTY_GAP);
                }
            }
        }

        // 3. Duyệt tuần (Phân bố ngày học)
        let currentStreak = 0;
        for (let day = 0; day < 7; day++) {
            if (hasClassOnDay[day]) {
                currentStreak++;
            } else {
                if (currentStreak === 2) score += WEIGHTS.BONUS_STREAK_2;
                if (currentStreak >= 3) score -= (currentStreak - 2) * WEIGHTS.PENALTY_BURNOUT;
                currentStreak = 0;
                score += WEIGHTS.BONUS_DAY_OFF; // Thưởng ngày nghỉ trọn vẹn
            }
        }
        // Check ngày cuối tuần
        if (currentStreak === 2) score += WEIGHTS.BONUS_STREAK_2;
        if (currentStreak >= 3) score -= (currentStreak - 2) * WEIGHTS.PENALTY_BURNOUT;

        chromo.fitness = score;
    }
}