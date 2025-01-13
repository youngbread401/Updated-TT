export const AOE_TYPES = {
  CIRCLE: 'CIRCLE',
  CONE: 'CONE',
  CUBE: 'CUBE',
  LINE: 'LINE',
  SPHERE: 'SPHERE'
};

export const AOE_SIZES = {
  [AOE_TYPES.CIRCLE]: [5, 10, 15, 20, 30],
  [AOE_TYPES.CONE]: [15, 30, 60],
  [AOE_TYPES.CUBE]: [5, 10, 15, 20],
  [AOE_TYPES.LINE]: [5, 10, 20, 30, 60, 120],
  [AOE_TYPES.SPHERE]: [5, 10, 15, 20, 30]
};

export const calculateAffectedCells = (centerPosition, type, size) => {
  const [centerRow, centerCol] = centerPosition.split('-').map(Number);
  const affectedCells = [];
  const gridSize = 10; // Assuming 10x10 grid

  // Convert feet to grid squares (5ft per square)
  const squares = Math.ceil(size / 5);

  switch (type) {
    case AOE_TYPES.CIRCLE:
    case AOE_TYPES.SPHERE:
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const distance = Math.sqrt(
            Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2)
          );
          if (distance <= squares) {
            affectedCells.push(`${row}-${col}`);
          }
        }
      }
      break;

    case AOE_TYPES.CONE:
      // Simplified cone calculation
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const distance = Math.sqrt(
            Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2)
          );
          if (distance <= squares / 2) {
            affectedCells.push(`${row}-${col}`);
          }
        }
      }
      break;

    case AOE_TYPES.CUBE:
      const halfSquares = Math.floor(squares / 2);
      for (let row = centerRow - halfSquares; row <= centerRow + halfSquares; row++) {
        for (let col = centerCol - halfSquares; col <= centerCol + halfSquares; col++) {
          if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
            affectedCells.push(`${row}-${col}`);
          }
        }
      }
      break;

    case AOE_TYPES.LINE:
      // Simplified line calculation - horizontal only
      for (let col = centerCol; col < Math.min(centerCol + squares, gridSize); col++) {
        affectedCells.push(`${centerRow}-${col}`);
      }
      break;
  }

  return affectedCells;
}; 