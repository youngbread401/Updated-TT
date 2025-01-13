export const AOE_TYPES = {
  CIRCLE: 'Circle',
  CONE: 'Cone',
  CUBE: 'Cube',
  LINE: 'Line',
  SPHERE: 'Sphere'
};

export const AOE_SIZES = {
  Circle: [5, 10, 15, 20, 30],
  Cone: [15, 30, 60],
  Cube: [5, 10, 15, 20],
  Line: [20, 30, 60, 100, 120],
  Sphere: [5, 10, 15, 20, 30]
};

export const calculateAffectedCells = (centerPosition, type, size, gridSize = 20) => {
  const [centerRow, centerCol] = centerPosition.split('-').map(Number);
  const affectedCells = [];
  const cellSize = 5; // Each cell represents 5 feet
  const radius = size / cellSize;

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const distance = Math.sqrt(
        Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2)
      );

      switch (type) {
        case 'Circle':
        case 'Sphere':
          if (distance <= radius) {
            affectedCells.push(`${row}-${col}`);
          }
          break;

        case 'Cone':
          const angle = Math.atan2(col - centerCol, row - centerRow) * (180 / Math.PI);
          const coneAngle = 90; // 90-degree cone
          if (distance <= radius && Math.abs(angle) <= coneAngle / 2) {
            affectedCells.push(`${row}-${col}`);
          }
          break;

        case 'Cube':
          const halfSize = radius / 2;
          if (
            Math.abs(row - centerRow) <= halfSize &&
            Math.abs(col - centerCol) <= halfSize
          ) {
            affectedCells.push(`${row}-${col}`);
          }
          break;

        case 'Line':
          // Simplified line calculation - straight line from center
          if (row === centerRow && Math.abs(col - centerCol) <= radius) {
            affectedCells.push(`${row}-${col}`);
          }
          break;
      }
    }
  }

  return affectedCells;
}; 