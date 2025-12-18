// gestures.js

// 각 손가락 끝의 랜드마크 인덱스
const Finger_TIPS = [8, 12, 16, 20];

/**
 * 랜드마크 데이터를 기반으로 커스텀 제스처를 분류합니다.
 * @param {Array} landmarks - 21개의 손 랜드마크 배열
 * @returns {string|null} - 감지된 커스텀 제스처의 이름 또는 null
 */
export function classifyCustomGesture(landmarks) {
    if (!landmarks) return null;

    // --- 손가락 펴짐 상태 감지 ---
    // 각 손가락이 펴져있는지 여부를 확인합니다.
    // 손가락 끝(tip)의 y 좌표가 중간 관절(pip)의 y 좌표보다 작으면 펴진 것으로 간주합니다. (화면 위쪽이 y=0)
    let fingersExtended = [];
    // Index, Middle, Ring, Pinky 순서
    for (let i = 0; i < 4; i++) {
        const tip = landmarks[Finger_TIPS[i]];
        const pip = landmarks[Finger_TIPS[i] - 2];
        fingersExtended.push(tip.y < pip.y);
    }
    
    // 엄지손가락은 방향이 다르므로 x좌표를 기준으로 별도 계산합니다. (오른손 기준)
    // 왼손/오른손을 구분하지 않기 위해, 엄지 끝과 검지 뿌리 부분의 거리를 이용하는 것이 더 안정적일 수 있습니다.
    // 여기서는 간단하게 구현하기 위해 엄지 펴짐 여부는 숫자 판별에만 간접적으로 사용합니다.
    const thumbTip = landmarks[4];
    const indexMcp = landmarks[5]; // 검지손가락 뿌리 관절
    const isThumbCloseToIndex = Math.hypot(thumbTip.x - indexMcp.x, thumbTip.y - indexMcp.y) < 0.1;


    // --- OK 사인 판별 로직 ---
    // 엄지 끝(4)과 검지 끝(8) 사이의 거리를 계산합니다.
    const indexTip = landmarks[8];
    const thumbIndexDist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);

    // 엄지와 검지가 거의 닿아있고, 나머지 세 손가락(중지, 약지, 소지)이 펴져있으면 'OK 사인'으로 판단합니다.
    const touchThreshold = 0.05; // 닿았다고 판단하는 거리 임계값 (튜닝 필요)
    if (thumbIndexDist < touchThreshold && fingersExtended[1] && fingersExtended[2] && fingersExtended[3]) {
        return 'ok_sign';
    }

    // --- 숫자 판별 로직 ---
    // 엄지가 구부러져 있거나 검지 쪽에 붙어있을 때만 숫자 인식을 시도합니다.
    if (isThumbCloseToIndex) {
        const extendedCount = fingersExtended.filter(Boolean).length;
        
        if (extendedCount === 4) return 'number_4';
        if (extendedCount === 3 && fingersExtended[0] && fingersExtended[1] && fingersExtended[2]) return 'number_3';
        if (extendedCount === 2 && fingersExtended[0] && fingersExtended[1]) return 'number_2';
        if (extendedCount === 1 && fingersExtended[0]) return 'number_1';
    }

    // 위에 해당하는 제스처가 없으면 null을 반환합니다.
    return null;
}
