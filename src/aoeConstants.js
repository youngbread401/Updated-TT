export const AOE_TYPES = {
  CIRCLE: 'CIRCLE',
  CONE: 'CONE',
  CUBE: 'CUBE',
  LINE: 'LINE',
  SPHERE: 'SPHERE'
};

export const AOE_SIZES = {
  [AOE_TYPES.CIRCLE]: [5, 10, 15, 20, 30, 40],
  [AOE_TYPES.CONE]: [15, 30, 60],
  [AOE_TYPES.CUBE]: [5, 10, 15, 20, 30],
  [AOE_TYPES.LINE]: [5, 10, 20, 30, 60, 120],
  [AOE_TYPES.SPHERE]: [5, 10, 15, 20, 30, 40]
};

const calculateDistance = (pos1, pos2) => {
  const [row1, col1] = pos1.split('-').map(Number);
  const [row2, col2] = pos2.split('-').map(Number);
  return Math.sqrt(Math.pow(row2 - row1, 2) + Math.pow(col2 - col1, 2)) * 5;
};

export const calculateAffectedCells = (centerPosition, type, size) => {
  const [centerRow, centerCol] = centerPosition.split('-').map(Number);
  const affectedCells = [];
  const gridSize = 10; // Assuming 10x10 grid

  // Convert size from feet to grid squares (5ft per square)
  const squares = Math.ceil(size / 5);

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const position = `${row}-${col}`;
      const distance = calculateDistance(centerPosition, position);

      switch (type) {
        case AOE_TYPES.CIRCLE:
        case AOE_TYPES.SPHERE:
          if (distance <= size) {
            affectedCells.push(position);
          }
          break;

        case AOE_TYPES.CONE:
          // Simplified cone calculation
          const angle = Math.atan2(row - centerRow, col - centerCol) * 180 / Math.PI;
          if (distance <= size && Math.abs(angle) <= 45) {
            affectedCells.push(position);
          }
          break;

        case AOE_TYPES.CUBE:
          if (Math.abs(row - centerRow) <= squares && Math.abs(col - centerCol) <= squares) {
            affectedCells.push(position);
          }
          break;

        case AOE_TYPES.LINE:
          // Simplified line calculation (horizontal only)
          if (row === centerRow && Math.abs(col - centerCol) <= squares) {
            affectedCells.push(position);
          }
          break;
      }
    }
  }

  return affectedCells;
}; 