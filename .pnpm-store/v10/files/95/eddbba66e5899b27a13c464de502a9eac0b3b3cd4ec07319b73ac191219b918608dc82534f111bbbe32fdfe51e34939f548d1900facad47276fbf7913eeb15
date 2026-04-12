import { Arrangement } from '../../types/position.js';
import { getString, getNumber, getValue } from '../../utils/data.js';

const getIconBleed = (datum, idx, icon, iconSize, iconArrangement, rowHeight) => {
    const iconValue = getString(datum, icon, idx);
    if (!iconValue)
        return 0;
    const size = getNumber(datum, iconSize, idx) || rowHeight / 2;
    const arrangement = getValue(datum, iconArrangement, idx);
    return (arrangement === Arrangement.Outside) ? size
        : (arrangement === Arrangement.Center) ? size / 2
            : 0;
};

export { getIconBleed };
//# sourceMappingURL=utils.js.map
